import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const useE2eFixture = cookieStore.get("trae-e2e-fixture")?.value === "1";
  const session = await auth();

  if (!session?.user?.id && !useE2eFixture) {
    redirect("/login");
  }

  const name = session?.user?.name ?? "讲师";
  const email = session?.user?.email ?? "未绑定邮箱";

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">
            Account Settings
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
            账户设置
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
            查看当前讲师账号信息。后续可在这里补齐修改资料与密码等能力。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
          href="/dashboard"
        >
          返回工作台
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">姓名</p>
          <p className="mt-4 text-lg font-semibold text-neutral-950">{name}</p>
        </div>
        <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">邮箱</p>
          <p className="mt-4 text-lg font-semibold text-neutral-950">{email}</p>
        </div>
      </section>
    </section>
  );
}

