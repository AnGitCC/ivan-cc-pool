import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  getSessionWorkbenchE2eStatistics,
  SessionWorkbenchPage,
  sessionWorkbenchE2eSessionOptions,
} from "@/components/sessions/session-workbench-page";
import {
  closeSession,
  listOwnedSessionsForWorkbench,
} from "@/features/sessions/actions";
import { auth } from "@/lib/auth";
import {
  getDashboardPreference,
  normalizeDashboardPreference,
  parseDashboardPreferenceFormData,
  saveDashboardPreference,
} from "@/features/stats/preferences";
import { getSessionStatistics } from "@/features/stats/query";

type SessionStatisticsPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function SessionStatisticsPage({
  params,
}: SessionStatisticsPageProps) {
  const { sessionId } = await params;
  const cookieStore = await cookies();
  const useE2eFixture = cookieStore.get("trae-e2e-fixture")?.value === "1";
  const session = await auth();
  const lecturerId = session?.user?.id ?? (useE2eFixture ? "e2e-lecturer" : undefined);

  if (!lecturerId) {
    redirect("/login");
  }

  const ownerId = lecturerId;
  const statistics = useE2eFixture
    ? getSessionWorkbenchE2eStatistics(sessionId)
    : await getSessionStatistics(sessionId, ownerId);

  if (!statistics) {
    notFound();
  }

  const sessionOptions = useE2eFixture
    ? sessionWorkbenchE2eSessionOptions.filter(
        (sessionOption) =>
          sessionOption.questionnaireId === statistics.session.questionnaireId,
      )
    : await listOwnedSessionsForWorkbench(
        ownerId,
        statistics.session.questionnaireId,
      );

  const preference = useE2eFixture
    ? normalizeDashboardPreference()
    : await getDashboardPreference(ownerId);

  async function handleCloseSession(formData: FormData) {
    "use server";

    const nextSessionId = String(formData.get("sessionId") ?? "");

    if (!nextSessionId || useE2eFixture) {
      return;
    }

    await closeSession(nextSessionId, ownerId);
    revalidatePath("/dashboard");
    revalidatePath(`/sessions/${nextSessionId}`);
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
    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath("/dashboard");
  }

  return (
    <SessionWorkbenchPage
      closeSessionAction={handleCloseSession}
      preference={preference}
      savePreferenceAction={handleSavePreference}
      sessionOptions={sessionOptions}
      showDashboardLink
      statistics={statistics}
    />
  );
}
