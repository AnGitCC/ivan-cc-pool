import { NextResponse } from "next/server";
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
    select: { id: true },
  });

  if (!exportSession) {
    return NextResponse.json({ error: "场次不存在。" }, { status: 404 });
  }

  const jobs = await db.exportJob.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      status: true,
      fileUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ jobs });
}

