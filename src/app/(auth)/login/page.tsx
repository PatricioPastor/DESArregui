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
    
      
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: testimonial / quote */}
          <aside className="relative hidden min-h-[560px] flex-col justify-between p-8 md:flex md:p-12">
            <div className="absolute left-6 top-6 flex items-center gap-3 text-white/80">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10" />
              <span className="text-sm font-medium">Untitled UI</span>
            </div>

            <div className="mt-16 flex flex-1 flex-col items-start justify-center">
              <blockquote className="max-w-xl text-balance text-2xl font-semibold leading-snug text-primary md:text-3xl">
                {"We've been using Untitled to kick start every new project and can't imagine working without it."}
              </blockquote>

              <div className="mt-8 flex items-center gap-4">
                <div className="relative h-12 w-12 overflow-hidden rounded-full ring-1 ring-white/10">
                  {/* <Image
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&auto=format&fit=crop"
                    alt="Avatar"
                    fill
                    sizes="48px"
                  /> */}
                </div>
                <div>
                  <div className="text-sm font-medium text-primary">Pippa Wilkinson</div>
                  <div className="text-xs text-white/60">Head of Design, Layers</div>
                  <div className="mt-2 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} viewBox="0 0 20 20" className="h-4 w-4 fill-yellow-400/90" aria-hidden="true">
                        <path d="M10 15.27 16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <footer className="mt-8 text-xs text-white/40">© Untitled UI 2077</footer>
          </aside>

          {/* Right: form */}
          <div className="relative flex min-h-[560px] flex-col justify-center p-8 md:p-12">
            <div className="mx-auto w-full max-w-md">
              <h1 className="text-2xl font-semibold text-primary md:text-3xl">Welcome back</h1>
              <p className="mt-2 text-sm text-white/60">
                Welcome back! Please enter your details.
              </p>

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
      
    
  );
}
