import { redirect } from "next/navigation";
import { registerLecturer } from "@/features/auth/register";

type RegisterPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : "";

  async function registerAction(formData: FormData) {
    "use server";

    try {
      await registerLecturer({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });
    } catch {
      redirect("/register?error=1");
    }

    redirect("/login?registered=1");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">Lecturer Sign Up</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-950">
          讲师注册
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          创建讲师账号后即可进入问卷后台。
        </p>

        <form action={registerAction} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-700">姓名</span>
            <input
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-emerald-500"
              name="name"
              required
              type="text"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-700">邮箱</span>
            <input
              autoComplete="email"
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-emerald-500"
              name="email"
              required
              type="email"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-700">密码</span>
            <input
              autoComplete="new-password"
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-emerald-500"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>

          {error ? <p className="text-sm text-red-600">注册失败，请检查输入后重试。</p> : null}

          <button
            className="w-full rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-600"
            type="submit"
          >
            创建账号
          </button>
        </form>

        <p className="mt-6 text-sm text-neutral-600">
          已有账号？{" "}
          <a className="font-medium text-emerald-700" href="/login">
            去登录
          </a>
        </p>
      </div>
    </main>
  );
}
