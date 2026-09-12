import { ProtectedShell } from "@/components/layout/protected-shell";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedShell>{children}</ProtectedShell>;
}
