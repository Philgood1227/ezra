import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, PageLayout } from "@/components/ds";

const LEARNING_MODULES = [
  {
    id: "revisions-library",
    title: "Bibliothèque",
    description: "Voir toutes les fiches, filtrer par statut et publier les cartes prêtes.",
    href: "/parent/revisions",
    actionLabel: "Ouvrir la bibliothèque",
  },
  {
    id: "revisions-generate",
    title: "Générer (IA)",
    description: "Créer rapidement une fiche assistée par IA à partir d'un sujet et d'une notion.",
    href: "/parent/revisions/generate",
    actionLabel: "Ouvrir la génération IA",
  },
  {
    id: "books-resources",
    title: "Livres & fiches",
    description: "Importer des manuels PDF, lancer l'indexation puis générer des fiches depuis le livre.",
    href: "/parent/resources/books",
    actionLabel: "Ouvrir les ressources",
  },
  {
    id: "knowledge",
    title: "Connaissances",
    description: "Consulter et structurer la base de connaissances réutilisée dans les modules pédagogiques.",
    href: "/parent/knowledge",
    actionLabel: "Ouvrir connaissances",
  },
] as const;

export default function ParentLearningPage(): React.JSX.Element {
  return (
    <PageLayout
      title="Modules apprentissages"
      subtitle="Point d'entrée unique pour les fiches, la génération IA et les ressources pédagogiques."
      className="max-w-6xl"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {LEARNING_MODULES.map((module) => (
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
