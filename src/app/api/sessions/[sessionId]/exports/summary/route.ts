import { NextResponse } from "next/server";
import { buildSummaryExportFileName } from "@/features/exports/filenames";
import {
  buildSummaryRows,
  buildSummaryWorkbook,
} from "@/features/exports/summary-export";
import { getSessionStatistics } from "@/features/stats/query";
import { auth } from "@/lib/auth";

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
  const statistics = await getSessionStatistics(sessionId, session.user.id);

  if (!statistics) {
    return NextResponse.json({ error: "场次不存在。" }, { status: 404 });
  }

  const workbookBuffer = buildSummaryWorkbook(buildSummaryRows(statistics));

  return new NextResponse(workbookBuffer, {
    headers: {
      "Content-Disposition": `attachment; filename="${buildSummaryExportFileName(statistics.session.name)}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
