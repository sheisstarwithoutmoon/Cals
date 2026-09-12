import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Cals",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
