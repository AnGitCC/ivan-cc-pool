import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DeleteQuestionnaireButton } from "@/components/questionnaires/delete-questionnaire-button";
import { QuestionnaireImportPanel } from "@/components/questionnaires/questionnaire-import-panel";
import {
  deleteOwnedQuestionnaire,
  listOwnedQuestionnaires,
} from "@/features/questionnaires/actions";
import {
  getQuestionnaireImportErrorMessage,
  importQuestionnaireFromWorkbook,
} from "@/features/questionnaires/import-flow";
import { auth } from "@/lib/auth";

function getSearchParamMessage(error?: string) {
  if (!error) {
    return null;
  }

  return decodeURIComponent(error);
}

function getDeleteQuestionnaireErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "QUESTIONNAIRE_HAS_SESSIONS") {
      return "该问卷已经关联场次，暂时不能删除。";
    }

    if (error.message === "QUESTIONNAIRE_NOT_FOUND") {
      return "该问卷不存在或已被删除，请刷新列表后重试。";
    }
  }

  return "删除未完成，请稍后再试。";
}

type QuestionnairesPageProps = {
  searchParams: Promise<{
    importError?: string;
    deleteError?: string;
  }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function QuestionnairesPage({
  searchParams,
}: QuestionnairesPageProps) {
  const session = await auth();
  const ownerId = session?.user?.id;
  const questionnaires = ownerId ? await listOwnedQuestionnaires(ownerId) : [];
  const { deleteError, importError } = await searchParams;
  const importErrorMessage = getSearchParamMessage(importError);
  const deleteErrorMessage = getSearchParamMessage(deleteError);

  async function importQuestionnaireAction(formData: FormData) {
    "use server";

    const activeSession = await auth();
    const activeOwnerId = activeSession?.user?.id;

    if (!activeOwnerId) {
      redirect("/login");
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      redirect(
        "/questionnaires?importError=" +
          encodeURIComponent(getQuestionnaireImportErrorMessage(new Error("MISSING_IMPORT_FILE"))),
      );
    }

    let importedQuestionnaire: Awaited<ReturnType<typeof importQuestionnaireFromWorkbook>>;

    try {
      importedQuestionnaire = await importQuestionnaireFromWorkbook({
        ownerId: activeOwnerId,
        filename: file.name,
        workbook: await file.arrayBuffer(),
      });
    } catch (error) {
      redirect(
        "/questionnaires?importError=" +
          encodeURIComponent(getQuestionnaireImportErrorMessage(error)),
      );
    }

    redirect(importedQuestionnaire.redirectUrl);
  }

  async function deleteQuestionnaireAction(formData: FormData) {
    "use server";

    const activeSession = await auth();
    const activeOwnerId = activeSession?.user?.id;

    if (!activeOwnerId) {
      redirect("/login");
    }

    const questionnaireId = String(formData.get("questionnaireId") ?? "");
    if (!questionnaireId) {
      return;
    }

    try {
      await deleteOwnedQuestionnaire(questionnaireId, activeOwnerId);
    } catch (error) {
      redirect(
        "/questionnaires?deleteError=" +
          encodeURIComponent(getDeleteQuestionnaireErrorMessage(error)),
      );
    }

    revalidatePath("/questionnaires");
    redirect("/questionnaires");
  }

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">
            Questionnaire Library
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            问卷列表
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            在这里统一管理讲师问卷，支持手工建卷，也支持先下载 Excel 模板、按示例填写后再上传解析。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
            href="/questionnaires/new"
          >
            手工建卷
          </Link>
          <a
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
            href="/api/questionnaires/template"
          >
            下载 Excel 模板
          </a>
        </div>
      </header>

      {importErrorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          问卷导入未完成：{importErrorMessage}
        </div>
      ) : null}

      {deleteErrorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          删除未完成：{deleteErrorMessage}
        </div>
      ) : null}

      <QuestionnaireImportPanel importAction={importQuestionnaireAction} />

      {questionnaires.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white px-8 py-16 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-neutral-950">还没有问卷</h2>
          <p className="mt-3 text-sm text-neutral-600">
            你可以直接手工创建第一份问卷，也可以先下载模板，按示例填写后上传生成问卷。
          </p>
          <Link
            className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-600"
            href="/questionnaires/new"
          >
            创建第一份问卷
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {questionnaires.map((questionnaire) => (
            <article
              key={questionnaire.id}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-950">
                    {questionnaire.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                    {questionnaire.description || "暂未填写问卷说明。"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-500">
                    <span>关联场次 {questionnaire._count.sessions}</span>
                    <span>创建于 {formatDate(questionnaire.createdAt)}</span>
                    <span>最近更新 {formatDate(questionnaire.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
                    href={`/questionnaires/${questionnaire.id}/edit`}
                  >
                    编辑问卷
                  </Link>
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
                    href={`/questionnaires/${questionnaire.id}/sessions`}
                  >
                    管理场次
                  </Link>
                  {questionnaire._count.sessions === 0 ? (
                    <form action={deleteQuestionnaireAction}>
                      <input
                        name="questionnaireId"
                        type="hidden"
                        value={questionnaire.id}
                      />
                      <DeleteQuestionnaireButton />
                    </form>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-700">
                      已关联场次，暂不可删除
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
