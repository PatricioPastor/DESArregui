import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { admin } from 'better-auth/plugins';
import prisma from '@/lib/prisma';
import { getUserRole } from '@/utils/user-roles';

// Import email validation utilities (shared with client)
export { validateEmailDomain, getDomainValidationError } from '@/lib/email-validation';

// ============================================
// Auth Configuration (Open/Closed Principle)
// ============================================

interface SessionConfig {
  readonly expiresIn: number;
  readonly updateAge: number;
}

const SESSION_CONFIG: SessionConfig = {
  expiresIn: 60 * 60 * 24 * 7, // 7 days
  updateAge: 60 * 60 * 24, // 1 day
} as const;

interface SocialProviderConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly prompt?: "select_account" | "consent" | "login" | "none" | "select_account consent";
}

/**
 * Checks if Google OAuth credentials are configured
 */
const hasGoogleCredentials = (): boolean => {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
};

/**
 * Gets Google OAuth configuration if available
 * @returns Configuration object or undefined if not configured
 */
const getGoogleProviderConfig = (): SocialProviderConfig | undefined => {
  if (!hasGoogleCredentials()) {
    return undefined;
  }

  return {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    prompt: "select_account consent", 
  };
};

// ============================================
// Auth Instance (Dependency Inversion)
// ============================================

const googleConfig = getGoogleProviderConfig();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: googleConfig
    ? {
        google: googleConfig,
      }
    : {},
  session: SESSION_CONFIG,
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'viewer',
        input: false, // Users cannot set this during signup
      },
      isActive: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false, // Users cannot set this during signup
      },
    },
  },
  plugins: [
    admin(),
  ],
  hooks: {
    // Block inactive users from logging in
    before: createAuthMiddleware(async (ctx) => {
      // Check for sign-in attempts (both email and social)
      if (ctx.path.startsWith('/sign-in')) {
        const email = ctx.body?.email as string | undefined;

        if (email) {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email },
            select: { isActive: true },
          });

          if (user && !user.isActive) {
            throw new APIError('UNAUTHORIZED', {
              message: 'Your account is pending activation. Please contact an administrator.',
            });
          }
        }
      }
    }),

    // Assign role and mark new social sign-up users as inactive
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith('/sign-in/social')) {
        const newSession = ctx.context.newSession;

        // Check if this is a new user (first time signing in)
        if (newSession) {
          const userId = newSession.user.id;
          const userEmail = newSession.user.email;

          // Check if user was just created
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isActive: true, role: true, createdAt: true },
          });

          if (user) {
            // Auto-assign role based on email
            const correctRole = getUserRole(userEmail);

            // Update user with correct role if needed
            if (user.role !== correctRole) {
              await prisma.user.update({
                where: { id: userId },
                data: { role: correctRole },
              });
            }

            // If user is new and inactive, block access
            if (!user.isActive) {
              // Invalidate the session so they can't log in
              await prisma.session.delete({
                where: { id: newSession.session.id },
              });

              throw new APIError('UNAUTHORIZED', {
                message: 'Account created successfully but requires admin activation. Please contact an administrator.',
              });
            }
          }
        }
      }
    }),
  },
});
