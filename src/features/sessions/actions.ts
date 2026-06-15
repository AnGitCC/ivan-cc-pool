"use server";

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { buildSurveyUrl } from "@/lib/origins";

type TransactionClient = Omit<
  typeof db,
  "$connect" | "$disconnect" | "$on" | "$use" | "$extends"
>;

function createSessionSlug() {
  return randomUUID().replace(/-/g, "").slice(0, 10);
}

export async function createSession(
  questionnaireId: string,
  ownerId: string,
  name: string,
) {
  const trimmedName = name.trim();
  const slug = createSessionSlug();

  return db.session.create({
    data: {
      questionnaireId,
      ownerId,
      name: trimmedName,
      slug,
      publicUrl: buildSurveyUrl(slug),
    },
  });
}

export async function closeSession(sessionId: string, ownerId: string) {
  return db.session.update({
    where: {
      id: sessionId,
      ownerId,
    },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
    },
  });
}

const sessionSummarySelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  publicUrl: true,
  createdAt: true,
  closedAt: true,
  questionnaireId: true,
  questionnaire: {
    select: {
      id: true,
      title: true,
    },
  },
} as const;

export async function getDashboardSession(ownerId: string) {
  const activeSession = await db.session.findFirst({
    where: {
      ownerId,
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: sessionSummarySelect,
  });

  if (activeSession) {
    return activeSession;
  }

  return db.session.findFirst({
    where: {
      ownerId,
      status: "CLOSED",
    },
    orderBy: [
      {
        closedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: sessionSummarySelect,
  });
}

export async function listQuestionnaireSessions(
  questionnaireId: string,
  ownerId: string,
) {
  return db.session.findMany({
    where: {
      questionnaireId,
      ownerId,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
    select: sessionSummarySelect,
  });
}

export async function listOwnedSessionsForWorkbench(
  ownerId: string,
  questionnaireId: string,
) {
  return db.session.findMany({
    where: { ownerId, questionnaireId },
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      questionnaireId: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function deleteOwnedSession(sessionId: string, ownerId: string) {
  return db.$transaction(async (tx: TransactionClient) => {
    await tx.submission.deleteMany({
      where: {
        sessionId,
      },
    });
    await tx.scoreAggregate.deleteMany({
      where: {
        sessionId,
      },
    });
    await tx.optionAggregate.deleteMany({
      where: {
        sessionId,
      },
    });
    await tx.exportJob.deleteMany({
      where: {
        sessionId,
      },
    });

    const result = await tx.session.deleteMany({
      where: {
        id: sessionId,
        ownerId,
      },
    });

    if (result.count === 0) {
      throw new Error("SESSION_NOT_FOUND");
    }

    return {
      deleted: true,
    };
  });
}
