import { GuestShell } from "@/components/layout/guest-shell";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestShell>{children}</GuestShell>;
}
