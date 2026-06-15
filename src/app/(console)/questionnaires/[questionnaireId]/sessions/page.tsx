import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { DeleteSessionButton } from "@/components/sessions/delete-session-button";
import {
  getSessionWorkbenchE2eStatistics,
  sessionWorkbenchE2eClosedSessionId,
  sessionWorkbenchE2eStatistics,
} from "@/components/sessions/session-workbench-page";
import { ShareDialog } from "@/components/sessions/share-dialog";
import {
  closeSession,
  createSession,
  deleteOwnedSession,
  listQuestionnaireSessions,
} from "@/features/sessions/actions";
import { getOwnedQuestionnaire } from "@/features/questionnaires/actions";
import { auth } from "@/lib/auth";

type SessionListItem = Awaited<ReturnType<typeof listQuestionnaireSessions>>[number];

type SessionsPageProps = {
  params: Promise<{
    questionnaireId: string;
  }>;
  searchParams: Promise<{
    deleteError?: string;
  }>;
};

function formatDate(date: Date | null) {
  if (!date) {
    return "未关闭";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getSearchParamMessage(error?: string) {
  if (!error) {
    return null;
  }

  return decodeURIComponent(error);
}

function getDeleteSessionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === "SESSION_NOT_FOUND") {
    return "该场次不存在或已被删除，请刷新页面后重试。";
  }

  return "删除场次未完成，请稍后再试。";
}

export default async function QuestionnaireSessionsPage({
  params,
  searchParams,
}: SessionsPageProps) {
  const { questionnaireId } = await params;
  const { deleteError } = await searchParams;
  const cookieStore = await cookies();
  const useE2eFixture = cookieStore.get("trae-e2e-fixture")?.value === "1";
  const session = await auth();
  const lecturerId = session?.user?.id ?? (useE2eFixture ? "e2e-lecturer" : undefined);
  const deleteErrorMessage = getSearchParamMessage(deleteError);

  if (!lecturerId) {
    redirect("/login");
  }

  const ownerId = lecturerId;
  const questionnaire = useE2eFixture
    ? questionnaireId === "e2e-questionnaire"
      ? {
          id: questionnaireId,
          title: "培训反馈问卷",
          description: "用于课程结束后的匿名反馈。",
          schemaJson: {},
          createdAt: new Date("2026-06-14T08:30:00.000Z"),
          updatedAt: new Date("2026-06-14T08:30:00.000Z"),
        }
      : null
    : await getOwnedQuestionnaire(questionnaireId, ownerId);

  if (!questionnaire) {
    notFound();
  }

  const closedSessionStatistics =
    getSessionWorkbenchE2eStatistics(sessionWorkbenchE2eClosedSessionId);
  const sessions: SessionListItem[] = useE2eFixture
    ? [
        {
          id: sessionWorkbenchE2eStatistics.session.id,
          name: sessionWorkbenchE2eStatistics.session.name,
          slug: "e2eslug01",
          status: sessionWorkbenchE2eStatistics.session.status,
          publicUrl: sessionWorkbenchE2eStatistics.session.publicUrl,
          createdAt: sessionWorkbenchE2eStatistics.session.createdAt,
          closedAt: sessionWorkbenchE2eStatistics.session.closedAt,
          questionnaireId: sessionWorkbenchE2eStatistics.session.questionnaireId,
          questionnaire: {
            id: sessionWorkbenchE2eStatistics.session.questionnaireId,
            title: sessionWorkbenchE2eStatistics.session.questionnaireTitle,
          },
        },
        closedSessionStatistics
          ? {
              id: closedSessionStatistics.session.id,
              name: closedSessionStatistics.session.name,
              slug: "e2eslug02",
              status: closedSessionStatistics.session.status,
              publicUrl: closedSessionStatistics.session.publicUrl,
              createdAt: closedSessionStatistics.session.createdAt,
              closedAt: closedSessionStatistics.session.closedAt,
              questionnaireId: closedSessionStatistics.session.questionnaireId,
              questionnaire: {
                id: closedSessionStatistics.session.questionnaireId,
                title: closedSessionStatistics.session.questionnaireTitle,
              },
            }
          : null,
      ].filter((item): item is SessionListItem => item !== null)
    : await listQuestionnaireSessions(questionnaireId, ownerId);

  async function handleCreateSession(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      return;
    }

    if (useE2eFixture) {
      return;
    }

    await createSession(questionnaireId, ownerId, name);
    revalidatePath(`/questionnaires/${questionnaireId}/sessions`);
    revalidatePath("/dashboard");
    revalidatePath("/questionnaires");
  }

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
    revalidatePath(`/questionnaires/${questionnaireId}/sessions`);
    revalidatePath("/dashboard");
  }

  async function handleDeleteSession(formData: FormData) {
    "use server";

    const sessionId = String(formData.get("sessionId") ?? "");

    if (!sessionId) {
      return;
    }

    if (useE2eFixture) {
      return;
    }

    try {
      await deleteOwnedSession(sessionId, ownerId);
    } catch (error) {
      redirect(
        `/questionnaires/${questionnaireId}/sessions?deleteError=${encodeURIComponent(
          getDeleteSessionErrorMessage(error),
        )}`,
      );
    }

    revalidatePath(`/questionnaires/${questionnaireId}/sessions`);
    revalidatePath("/dashboard");
    revalidatePath("/questionnaires");
    redirect(`/questionnaires/${questionnaireId}/sessions`);
  }

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">
            Session Control
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            {questionnaire.title} 的场次管理
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            为问卷创建独立场次、生成公网填写链接，并通过二维码弹窗进行投屏分享。
          </p>
        </div>

        <Link
          className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
          href="/questionnaires"
        >
          返回问卷列表
        </Link>
      </header>

      {deleteErrorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          删除未完成：{deleteErrorMessage}
        </div>
      ) : null}

      <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">创建新场次</h2>
            <p className="mt-2 text-sm text-neutral-600">
              每个场次都会生成一个独立 slug 和公网填写链接，便于现场扫码匿名填写。
            </p>
          </div>
        </div>

        <form action={handleCreateSession} className="mt-6 flex flex-col gap-3 md:flex-row">
          <input
            className="flex-1 rounded-2xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-emerald-500"
            name="name"
            placeholder="例如：2026 届新员工训练营上午场"
            required
            type="text"
          />
          <button
            className="inline-flex shrink-0 whitespace-nowrap items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-600"
            type="submit"
          >
            创建场次
          </button>
        </form>
      </section>

      {sessions.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-neutral-300 bg-white px-8 py-16 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-neutral-950">还没有场次</h2>
          <p className="mt-3 text-sm text-neutral-600">
            创建后即可在此查看公网填写地址、打开二维码分享弹窗并手动关闭场次。
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((surveySession) => (
            <article
              key={surveySession.id}
              className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        surveySession.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {surveySession.status === "ACTIVE" ? "进行中" : "已关闭"}
                    </span>
                    <span className="text-xs text-neutral-500">
                      slug: {surveySession.slug}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-semibold text-neutral-950">
                    {surveySession.name}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-600">
                    <span>创建于 {formatDate(surveySession.createdAt)}</span>
                    <span>关闭于 {formatDate(surveySession.closedAt)}</span>
                  </div>
                  <a
                    className="mt-5 block break-all text-sm leading-6 text-emerald-700 hover:text-emerald-800"
                    href={surveySession.publicUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {surveySession.publicUrl}
                  </a>
                </div>

                <div className="flex flex-wrap gap-3">
                  <ShareDialog
                    sessionName={surveySession.name}
                    url={surveySession.publicUrl}
                  />
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
                    href={`/sessions/${surveySession.id}`}
                  >
                    查看统计
                  </Link>
                  {surveySession.status === "ACTIVE" ? (
                    <form action={handleCloseSession}>
                      <input
                        name="sessionId"
                        type="hidden"
                        value={surveySession.id}
                      />
                      <button
                        className="inline-flex items-center justify-center rounded-full border border-red-200 px-5 py-3 text-sm font-medium text-red-600 transition hover:border-red-300 hover:text-red-700"
                        type="submit"
                      >
                        关闭场次
                      </button>
                    </form>
                  ) : null}
                  <form action={handleDeleteSession}>
                    <input
                      name="sessionId"
                      type="hidden"
                      value={surveySession.id}
                    />
                    <DeleteSessionButton />
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
