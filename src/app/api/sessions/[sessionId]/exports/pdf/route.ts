import { NextResponse } from "next/server";
import { buildPdfExportFileName } from "@/features/exports/filenames";
import { buildPdfReport } from "@/features/exports/pdf-export";
import { getDashboardPreference } from "@/features/stats/preferences";
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

  const preference = await getDashboardPreference(session.user.id);
  const pdfBuffer = buildPdfReport(statistics, preference);

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Disposition": `attachment; filename="${buildPdfExportFileName(statistics.session.name)}"`,
      "Content-Type": "application/pdf",
    },
  });
}
