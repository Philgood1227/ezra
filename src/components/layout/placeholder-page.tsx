import { Card, CardContent, CardHeader, CardTitle, PageLayout } from "@/components/ds";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  body: string;
}

export function PlaceholderPage({
  title,
  subtitle,
  body,
}: PlaceholderPageProps): React.JSX.Element {
  return (
    <PageLayout title={title} subtitle={subtitle}>
      <Card>
        <CardHeader>
          <CardTitle>{title} - en préparation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-muted">{body}</p>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
