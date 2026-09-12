"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_state_mismatch: "Your Google sign-in session expired. Please try again.",
  google_auth_missing_code: "Google sign-in was cancelled or didn't return a code.",
  google_no_identity_token: "Google didn't return an identity token. Please try again.",
  google_verification_failed: "We couldn't verify your Google account. Please try again.",
  google_account_unverified: "That Google account's email isn't verified.",
  google_auth_failed: "Google sign-in failed. Please try again.",
};

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(email, password);
      router.replace(loggedInUser.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full rounded-3xl border border-stone-200 bg-white p-6 shadow-lg sm:p-9">
      <div className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
          Welcome back
        </p>

        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
          Sign in to <span className="text-[#0d6832]">Cals</span>
        </h1>
      </div>

      {googleError && (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {GOOGLE_ERROR_MESSAGES[googleError] ?? "Google sign-in failed. Please try again."}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-bold text-stone-700"
          >
            Email address
          </Label>

          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            className="rounded-xl border-stone-200 bg-stone-50/50 py-2.5 text-sm focus:border-emerald-600 focus:bg-white"
            required
          />

          {fieldErrors.email && (
            <p className="text-xs text-rose-600">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs font-bold text-stone-700"
          >
            Password
          </Label>

          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            className="rounded-xl border-stone-200 bg-stone-50/50 py-2.5 text-sm focus:border-emerald-600 focus:bg-white"
            required
          />

          {fieldErrors.password && (
            <p className="text-xs text-rose-600">{fieldErrors.password}</p>
          )}
        </div>

        {formError && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full cursor-pointer rounded-full bg-emerald-700 py-0 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 active:scale-98"
        >
          {isSubmitting && (
            <Loader2Icon className="size-4 animate-spin" />
          )}
          Sign in
        </Button>
      </form>

      <div className="mt-5 flex items-center gap-3 text-xs font-medium text-stone-400">
        <span className="h-px flex-1 bg-stone-200" />
        or
        <span className="h-px flex-1 bg-stone-200" />
      </div>

      <div className="mt-5">
        <GoogleAuthButton />
      </div>

      <p className="mt-5 text-center text-xs font-medium text-stone-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-bold text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
