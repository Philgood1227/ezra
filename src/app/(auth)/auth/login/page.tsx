import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/features/auth/components";

export default function LoginPage(): React.JSX.Element {
  return (
    <AuthShell
      title="Connexion parent"
      description="Accédez aux routines, modèles et réglages de votre famille."
    >
      <LoginForm />
    </AuthShell>
  );
}
