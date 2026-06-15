import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SessionWorkbenchPage,
  sessionWorkbenchE2eSessionOptions,
  sessionWorkbenchE2eStatistics,
} from "@/components/sessions/session-workbench-page";
import {
  closeSession,
  getDashboardSession,
  listOwnedSessionsForWorkbench,
} from "@/features/sessions/actions";
import {
  getDashboardPreference,
  normalizeDashboardPreference,
  parseDashboardPreferenceFormData,
  saveDashboardPreference,
} from "@/features/stats/preferences";
import {
  type SessionStatistics,
  getSessionStatistics,
} from "@/features/stats/query";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const useE2eFixture = cookieStore.get("trae-e2e-fixture")?.value === "1";
  const session = await auth();
  const lecturerId = session?.user?.id ?? (useE2eFixture ? "e2e-lecturer" : undefined);

  if (!lecturerId) {
    redirect("/login");
  }

  const ownerId = lecturerId;
  const dashboardSession = useE2eFixture
    ? {
        id: sessionWorkbenchE2eStatistics.session.id,
        questionnaireId: sessionWorkbenchE2eStatistics.session.questionnaireId,
      }
    : await getDashboardSession(ownerId);
  const sessionOptions = useE2eFixture
    ? sessionWorkbenchE2eSessionOptions.filter(
        (sessionOption) =>
          sessionOption.questionnaireId === dashboardSession?.questionnaireId,
      )
    : dashboardSession
      ? await listOwnedSessionsForWorkbench(
          ownerId,
          dashboardSession.questionnaireId,
        )
      : [];
  const statistics: SessionStatistics | null = dashboardSession
    ? useE2eFixture
      ? sessionWorkbenchE2eStatistics
      : await getSessionStatistics(dashboardSession.id, ownerId)
    : null;
  const preference = useE2eFixture
    ? normalizeDashboardPreference()
    : await getDashboardPreference(ownerId);

  async function handleCloseSession(formData: FormData) {
    "use server";

    const sessionId = String(formData.get("sessionId") ?? "");

    if (!sessionId) {
      return;
    }

    if (useE2eFixture) {
      return;
    }

    await closeSession(sessionId, ownerId);
    revalidatePath("/dashboard");
  }

  async function handleSavePreference(formData: FormData) {
    "use server";

    if (useE2eFixture) {
      return;
    }

    const preferenceInput = parseDashboardPreferenceFormData(formData);
    await saveDashboardPreference(
      ownerId,
      preferenceInput.hiddenModules,
      preferenceInput.chartTypeByBlock,
    );
    revalidatePath("/dashboard");

    if (dashboardSession) {
      revalidatePath(`/sessions/${dashboardSession.id}`);
    }
  }

  return (
    dashboardSession && statistics ? (
      <SessionWorkbenchPage
        closeSessionAction={handleCloseSession}
        preference={preference}
        savePreferenceAction={handleSavePreference}
        sessionOptions={sessionOptions}
        statistics={statistics}
      />
    ) : (
      <section className="space-y-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">
              Lecturer Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
              场次工作台
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              默认优先展示最近一个进行中的场次，并把投屏分享、回收进度和统计配置集中在同一屏内，方便讲师现场切换与投屏。
            </p>
          </div>

          <Link
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
            href="/questionnaires"
          >
            进入问卷列表
          </Link>
        </header>

        <div className="rounded-[36px] border border-dashed border-neutral-300 bg-white/90 px-8 py-16 text-center shadow-sm backdrop-blur">
          <h2 className="text-2xl font-semibold text-neutral-950">还没有场次</h2>
          <p className="mt-3 text-sm text-neutral-600">
            请先进入问卷列表，为某份问卷创建第一个场次。
          </p>
          <Link
            className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-600"
            href="/questionnaires"
          >
            去创建场次
          </Link>
        </div>
      </section>
    )
  );
}
