import { LoginForm } from "@/features/auth/login-form";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : "/dashboard";
  const registered = params.registered === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-16">
      <LoginForm callbackUrl={callbackUrl} registered={registered} />
    </main>
  );
}
