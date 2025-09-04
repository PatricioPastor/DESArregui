"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { GoogleLogo } from "@/components/base/buttons/social-logos";
import { Checkbox } from "@/components/base/checkbox/checkbox";

import { SocialButton } from "@/components/base/buttons/social-button";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";



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
    
        
        <section className="flex min-h-screen bg-primary items-center px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: testimonial / quote */}
          <aside className="relative hidden min-h-[560px] flex-col justify-between p-8 md:flex md:p-12">
            <div className="absolute left-12 top-12 flex items-center gap-3 text-white/80">
              <Image alt="Logo" src="desarregui.svg" width={160} height={120} />
            </div>

            <div className="mt-16 flex flex-1 flex-col items-start justify-center">
              <blockquote className="max-w-xl text-balance text-2xl font-semibold leading-snug text-primary md:text-3xl">
                {"Amo esta aplicación! Es lo mejor que me pasó en la vida"}
              </blockquote>

              <div className="mt-8 flex items-center gap-4">
                
                  <AvatarLabelGroup
                    src="/tomi.jpeg"
                    alt="Avatar"
                    size="lg"
                    subtitle={"Lider del sindicato"}
                    title={"Tomás Arregui"}
                  />
              </div>
                
            </div>

            <footer className="mt-8 text-xs text-white/40">© BIOS Inc. 2077</footer>
          </aside>

          {/* Right: form */}
          <div className="relative flex min-h-[560px] flex-col justify-center p-8 md:p-12">
            <div className="mx-auto w-full max-w-md">
              <h1 className="text-2xl font-semibold text-primary md:text-3xl">Bienvenido! </h1>
              {/* <p className="mt-2 text-sm text-white/60">
                Bienvenido!
              </p> */}

              <form onSubmit={onSubmit} className="mt-8 space-y-6">
                <Input id="email"
                label="Correo electrónico"
                size="md"
                    name="email" isRequired placeholder="domingo@edensa.com.ar"
                    type="email" />
                <Input id="password"
                label="Contrasena"
                size="md"
                    name="password" isRequired placeholder="••••••••"
                    type="email" />
                {/* <div>
                  <label htmlFor="email" className="text-sm font-medium text-white/80">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                    className="mt-2 block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-primary placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div> */}
{/* 
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-white/80">
                      Password
                    </label>
                    <Link href="/forgot" className="text-xs font-medium text-violet-400 hover:text-violet-300">
                      Forgot password
                    </Link>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="mt-2 block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-primary placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div> */}

                <div className="flex items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-white/70">
                    <Checkbox size="md"/>
                    Remember for 30 days
                  </label>
                </div>

                <div className="space-y-3">
                  <Button size="xl" className="w-full">
                    Ingresá
                  </Button>

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
                </div>

                <p className="text-center text-sm text-error-600">
                  {error}

                  {/* Don&apos;t have an account? {" "}
                  <Link href="/signup" className="font-medium text-violet-400 hover:text-violet-300">
                    Sign up
                  </Link> */}
                </p>
              </form>
            </div>
          </div>
            </div>
        </div>
    </section>
      
    
  );
}
