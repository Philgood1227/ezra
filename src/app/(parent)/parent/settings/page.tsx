import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageLayout,
} from "@/components/ds";
import { FeedbackPreferencesCard } from "@/components/preferences/feedback-preferences-card";
import { SetPinForm } from "@/features/auth/components";

export default function ParentSettingsPage(): React.JSX.Element {
  return (
    <PageLayout hideHeader title="Reglages" subtitle="Securite et parametres du compte">
      <FeedbackPreferencesCard
        scope="global"
        title="Retour sensoriel"
        description="Activez ou desactivez les vibrations et les sons de confirmation."
      />

      <Card>
        <CardHeader>
          <CardTitle>Configuration du PIN enfant</CardTitle>
          <CardDescription>
            Definissez ou mettez a jour le PIN enfant utilise pour l&apos;acces rapide sur
            /auth/pin. Si le profil enfant n&apos;existe pas encore, il sera cree automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetPinForm />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
