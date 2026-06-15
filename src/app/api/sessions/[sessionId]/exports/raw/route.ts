import { NextResponse } from "next/server";
import { buildRawExportFileName } from "@/features/exports/filenames";
import {
  buildRawExportRows,
  buildRawWorkbook,
} from "@/features/exports/raw-export";
import { questionnaireSchema } from "@/features/questionnaires/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授权访问。" }, { status: 401 });
  }

  const { sessionId } = await params;
  const exportSession = await db.session.findFirst({
    where: {
      id: sessionId,
      ownerId: session.user.id,
    },
    select: {
      name: true,
      questionnaire: {
        select: {
          schemaJson: true,
        },
      },
      submissions: {
        orderBy: {
          submittedAt: "asc",
        },
        select: {
          submittedAt: true,
          totalScore: true,
          payloadJson: true,
        },
      },
    },
  });

  if (!exportSession) {
    return NextResponse.json({ error: "场次不存在。" }, { status: 404 });
  }

  const questionnaire = questionnaireSchema.parse(exportSession.questionnaire.schemaJson);
  const rows = buildRawExportRows(questionnaire, exportSession.submissions);
  const workbookBuffer = buildRawWorkbook(rows);

  return new NextResponse(workbookBuffer, {
    headers: {
      "Content-Disposition": `attachment; filename="${buildRawExportFileName(exportSession.name)}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
