import { questionnaireSchema } from "@/features/questionnaires/schema";
import { db } from "@/lib/db";

export type ChartDatum = {
  label: string;
  value: number;
  percentage: number;
};

export type ChartQuestionStat = {
  blockId: string;
  questionKey: string;
  title: string;
  questionType: "single" | "multiple" | "rating";
  answeredCount: number;
  averageScore: number | null;
  data: ChartDatum[];
};

export type TextQuestionStat = {
  questionKey: string;
  title: string;
  answers: string[];
};

export type SessionStatistics = {
  session: {
    id: string;
    name: string;
    status: "ACTIVE" | "CLOSED";
    publicUrl: string;
    createdAt: Date;
    closedAt: Date | null;
    questionnaireId: string;
    questionnaireTitle: string;
  };
  responseOverview: {
    submissionCount: number;
    lastSubmittedAt: Date | null;
  };
  scoreSummary: {
    submissionCount: number;
    totalScore: number;
    averageScore: number | null;
    distribution: ChartDatum[];
  };
  baseInfoQuestions: ChartQuestionStat[];
  formalQuestions: ChartQuestionStat[];
  textQuestions: TextQuestionStat[];
};

function getPayloadAnswers(payloadJson: unknown) {
  if (!payloadJson || typeof payloadJson !== "object") {
    return {};
  }

  const answers =
    "answers" in payloadJson &&
    payloadJson.answers &&
    typeof payloadJson.answers === "object"
      ? payloadJson.answers
      : {};

  return answers as Record<string, unknown>;
}

function getAnsweredValueCount(value: unknown) {
  if (value === undefined || value === null) {
    return 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? 1 : 0;
  }

  if (typeof value === "string") {
    return value.trim() ? 1 : 0;
  }

  return 1;
}

function toChartData(
  labels: string[],
  counts: Map<string, number>,
  answeredCount: number,
) {
  return labels.map((label) => {
    const value = counts.get(label) ?? 0;
    return {
      label,
      value,
      percentage: answeredCount > 0 ? value / answeredCount : 0,
    };
  });
}

function sortLabels(labels: Iterable<string>) {
  return Array.from(labels).sort((left, right) => {
    const leftAsNumber = Number(left);
    const rightAsNumber = Number(right);
    const bothNumbers =
      Number.isFinite(leftAsNumber) && Number.isFinite(rightAsNumber);

    if (bothNumbers) {
      return leftAsNumber - rightAsNumber;
    }

    return left.localeCompare(right, "zh-CN");
  });
}

export async function getSessionStatistics(
  sessionId: string,
  ownerId: string,
): Promise<SessionStatistics | null> {
  const session = await db.session.findFirst({
    where: {
      id: sessionId,
      ownerId,
    },
    select: {
      id: true,
      name: true,
      status: true,
      publicUrl: true,
      createdAt: true,
      closedAt: true,
      questionnaireId: true,
      questionnaire: {
        select: {
          title: true,
          schemaJson: true,
        },
      },
      scoreAggregates: {
        select: {
          questionKey: true,
          averageScore: true,
        },
      },
      optionAggregates: {
        select: {
          questionKey: true,
          optionKey: true,
          choiceCount: true,
        },
      },
      submissions: {
        orderBy: {
          submittedAt: "desc",
        },
        select: {
          payloadJson: true,
          totalScore: true,
          submittedAt: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const questionnaire = questionnaireSchema.parse(session.questionnaire.schemaJson);
  const scoreAggregateMap = new Map<string, number | null>(
    session.scoreAggregates.map(
      (aggregate: (typeof session.scoreAggregates)[number]) => [
        aggregate.questionKey,
        aggregate.averageScore,
      ],
    ),
  );
  const optionAggregateMap = new Map<string, Map<string, number>>();

  for (const aggregate of session.optionAggregates) {
    const questionMap =
      optionAggregateMap.get(aggregate.questionKey) ?? new Map<string, number>();
    questionMap.set(aggregate.optionKey, aggregate.choiceCount);
    optionAggregateMap.set(aggregate.questionKey, questionMap);
  }

  const submissions = session.submissions.map(
    (submission: (typeof session.submissions)[number]) => ({
      answers: getPayloadAnswers(submission.payloadJson),
      totalScore: submission.totalScore,
      submittedAt: submission.submittedAt,
    }),
  );
  type SubmissionEntry = (typeof submissions)[number];
  type ScoredSubmissionEntry = SubmissionEntry & { totalScore: number };

  const scoreEntries = submissions.filter(
    (submission: SubmissionEntry): submission is ScoredSubmissionEntry =>
      typeof submission.totalScore === "number",
  );
  const totalScore = scoreEntries.reduce(
    (sum: number, submission: ScoredSubmissionEntry) => sum + submission.totalScore,
    0,
  );
  const scoreDistributionMap = new Map<string, number>();

  for (const submission of scoreEntries) {
    const bucketLabel = String(submission.totalScore);
    scoreDistributionMap.set(
      bucketLabel,
      (scoreDistributionMap.get(bucketLabel) ?? 0) + 1,
    );
  }

  const baseInfoQuestions: ChartQuestionStat[] = [];
  const formalQuestions: ChartQuestionStat[] = [];
  const textQuestions: TextQuestionStat[] = [];

  for (const section of questionnaire.sections) {
    for (const question of section.questions) {
      const blockId = `question:${question.key}`;
      const answersByQuestion = submissions
        .map((submission: (typeof submissions)[number]) => submission.answers[question.key])
        .filter((value: unknown) => getAnsweredValueCount(value) > 0);

      if (question.type === "text") {
        textQuestions.push({
          questionKey: question.key,
          title: question.title,
          answers: answersByQuestion.map((value: unknown) => String(value).trim()),
        });
        continue;
      }

      const answeredCount = answersByQuestion.length;
      const countMap = optionAggregateMap.get(question.key) ?? new Map<string, number>();
      const optionLabels = Array.isArray(question.options)
        ? question.options.map((option: (typeof question.options)[number]) =>
            typeof option === "string" ? option : option.label,
          )
        : sortLabels(countMap.keys());

      const stat: ChartQuestionStat = {
        blockId,
        questionKey: question.key,
        title: question.title,
        questionType: question.type,
        answeredCount,
        averageScore: scoreAggregateMap.get(question.key) ?? null,
        data: toChartData(optionLabels, countMap, answeredCount),
      };

      if (section.kind === "base-info") {
        baseInfoQuestions.push(stat);
      } else {
        formalQuestions.push(stat);
      }
    }
  }

  return {
    session: {
      id: session.id,
      name: session.name,
      status: session.status,
      publicUrl: session.publicUrl,
      createdAt: session.createdAt,
      closedAt: session.closedAt,
      questionnaireId: session.questionnaireId,
      questionnaireTitle: session.questionnaire.title,
    },
    responseOverview: {
      submissionCount: submissions.length,
      lastSubmittedAt: submissions[0]?.submittedAt ?? null,
    },
    scoreSummary: {
      submissionCount: scoreEntries.length,
      totalScore,
      averageScore:
        scoreEntries.length > 0 ? totalScore / scoreEntries.length : null,
      distribution: toChartData(
        sortLabels(scoreDistributionMap.keys()),
        scoreDistributionMap,
        scoreEntries.length,
      ),
    },
    baseInfoQuestions,
    formalQuestions,
    textQuestions,
  };
}
