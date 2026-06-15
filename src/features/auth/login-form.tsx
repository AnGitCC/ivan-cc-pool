"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  callbackUrl: string;
  registered: boolean;
};

export function LoginForm({ callbackUrl, registered }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("邮箱或密码错误，请重试。");
      return;
    }

    router.push(result?.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">讲师登录</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-950">
        讲师登录
      </h1>
      <p className="mt-3 text-sm text-neutral-600">
        登录后进入讲师后台大屏。
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-700">邮箱</span>
          <input
            autoComplete="email"
            className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-emerald-500"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-700">密码</span>
          <input
            autoComplete="current-password"
            className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-emerald-500"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {registered ? (
          <p className="text-sm text-emerald-700">注册成功，请使用新账号登录。</p>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "登录中..." : "登录"}
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-600">
        还没有账号？{" "}
        <a className="font-medium text-emerald-700" href="/register">
          立即注册
        </a>
      </p>
    </div>
  );
}
