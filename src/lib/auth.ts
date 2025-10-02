import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { createAuthMiddleware, APIError } from "better-auth/api";
import prisma from '@/lib/prisma'

const ALLOW = ["desasa.com.ar", "edensa.com.ar", "edessa.com.ar", "edesa.com.ar"];                  // dominios permitidos (opcional)
const BLOCK = ["mailinator.com", "tempmail.com"]; // dominios bloqueados

const domainOf = (email?: string) =>
  email?.split("@").pop()?.toLowerCase() ?? "";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  
   hooks: {
    // Email/password: validamos antes de ejecutar el endpoint
    // before: createAuthMiddleware(async (ctx) => {
    //   if (ctx.path === "/sign-up/email" || ctx.path === "/sign-in/email") {
    //     const email = ctx.body?.email as string | undefined;
    //     const d = domainOf(email);
    //     const deny =
    //       !email ||
    //       BLOCK.includes(d) ||
    //       (ALLOW.length > 0 && !ALLOW.includes(d));
    //     if (deny) {
    //       throw new APIError("BAD_REQUEST", {
    //         message: "El dominio de tu email no está permitido.",
    //       });
    //     }
    //   }
    // }),

    // OAuth/social: el email llega después del provider → validamos en "after"
    // after: createAuthMiddleware(async (ctx) => {
    //   if (ctx.path.startsWith("/sign-in/social")) {
    //     const email = ctx.context.newSession?.user.email;
    //     const d = domainOf(email);

        
        

    //     const deny = !email || BLOCK.includes(d) || (ALLOW.length > 0 && !ALLOW.includes(d));
    //     if (deny) {
          
    //       throw new APIError("UNAUTHORIZED", { message: "Dominio no permitido. " + email });
    //     }
    //   }
    // }),
  },
})