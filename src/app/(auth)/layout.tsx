import { redirectIfAuthenticated } from "@/lib/auth/guards";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  await redirectIfAuthenticated();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
