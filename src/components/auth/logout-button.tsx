"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      退出登录
    </button>
  );
}
