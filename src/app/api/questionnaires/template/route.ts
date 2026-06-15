import { NextResponse } from "next/server";
import { buildQuestionnaireTemplateWorkbook } from "@/features/questionnaires/template";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录后再访问。" }, { status: 401 });
  }

  const workbookBuffer = buildQuestionnaireTemplateWorkbook();

  return new NextResponse(workbookBuffer, {
    headers: {
      "Content-Disposition": `attachment; filename="questionnaire-template.xlsx"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
