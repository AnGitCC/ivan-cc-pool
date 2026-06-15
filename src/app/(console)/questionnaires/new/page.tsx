import { redirect } from "next/navigation";
import { QuestionnaireBuilder } from "@/components/questionnaires/questionnaire-builder";
import { createQuestionnaire } from "@/features/questionnaires/actions";
import { auth } from "@/lib/auth";

export default function NewQuestionnairePage() {
  async function createQuestionnaireAction(formData: FormData) {
    "use server";

    const session = await auth();
    const ownerId = session?.user?.id;

    if (!ownerId) {
      redirect("/login");
    }

    const draftJson = formData.get("draftJson");
    if (typeof draftJson !== "string") {
      throw new Error("INVALID_DRAFT");
    }

    const questionnaire = await createQuestionnaire(ownerId, JSON.parse(draftJson));
    redirect(`/questionnaires/${questionnaire.id}/edit`);
  }

  return <QuestionnaireBuilder mode="create" submitAction={createQuestionnaireAction} />;
}
