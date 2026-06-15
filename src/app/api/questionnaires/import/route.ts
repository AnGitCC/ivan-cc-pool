import { NextResponse } from "next/server";
import { parseQuestionnaireWorkbookFile } from "@/features/questionnaires/import";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授权访问。" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请上传 Excel 文件。" }, { status: 400 });
  }

  try {
    const questionnaire = parseQuestionnaireWorkbookFile(await file.arrayBuffer());

    return NextResponse.json({ questionnaire });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Excel 解析失败。";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
