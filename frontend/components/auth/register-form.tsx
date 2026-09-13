"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { ApiError, apiFetch } from "@/lib/api/client";
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
        return "8+ chars, upper, lower, number, symbol";
      }
      return null;
    case "confirmPassword":
      if (!form.confirmPassword) return "Please confirm password";
      if (form.confirmPassword !== form.password) return "Passwords do not match";
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

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
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

  async function handleContinueToStep2() {
    setTouched((prev) => ({ ...prev, name: true, email: true }));
    setFormError(null);

    const nameErr = getFieldError("name", form);
    const emailErr = getFieldError("email", form);

    if (nameErr || emailErr) {
      return;
    }

    setIsCheckingEmail(true);

    try {
      const res = await apiFetch<{ success: boolean; exists: boolean }>(
        `/auth/check-email?email=${encodeURIComponent(form.email.trim())}`
      );

      if (res?.exists) {
        setServerErrors((prev) => ({
          ...prev,
          email: "Email already exists",
        }));
        return;
      }

      setStep(2);
    } catch {
      // If check-email endpoint fails, allow proceeding to step 2; register will still validate
      setStep(2);
    } finally {
      setIsCheckingEmail(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (step === 1) {
      await handleContinueToStep2();
      return;
    }

    setTouched((prev) => ({
      ...prev,
      password: true,
      confirmPassword: true,
    }));
    setFormError(null);

    const passErr = getFieldError("password", form);
    const confirmErr = getFieldError("confirmPassword", form);

    if (passErr || confirmErr) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      router.replace("/onboarding");
    } catch (error) {
      if (error instanceof ApiError) {
        if (
          error.status === 409 ||
          error.message?.toLowerCase().includes("already exists") ||
          error.fieldErrors?.email?.toLowerCase().includes("already exists")
        ) {
          setServerErrors((prev) => ({
            ...prev,
            email: "Email already exists",
          }));
          setStep(1);
          setTouched((prev) => ({ ...prev, email: true }));
        } else {
          setFormError(error.message);
          setServerErrors(error.fieldErrors);
          if (error.fieldErrors?.email || error.fieldErrors?.name) {
            setStep(1);
            setTouched((prev) => ({ ...prev, email: true, name: true }));
          }
        }
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
        {step === 1 ? (
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground">Get started</p>

            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Create your <span className="text-primary">Cals</span> account
            </h1>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground">Security</p>

            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Set your <span className="text-primary">password</span>
            </h1>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {step === 1 ? (
            <>
              <div className="space-y-1">
                <FieldLabelRow
                  htmlFor="name"
                  label="Full name"
                  error={errorFor("name")}
                />

                <Input
                  id="name"
                  placeholder="Enter your name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  onBlur={markTouched("name")}
                  aria-invalid={Boolean(errorFor("name"))}
                  required
                />
              </div>

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
            </>
          ) : (
            <>
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
                    autoComplete="new-password"
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

              <div className="space-y-1">
                <FieldLabelRow
                  htmlFor="confirmPassword"
                  label="Confirm password"
                  error={errorFor("confirmPassword")}
                />

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
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {formError && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {formError}
            </p>
          )}

          {step === 1 ? (
            <Button
              type="submit"
              disabled={isCheckingEmail}
              className="h-12 w-full rounded-full py-0 text-sm font-semibold disabled:opacity-60"
            >
              {isCheckingEmail && <Loader2Icon className="size-4 animate-spin" />}
              Continue
            </Button>
          ) : (
            <div className="space-y-2 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-full py-0 text-sm font-semibold disabled:opacity-60"
              >
                {isSubmitting && <Loader2Icon className="size-4 animate-spin" />}
                Create account
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setStep(1)}
                className="h-11 w-full rounded-full border-border text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftIcon className="mr-1.5 size-4" />
                Back
              </Button>
            </div>
          )}
        </form>
      </div>

      {step === 1 ? (
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
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Log in
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-center text-xs font-medium text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Log in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
