"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";
import { isValidEmail } from "@/lib/validation";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_state_mismatch: "Your Google sign-in session expired. Please try again.",
  google_auth_missing_code: "Google sign-in was cancelled or didn't return a code.",
  google_no_identity_token: "Google didn't return an identity token. Please try again.",
  google_verification_failed: "We couldn't verify your Google account. Please try again.",
  google_account_unverified: "That Google account's email isn't verified.",
  google_auth_failed: "Google sign-in failed. Please try again.",
};

interface FormState {
  email: string;
  password: string;
}

type FieldName = keyof FormState;

function getFieldError(field: FieldName, form: FormState): string | null {
  switch (field) {
    case "email":
      if (!form.email.trim()) return "Email is required";
      if (!isValidEmail(form.email)) return "Enter a valid email address";
      return null;
    case "password":
      if (!form.password) return "Password is required";
      return null;
    default:
      return null;
  }
}

interface FieldLabelRowProps {
  htmlFor: string;
  label: string;
  error?: string;
}

function FieldLabelRow({ htmlFor, label, error }: FieldLabelRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 pb-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-bold text-foreground shrink-0">
        {label}
      </Label>
      {error && (
        <span className="text-right text-xs font-medium text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleError = searchParams.get("error");

  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  function updateField<K extends FieldName>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setServerErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function markTouched(field: FieldName) {
    return () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
    };
  }

  function errorFor(field: FieldName): string | undefined {
    if (!touched[field]) return undefined;
    return getFieldError(field, form) ?? serverErrors[field] ?? undefined;
  }

  const isFormValid = !getFieldError("email", form) && !getFieldError("password", form);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setTouched({ email: true, password: true });
    setFormError(null);

    if (!isFormValid) return;

    setIsSubmitting(true);

    try {
      const loggedInUser = await login(form.email, form.password);
      router.replace(loggedInUser.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setServerErrors(error.fieldErrors);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[500px] w-full flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-9">
      <div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-muted-foreground">Welcome back</p>

          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Sign in to <span className="text-primary">Cals</span>
          </h1>
        </div>

        {googleError && (
          <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {GOOGLE_ERROR_MESSAGES[googleError] ?? "Google sign-in failed. Please try again."}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-1">
            <FieldLabelRow
              htmlFor="email"
              label="Email address"
              error={errorFor("email")}
            />

            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              onBlur={markTouched("email")}
              aria-invalid={Boolean(errorFor("email"))}
              required
            />
          </div>

          <div className="space-y-1">
            <FieldLabelRow
              htmlFor="password"
              label="Password"
              error={errorFor("password")}
            />

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                onBlur={markTouched("password")}
                aria-invalid={Boolean(errorFor("password"))}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </button>
            </div>
          </div>

          {formError && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {formError}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-full py-0 text-sm font-semibold disabled:opacity-60"
          >
            {isSubmitting && (
              <Loader2Icon className="size-4 animate-spin" />
            )}
            Sign in
          </Button>
        </form>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="mt-5">
          <GoogleAuthButton />
        </div>

        <p className="mt-5 text-center text-xs font-medium text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-bold text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
