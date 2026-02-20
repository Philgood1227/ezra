import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "@/features/auth/components";

export default function RegisterPage(): React.JSX.Element {
  return (
    <AuthShell
      title="Créer un compte parent"
      description="Configurez l'espace famille dans Ezra."
    >
      <RegisterForm />
    </AuthShell>
  );
}
