"use client";

import Image from "next/image";

import { useRouter } from "next/navigation";




import { SocialButton } from "@/components/base/buttons/social-button";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";




export default function AuthSplitQuote() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: handle auth here
  }

  const googleLogin = async () => {

    setLoading(true)

    const data = await signIn.social({
      provider: "google",
      fetchOptions:{
        onSuccess: () => {
          setLoading(false)
        },
        onError: (ctx) => {
          setError(ctx.error.message)
          setLoading(false)
        }
      }
    });
  };

 return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
      {/* Left: CTA and Google button */}
      <div className="relative flex min-h-[560px] flex-col justify-center p-8 md:p-12">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center">
            <Image
              src="/logo.png"
              alt="Exargelis Logo"
              width={160}
              height={120}
              className="w-32 mx-auto mb-8"
            />
            <h1 className="text-2xl font-semibold text-primary md:text-3xl">Bienvenido!</h1>
            <p className="mt-2 text-sm text-tertiary">
              Iniciá sesión con tu cuenta coorporativa a DESA-Hub
            </p>
          </div>

          <div className="mt-8">
            <SocialButton
              type="button"
              size="xl"
              social="google"
              className="w-full"
              disabled={loading}
              onClick={googleLogin}
            >
              Continuá con Google
            </SocialButton>

            {error && (
              <p className="mt-4 text-center text-sm text-error-600">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: Background image */}
      <div
        className="relative hidden min-h-[560px] md:block bg-cover bg-center"
        style={{ backgroundImage: 'url(/bg-login.jpg)' }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute bottom-8 right-8">
          <Image
            src="/logo.png"
            alt="Logo"
            width={160}
            height={120}
            className=" opacity-50"
          />
        </div>
      </div>
    </div>
  );
}
