import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from '@/lib/prisma';

// ============================================
// Domain Validation (Single Responsibility)
// ============================================

interface EmailDomainConfig {
  readonly allowed: readonly string[];
  readonly blocked: readonly string[];
}

const EMAIL_DOMAIN_CONFIG: EmailDomainConfig = {
  allowed: ['desasa.com.ar', 'edensa.com.ar', 'edessa.com.ar', 'edesa.com.ar'],
  blocked: ['mailinator.com', 'tempmail.com'],
} as const;

/**
 * Extracts the domain from an email address
 * @returns The domain in lowercase, or empty string if invalid
 */
const extractEmailDomain = (email?: string | null): string => {
  if (!email) return '';

  const parts = email.split('@');
  if (parts.length !== 2) return '';

  return parts[1].toLowerCase();
};

/**
 * Validates if a domain is in the blocked list
 */
const isBlockedDomain = (domain: string): boolean => {
  if (!domain) return false;
  return EMAIL_DOMAIN_CONFIG.blocked.includes(domain);
};

/**
 * Validates if a domain is in the allowed list (if list is configured)
 */
const isAllowedDomain = (domain: string): boolean => {
  if (!domain) return false;
  if (EMAIL_DOMAIN_CONFIG.allowed.length === 0) return true;
  return EMAIL_DOMAIN_CONFIG.allowed.includes(domain);
};

/**
 * Validates email domain against allow/block lists
 * @returns true if email is valid, false otherwise
 */
export const validateEmailDomain = (email?: string | null): boolean => {
  if (!email) return false;

  const domain = extractEmailDomain(email);
  if (!domain) return false;

  // Early return for blocked domains
  if (isBlockedDomain(domain)) return false;

  // Check if domain is allowed
  return isAllowedDomain(domain);
};

/**
 * Gets a human-readable error message for domain validation
 */
export const getDomainValidationError = (email?: string | null): string => {
  if (!email) return 'Email is required';

  const domain = extractEmailDomain(email);
  if (!domain) return 'Invalid email format';

  if (isBlockedDomain(domain)) {
    return `The domain "${domain}" is not allowed`;
  }

  if (!isAllowedDomain(domain)) {
    return `Only emails from authorized domains are allowed`;
  }

  return 'Invalid email domain';
};

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
  hooks: {
    // Commented hooks for domain validation
    // Uncomment when domain validation is required

    // before: createAuthMiddleware(async (ctx) => {
    //   if (ctx.path === "/sign-up/email" || ctx.path === "/sign-in/email") {
    //     const email = ctx.body?.email as string | undefined;
    //
    //     if (!validateEmailDomain(email)) {
    //       throw new APIError("BAD_REQUEST", {
    //         message: getDomainValidationError(email),
    //       });
    //     }
    //   }
    // }),

    // after: createAuthMiddleware(async (ctx) => {
    //   if (ctx.path.startsWith("/sign-in/social")) {
    //     const email = ctx.context.newSession?.user.email;
    //
    //     if (!validateEmailDomain(email)) {
    //       throw new APIError("UNAUTHORIZED", {
    //         message: getDomainValidationError(email)
    //       });
    //     }
    //   }
    // }),
  },
});
