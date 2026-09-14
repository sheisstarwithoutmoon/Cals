import type { Metadata } from "next";
import Link from "next/link";
import { MailIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Cals",
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full rounded-2xl border border-border bg-white p-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-9">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
        <MailIcon className="size-6" />
      </div>
      <h1 className="mt-4 font-heading text-xl font-bold text-foreground">
        Password reset isn't available yet
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Contact support to reset your password for now.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-bold text-primary hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
