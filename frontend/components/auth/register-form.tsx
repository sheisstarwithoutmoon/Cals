"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";
import { isPasswordValid, isValidEmail } from "@/lib/validation";

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type FieldName = keyof FormState;

function getFieldError(field: FieldName, form: FormState): string | null {
  switch (field) {
    case "name":
      if (!form.name.trim()) return "Full name is required";
      if (form.name.trim().length < 2) return "Name must be at least 2 characters";
      return null;
    case "email":
      if (!form.email.trim()) return "Email is required";
      if (!isValidEmail(form.email)) return "Enter a valid email address";
      return null;
    case "password":
      if (!form.password) return "Password is required";
      if (!isPasswordValid(form.password)) {
        return "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.";
      }
      return null;
    case "confirmPassword":
      if (!form.confirmPassword) return "Please confirm your password";
      if (form.confirmPassword !== form.password) return "Passwords do not match";
      return null;
    default:
      return null;
  }
}

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const isFormValid =
    !getFieldError("name", form) &&
    !getFieldError("email", form) &&
    !getFieldError("password", form) &&
    !getFieldError("confirmPassword", form);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    setFormError(null);

    if (!isFormValid) return;

    setIsSubmitting(true);

    try {
      await register(form.name, form.email, form.password);
      router.replace("/onboarding");
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
    <div className="w-full rounded-3xl border border-stone-200 bg-white p-6 shadow-lg sm:p-9">
      <div className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
          Get started
        </p>

        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
          Create your <span className="text-[#0d6832]">Cals</span> account
        </h1>

      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div className="space-y-1">
          <Label
            htmlFor="name"
            className="text-xs font-bold text-stone-700"
          >
            Full name
          </Label>

          <Input
            id="name"
            placeholder="Enter your name"
            autoComplete="name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            onBlur={markTouched("name")}
            aria-invalid={Boolean(errorFor("name"))}
            className="rounded-xl border-stone-200 bg-stone-50/50 py-2.5 text-sm focus-visible:border-emerald-600 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-emerald-600/20"
            required
          />

          {errorFor("name") && (
            <p className="text-xs text-rose-600">{errorFor("name")}</p>
          )}
        </div>

        <div className="space-y-1">
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
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            onBlur={markTouched("email")}
            aria-invalid={Boolean(errorFor("email"))}
            className="rounded-xl border-stone-200 bg-stone-50/50 py-2.5 text-sm focus-visible:border-emerald-600 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-emerald-600/20"
            required
          />

          {errorFor("email") && (
            <p className="text-xs text-rose-600">{errorFor("email")}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label
            htmlFor="password"
            className="text-xs font-bold text-stone-700"
          >
            Password
          </Label>

          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              aria-invalid={Boolean(errorFor("password"))}
              className="rounded-xl border-stone-200 bg-stone-50/50 py-2.5 pr-10 text-sm focus-visible:border-emerald-600 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-emerald-600/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-3 flex items-center text-stone-400 transition-colors hover:text-stone-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
          </div>

          {(touched.password && !form.password) ||
          (form.password && !isPasswordValid(form.password)) ? (
            <p className="text-xs text-rose-600">
              {touched.password && !form.password
                ? "Password is required"
                : "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character."}
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label
            htmlFor="confirmPassword"
            className="text-xs font-bold text-stone-700"
          >
            Confirm password
          </Label>

          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Enter it again"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              onBlur={markTouched("confirmPassword")}
              aria-invalid={Boolean(errorFor("confirmPassword"))}
              className="rounded-xl border-stone-200 bg-stone-50/50 py-2.5 pr-10 text-sm focus-visible:border-emerald-600 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-emerald-600/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute inset-y-0 right-3 flex items-center text-stone-400 transition-colors hover:text-stone-600"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
          </div>

          {errorFor("confirmPassword") && (
            <p className="text-xs text-rose-600">
              {errorFor("confirmPassword")}
            </p>
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
          className="h-12 w-full cursor-pointer rounded-full bg-emerald-700 py-0 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 active:scale-98 disabled:opacity-60"
        >
          {isSubmitting && (
            <Loader2Icon className="size-4 animate-spin" />
          )}
          Create account
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
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
