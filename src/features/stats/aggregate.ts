import type {
  QuestionnaireInput,
  QuestionnaireQuestion,
} from "@/features/questionnaires/schema";
import type { SubmissionInput } from "@/features/submissions/schema";

type OptionDefinition = NonNullable<QuestionnaireQuestion["options"]>;

type ScoreUpdate = {
  totalScore: number;
  submissionCount: number;
};

export type SummarizeAnswersResult = {
  optionCounts: Record<string, number>;
  questionScores: Record<string, ScoreUpdate>;
  totalScore: number;
};

function normalizeAnswerValues(value: string | string[] | number) {
  return (Array.isArray(value) ? value : [value]).map((entry) => String(entry));
}

function getAllQuestions(questionnaire: QuestionnaireInput) {
  return questionnaire.sections.flatMap((section) => section.questions);
}

export function buildQuestionOptionMap(questionnaire: QuestionnaireInput) {
  return Object.fromEntries(
    getAllQuestions(questionnaire)
      .filter((question) => Array.isArray(question.options))
      .map((question) => [question.key, question.options as OptionDefinition]),
  );
}

export function summarizeAnswers(
  optionMap: Record<string, OptionDefinition>,
  answers: SubmissionInput["answers"],
): SummarizeAnswersResult {
  const optionCounts: Record<string, number> = {};
  const questionScores: Record<string, ScoreUpdate> = {};
  let totalScore = 0;

  for (const [questionKey, value] of Object.entries(answers)) {
    const normalizedValues = normalizeAnswerValues(value);

    for (const normalizedValue of normalizedValues) {
      const counterKey = `${questionKey}:${normalizedValue}`;
      optionCounts[counterKey] = (optionCounts[counterKey] ?? 0) + 1;
    }

    const options = optionMap[questionKey];
    if (!options) {
      continue;
    }

    let questionScore = 0;
    let matchedScoredOption = false;

    for (const option of options) {
      if (
        typeof option !== "string" &&
        normalizedValues.includes(option.label)
      ) {
        questionScore += option.score;
        matchedScoredOption = true;
      }
    }

    if (!matchedScoredOption) {
      continue;
    }

    totalScore += questionScore;
    questionScores[questionKey] = {
      totalScore: questionScore,
      submissionCount: 1,
    };
  }

  return {
    optionCounts,
    questionScores,
    totalScore,
  };
}

async function updateScoreAggregate(
  sessionId: string,
  questionKey: string,
  update: ScoreUpdate,
) {
  const { db } = await import("@/lib/db");
  const existingAggregate = await db.scoreAggregate.findFirst({
    where: {
      sessionId,
      questionKey,
    },
  });

  if (!existingAggregate) {
    return db.scoreAggregate.create({
      data: {
        sessionId,
        questionKey,
        totalScore: update.totalScore,
        submissionCount: update.submissionCount,
        averageScore: update.totalScore / update.submissionCount,
      },
    });
  }

  const totalScore = existingAggregate.totalScore + update.totalScore;
  const submissionCount =
    existingAggregate.submissionCount + update.submissionCount;

  return db.scoreAggregate.update({
    where: {
      id: existingAggregate.id,
    },
    data: {
      totalScore,
      submissionCount,
      averageScore: totalScore / submissionCount,
    },
  });
}

async function updateOptionAggregate(
  sessionId: string,
  questionKey: string,
  optionKey: string,
  increment: number,
) {
  const { db } = await import("@/lib/db");
  const existingAggregate = await db.optionAggregate.findFirst({
    where: {
      sessionId,
      questionKey,
      optionKey,
    },
  });

  if (!existingAggregate) {
    return db.optionAggregate.create({
      data: {
        sessionId,
        questionKey,
        optionKey,
        choiceCount: increment,
      },
    });
  }

  return db.optionAggregate.update({
    where: {
      id: existingAggregate.id,
    },
    data: {
      choiceCount: existingAggregate.choiceCount + increment,
    },
  });
}

export async function applySubmissionAggregates(
  sessionId: string,
  questionnaire: QuestionnaireInput,
  answers: SubmissionInput["answers"],
) {
  const summary = summarizeAnswers(buildQuestionOptionMap(questionnaire), answers);

  for (const [questionKey, scoreUpdate] of Object.entries(summary.questionScores)) {
    await updateScoreAggregate(sessionId, questionKey, scoreUpdate);
  }

  for (const [counterKey, count] of Object.entries(summary.optionCounts)) {
    const separatorIndex = counterKey.indexOf(":");
    const questionKey = counterKey.slice(0, separatorIndex);
    const optionKey = counterKey.slice(separatorIndex + 1);

    await updateOptionAggregate(sessionId, questionKey, optionKey, count);
  }

  return summary;
}
