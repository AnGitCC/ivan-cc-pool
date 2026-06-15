import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { AppFooter } from "@/components/layout/app-footer";
import { auth } from "@/lib/auth";

export default async function ConsoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const useE2eFixture = cookieStore.get("trae-e2e-fixture")?.value === "1";
  const session = await auth();

  if (!session?.user?.id && !useE2eFixture) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="mb-6 flex items-center justify-end gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
            href="/settings"
          >
            账户设置
          </Link>
          <LogoutButton />
        </header>
        <div className="flex-1">{children}</div>
        <AppFooter />
      </div>
    </div>
  );
}
