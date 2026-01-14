import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import prisma from "@/lib/prisma";

export { getDomainValidationError, validateEmailDomain } from "@/lib/email-validation";

interface SessionConfig {
    readonly expiresIn: number;
    readonly updateAge: number;
}

const SESSION_CONFIG: SessionConfig = {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
} as const;

interface SocialProviderConfig {
    readonly clientId: string;
    readonly clientSecret: string;
    readonly prompt?: "select_account" | "consent" | "login" | "none" | "select_account consent";
}

const hasGoogleCredentials = (): boolean => {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
};

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

const googleConfig = getGoogleProviderConfig();

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
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
                type: "string",
                required: false,
                defaultValue: "user",
                input: false,
            },
            isActive: {
                type: "boolean",
                required: false,
                defaultValue: false,
                input: false,
            },
        },
    },
    plugins: [admin()],
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            // Email/password sign-in attempts
            if (!ctx.path.startsWith("/sign-in")) {
                return;
            }

            const email = ctx.body?.email as string | undefined;

            if (!email) {
                return;
            }

            const user = await prisma.user.findUnique({
                where: { email },
                select: { isActive: true },
            });

            if (user && !user.isActive) {
                throw new APIError("UNAUTHORIZED", {
                    message: "Your account is pending activation. Please contact an administrator.",
                });
            }
        }),

        after: createAuthMiddleware(async (ctx) => {
            // Social sign-in attempts
            if (!ctx.path.startsWith("/sign-in/social")) {
                return;
            }

            const newSession = ctx.context.newSession;

            if (!newSession) {
                return;
            }

            const user = await prisma.user.findUnique({
                where: { id: newSession.user.id },
                select: { isActive: true },
            });

            if (user && !user.isActive) {
                await prisma.session.delete({
                    where: { id: newSession.session.id },
                });

                throw new APIError("UNAUTHORIZED", {
                    message: "Account created successfully but requires admin activation. Please contact an administrator.",
                });
            }
        }),
    },
});
