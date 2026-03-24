import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, PageLayout } from "@/components/ds";

const ORGANIZATION_MODULES = [
  {
    id: "day-templates",
    title: "Journees types",
    description: "Construire les modeles de journee et routines enfant.",
    href: "/parent/day-templates",
    actionLabel: "Ouvrir les modeles",
  },
  {
    id: "weekly-tasks",
    title: "Taches hebdo",
    description: "Programmer les taches scolaires et extras sans modifier la structure des journees types.",
    href: "/parent/weekly-tasks",
    actionLabel: "Ouvrir les taches",
  },
  {
    id: "school-diary",
    title: "Carnet scolaire",
    description: "Suivre devoirs, materiel et informations de l'ecole.",
    href: "/parent/school-diary",
    actionLabel: "Ouvrir le carnet",
  },
  {
    id: "checklists",
    title: "Checklists",
    description: "Gerer les listes a faire du quotidien et des routines.",
    href: "/parent/checklists",
    actionLabel: "Ouvrir les checklists",
  },
  {
    id: "categories",
    title: "Categories",
    description: "Organiser les taches et etiquettes utilisees dans les modules.",
    href: "/parent/categories",
    actionLabel: "Ouvrir les categories",
  },
] as const;

export default function ParentOrganizationPage(): React.JSX.Element {
  return (
    <PageLayout
      title="Modules organisation"
      subtitle="Acces rapide aux outils de planification quotidienne sans surcharger la navigation."
      className="max-w-6xl"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {ORGANIZATION_MODULES.map((module) => (
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

