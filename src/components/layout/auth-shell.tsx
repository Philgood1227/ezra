import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ds";

interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps): React.JSX.Element {
  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="border-0 bg-white/95 p-0 shadow-floating">
        <CardHeader className="px-6 pt-6">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">{children}</CardContent>
      </Card>
    </div>
  );
}
