"use server";

import { db } from "@/lib/db";
import { questionnaireSchema, type QuestionnaireInput } from "@/features/questionnaires/schema";

function toSchemaJson(input: QuestionnaireInput) {
  return JSON.parse(JSON.stringify(input));
}

export async function createQuestionnaire(ownerId: string, rawInput: unknown) {
  const input = questionnaireSchema.parse(rawInput);

  return db.questionnaire.create({
    data: {
      ownerId,
      title: input.title,
      description: input.description,
      schemaJson: toSchemaJson(input),
    },
  });
}

export async function updateQuestionnaire(
  questionnaireId: string,
  ownerId: string,
  rawInput: unknown,
) {
  const input = questionnaireSchema.parse(rawInput);

  return db.questionnaire.update({
    where: {
      id: questionnaireId,
      ownerId,
    },
    data: {
      title: input.title,
      description: input.description,
      schemaJson: toSchemaJson(input),
    },
  });
}

export async function listOwnedQuestionnaires(ownerId: string) {
  return db.questionnaire.findMany({
    where: {
      ownerId,
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          sessions: true,
        },
      },
    },
  });
}

export async function deleteOwnedQuestionnaire(questionnaireId: string, ownerId: string) {
  const questionnaire = await db.questionnaire.findFirst({
    where: {
      id: questionnaireId,
      ownerId,
    },
    select: {
      id: true,
      _count: {
        select: {
          sessions: true,
        },
      },
    },
  });

  if (!questionnaire) {
    throw new Error("QUESTIONNAIRE_NOT_FOUND");
  }

  if (questionnaire._count.sessions > 0) {
    throw new Error("QUESTIONNAIRE_HAS_SESSIONS");
  }

  const result = await db.questionnaire.deleteMany({
    where: {
      id: questionnaireId,
      ownerId,
    },
  });

  if (result.count === 0) {
    throw new Error("QUESTIONNAIRE_NOT_FOUND");
  }

  return {
    deleted: true,
  };
}

export async function getOwnedQuestionnaire(questionnaireId: string, ownerId: string) {
  return db.questionnaire.findFirst({
    where: {
      id: questionnaireId,
      ownerId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      schemaJson: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
