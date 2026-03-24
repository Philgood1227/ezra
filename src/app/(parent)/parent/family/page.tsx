import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, PageLayout } from "@/components/ds";

const FAMILY_MODULES = [
  {
    id: "meals",
    title: "Repas",
    description: "Planifier les repas et suivre l'organisation alimentaire de la semaine.",
    href: "/parent/meals",
    actionLabel: "Ouvrir repas",
  },
  {
    id: "achievements",
    title: "Succes & badges",
    description: "Voir les progres et badges debloques pour garder la motivation.",
    href: "/parent/achievements",
    actionLabel: "Ouvrir succes",
  },
  {
    id: "rewards",
    title: "Recompenses",
    description: "Configurer les recompenses et moments positifs en famille.",
    href: "/parent/rewards",
    actionLabel: "Ouvrir recompenses",
  },
  {
    id: "gamification",
    title: "Gamification",
    description: "Ajuster points, progression et rythme de motivation.",
    href: "/parent/gamification",
    actionLabel: "Ouvrir gamification",
  },
  {
    id: "cinema",
    title: "Cinema",
    description: "Planifier les moments cinema et contenus associes.",
    href: "/parent/cinema",
    actionLabel: "Ouvrir cinema",
  },
] as const;

export default function ParentFamilyPage(): React.JSX.Element {
  return (
    <PageLayout
      title="Modules famille"
      subtitle="Acces centralise aux outils motivation et vie familiale."
      className="max-w-6xl"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {FAMILY_MODULES.map((module) => (
          <Card key={module.id}>
            <CardHeader>
              <CardTitle>{module.title}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={module.href}>
                <Button variant="secondary">{module.actionLabel}</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}

