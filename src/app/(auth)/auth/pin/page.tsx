import { AuthShell } from "@/components/layout/auth-shell";
import { PinForm } from "@/features/auth/components";

export default function PinPage(): React.JSX.Element {
  return (
    <AuthShell
      title="Accès enfant par code PIN"
      description="Entrez la famille et le PIN pour ouvrir le mode enfant."
    >
      <PinForm />
    </AuthShell>
  );
}
