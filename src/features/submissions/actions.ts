import {
  questionnaireSchema,
  type QuestionnaireInput,
  type QuestionnaireQuestion,
} from "@/features/questionnaires/schema";
import { db } from "@/lib/db";
import {
  submissionSchema,
  type SubmissionAnswer,
  type SubmissionInput,
} from "./schema";
import { applySubmissionAggregates } from "@/features/stats/aggregate";

export const SESSION_CLOSED_ERROR = "SESSION_CLOSED";
export const SESSION_NOT_FOUND_ERROR = "SESSION_NOT_FOUND";
export const INVALID_SUBMISSION_ERROR = "INVALID_SUBMISSION";

type PublicSurveySession = {
  id: string;
  slug: string;
  name: string;
  status: "ACTIVE" | "CLOSED";
  questionnaire: QuestionnaireInput;
};

function toJson<T>(value: T) {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getAllQuestions(questionnaire: QuestionnaireInput) {
  return questionnaire.sections.flatMap((section) => section.questions);
}

function getQuestionMap(questionnaire: QuestionnaireInput) {
  return new Map(
    getAllQuestions(questionnaire).map((question) => [question.key, question]),
  );
}

function getOptionLabels(question: QuestionnaireQuestion) {
  if (!("options" in question) || !question.options) {
    return [];
  }

  return question.options.map((option) =>
    typeof option === "string" ? option : option.label,
  );
}

function normalizeSingleValue(value: SubmissionAnswer | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  if (typeof value === "number") {
    return String(value);
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeMultipleValue(value: SubmissionAnswer | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const values = Array.isArray(value) ? value : [value];
  const normalized = values
    .map((entry) => String(entry).trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeRatingValue(value: SubmissionAnswer | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(INVALID_SUBMISSION_ERROR);
    }

    return value;
  }

  if (Array.isArray(value)) {
    value = value[0];
  }

  const parsed = Number(String(value).trim());

  if (!Number.isFinite(parsed)) {
    throw new Error(INVALID_SUBMISSION_ERROR);
  }

  return parsed;
}

function normalizeAnswers(
  questionnaire: QuestionnaireInput,
  input: SubmissionInput,
): SubmissionInput {
  const questionMap = getQuestionMap(questionnaire);

  for (const key of Object.keys(input.answers)) {
    if (!questionMap.has(key)) {
      throw new Error(INVALID_SUBMISSION_ERROR);
    }
  }

  const normalizedEntries = getAllQuestions(questionnaire).flatMap((question) => {
    const rawValue = input.answers[question.key];
    let normalizedValue: SubmissionAnswer | undefined;

    switch (question.type) {
      case "multiple":
        normalizedValue = normalizeMultipleValue(rawValue);
        break;
      case "rating":
        normalizedValue = normalizeRatingValue(rawValue);
        break;
      case "single":
      case "text":
        normalizedValue = normalizeSingleValue(rawValue);
        break;
      default:
        normalizedValue = undefined;
    }

    const isMissing =
      normalizedValue === undefined ||
      (Array.isArray(normalizedValue) && normalizedValue.length === 0);

    if (question.required && isMissing) {
      throw new Error(INVALID_SUBMISSION_ERROR);
    }

    if (normalizedValue === undefined) {
      return [];
    }

    if (question.type === "single") {
      const optionLabels = getOptionLabels(question);
      if (
        typeof normalizedValue !== "string" ||
        (optionLabels.length > 0 && !optionLabels.includes(normalizedValue))
      ) {
        throw new Error(INVALID_SUBMISSION_ERROR);
      }
    }

    if (question.type === "multiple") {
      const optionLabels = getOptionLabels(question);
      if (
        !Array.isArray(normalizedValue) ||
        optionLabels.length > 0 &&
        normalizedValue.some((entry) => !optionLabels.includes(entry))
      ) {
        throw new Error(INVALID_SUBMISSION_ERROR);
      }
    }

    return [[question.key, normalizedValue] as const];
  });

  return submissionSchema.parse({
    answers: Object.fromEntries(normalizedEntries),
  });
}

function calculateTotalScore(
  questionnaire: QuestionnaireInput,
  answers: SubmissionInput["answers"],
) {
  let totalScore = 0;
  let hasScore = false;

  for (const question of getAllQuestions(questionnaire)) {
    if (!("options" in question) || !question.options) {
      continue;
    }

    const value = answers[question.key];
    if (value === undefined) {
      continue;
    }

    const selectedValues = Array.isArray(value) ? value : [value];

    for (const option of question.options) {
      if (
        typeof option !== "string" &&
        selectedValues.includes(option.label)
      ) {
        totalScore += option.score;
        hasScore = true;
      }
    }
  }

  return hasScore ? totalScore : null;
}

export function buildSubmissionInput(
  questionnaire: QuestionnaireInput,
  formData: FormData,
) {
  const entries: Array<[string, SubmissionAnswer]> = [];

  for (const question of getAllQuestions(questionnaire)) {
    switch (question.type) {
      case "multiple": {
        const values = formData
          .getAll(question.key)
          .map((entry) => String(entry).trim())
          .filter(Boolean);

        if (values.length > 0) {
          entries.push([question.key, values]);
        }
        break;
      }
      case "rating": {
        const value = String(formData.get(question.key) ?? "").trim();
        if (value) {
          entries.push([question.key, Number(value)]);
        }
        break;
      }
      case "single":
      case "text": {
        const value = String(formData.get(question.key) ?? "").trim();
        if (value) {
          entries.push([question.key, value]);
        }
        break;
      }
    }
  }

  return submissionSchema.parse({
    answers: Object.fromEntries(entries),
  });
}

export async function getPublicSurveySession(slug: string): Promise<PublicSurveySession | null> {
  const session = await db.session.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      questionnaire: {
        select: {
          schemaJson: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  return {
    id: session.id,
    slug: session.slug,
    name: session.name,
    status: session.status,
    questionnaire: questionnaireSchema.parse(session.questionnaire.schemaJson),
  };
}

export async function submitSurveyResponse(
  sessionId: string,
  rawInput: unknown,
) {
  const input = submissionSchema.parse(rawInput);
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      questionnaire: {
        select: {
          schemaJson: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error(SESSION_NOT_FOUND_ERROR);
  }

  if (session.status === "CLOSED") {
    throw new Error(SESSION_CLOSED_ERROR);
  }

  const questionnaire = questionnaireSchema.parse(session.questionnaire.schemaJson);
  const normalizedInput = normalizeAnswers(questionnaire, input);
  const totalScore = calculateTotalScore(questionnaire, normalizedInput.answers);

  const submission = await db.submission.create({
    data: {
      sessionId,
      payloadJson: toJson(normalizedInput),
      totalScore,
    },
  });

  await applySubmissionAggregates(
    sessionId,
    questionnaire,
    normalizedInput.answers,
  );

  return submission;
}
