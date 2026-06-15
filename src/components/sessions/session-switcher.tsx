"use client";

import { useRouter } from "next/navigation";
import { buildSessionWorkbenchHref } from "@/features/sessions/workbench";

type SessionSwitcherProps = {
  currentSessionId: string;
  sessions: Array<{
    id: string;
    name: string;
    status: "ACTIVE" | "CLOSED";
  }>;
};

export function SessionSwitcher({
  currentSessionId,
  sessions,
}: SessionSwitcherProps) {
  const router = useRouter();

  return (
    <select
      aria-label="切换场次"
      className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-700"
      onChange={(event) => {
        const nextSessionId = event.target.value;

        if (nextSessionId === currentSessionId) {
          return;
        }

        router.push(buildSessionWorkbenchHref(nextSessionId));
      }}
      value={currentSessionId}
    >
      {sessions.map((session) => (
        <option key={session.id} value={session.id}>
          {session.name} {session.status === "ACTIVE" ? "· 进行中" : "· 已关闭"}
        </option>
      ))}
    </select>
  );
}
