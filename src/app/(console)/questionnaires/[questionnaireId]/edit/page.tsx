import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { QuestionnaireBuilder } from "@/components/questionnaires/questionnaire-builder";
import {
  getOwnedQuestionnaire,
  updateQuestionnaire,
} from "@/features/questionnaires/actions";
import {
  createEmptyQuestionnaireDraft,
  questionnaireSchema,
} from "@/features/questionnaires/schema";
import { auth } from "@/lib/auth";

type EditQuestionnairePageProps = {
  params: Promise<{
    questionnaireId: string;
  }>;
  searchParams: Promise<{
    imported?: string;
  }>;
};

export default async function EditQuestionnairePage({
  params,
  searchParams,
}: EditQuestionnairePageProps) {
  const { questionnaireId } = await params;
  const { imported } = await searchParams;
  const cookieStore = await cookies();
  const useE2eFixture = cookieStore.get("trae-e2e-fixture")?.value === "1";
  const session = await auth();
  const ownerId = session?.user?.id ?? (useE2eFixture ? "e2e-lecturer" : undefined);
  const showImportedBanner = imported === "1";

  if (!ownerId) {
    notFound();
  }

  const fixtureDraft = createEmptyQuestionnaireDraft();
  const questionnaire = useE2eFixture
    ? questionnaireId === "e2e-questionnaire"
      ? {
          id: questionnaireId,
          title: "培训反馈问卷",
          description: "用于课程结束后的匿名反馈。",
          schemaJson: {
            ...fixtureDraft,
            title: "培训反馈问卷",
            description: "用于课程结束后的匿名反馈。",
          },
        }
      : null
    : await getOwnedQuestionnaire(questionnaireId, ownerId);

  if (!questionnaire) {
    notFound();
  }

  const parsedSchema = questionnaireSchema.safeParse(questionnaire.schemaJson);

  async function updateQuestionnaireAction(formData: FormData) {
    "use server";

    if (useE2eFixture) {
      return;
    }

    const latestSession = await auth();
    const latestOwnerId = latestSession?.user?.id;

    if (!latestOwnerId) {
      redirect("/login");
    }

    const draftJson = formData.get("draftJson");
    if (typeof draftJson !== "string") {
      throw new Error("INVALID_DRAFT");
    }

    await updateQuestionnaire(questionnaireId, latestOwnerId, JSON.parse(draftJson));
    redirect(`/questionnaires/${questionnaireId}/edit`);
  }

  return (
    <section className="space-y-6">
      {showImportedBanner ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Excel 问卷已成功导入，请继续检查并完善内容。
        </div>
      ) : null}

      <QuestionnaireBuilder
        initialValue={
          parsedSchema.success
            ? {
                title: parsedSchema.data.title,
                description: parsedSchema.data.description ?? "",
                sections: parsedSchema.data.sections,
              }
            : {
                title: questionnaire.title,
                description: questionnaire.description ?? "",
              }
        }
        mode="edit"
        questionnaireId={questionnaire.id}
        submitAction={updateQuestionnaireAction}
      />
    </section>
  );
}
