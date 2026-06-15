"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createEmptyQuestionnaireDraft,
  type QuestionnaireDraft,
  type QuestionnaireQuestion,
} from "@/features/questionnaires/schema";

type QuestionnaireBuilderProps = {
  mode: "create" | "edit";
  questionnaireId?: string;
  initialValue?: Partial<QuestionnaireDraft>;
  submitAction: (formData: FormData) => void | Promise<void>;
};

function SaveQuestionnaireButton({
  mode,
  disabled,
}: {
  mode: "create" | "edit";
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-70"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "保存中..." : mode === "create" ? "保存问卷" : "保存修改"}
    </button>
  );
}

function getQuestionTypeLabel(type: QuestionnaireQuestion["type"]) {
  switch (type) {
    case "single":
      return "单选题";
    case "multiple":
      return "多选题";
    case "text":
      return "文本题";
    case "rating":
      return "评分题";
    default:
      return type;
  }
}

const QUESTION_TYPE_OPTIONS = [
  { value: "single", label: "单选题" },
  { value: "multiple", label: "多选题" },
  { value: "text", label: "文本题" },
  { value: "rating", label: "评分题" },
] as const;

function buildQuestionKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `q_${crypto.randomUUID()}`;
  }

  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEditableQuestion(
  sectionKind: QuestionnaireDraft["sections"][number]["kind"],
): QuestionnaireQuestion {
  if (sectionKind === "base-info") {
    return {
      key: buildQuestionKey(),
      title: "",
      type: "text",
      required: false,
    };
  }

  return {
    key: buildQuestionKey(),
    title: "",
    type: "single",
    required: false,
    options: [
      { label: "选项 1", score: 0 },
      { label: "选项 2", score: 0 },
    ],
  };
}

function normalizeQuestionType(
  sectionKind: QuestionnaireDraft["sections"][number]["kind"],
  question: QuestionnaireQuestion,
  nextType: QuestionnaireQuestion["type"],
): QuestionnaireQuestion {
  if (nextType === "single" || nextType === "multiple") {
    const defaultOptions =
      sectionKind === "formal"
        ? [
            { label: "选项 1", score: 0 },
            { label: "选项 2", score: 0 },
          ]
        : ["选项 1", "选项 2"];

    const existingOptions =
      "options" in question && Array.isArray(question.options) && question.options.length > 0
        ? question.options
        : defaultOptions;

    return {
      ...question,
      type: nextType,
      options:
        sectionKind === "formal"
          ? existingOptions.map((option) =>
              typeof option === "string" ? { label: option, score: 0 } : option,
            )
          : existingOptions,
    };
  }

  return {
    key: question.key,
    title: question.title,
    required: question.required,
    type: nextType,
  };
}

export function QuestionnaireBuilder({
  mode,
  questionnaireId,
  initialValue,
  submitAction,
}: QuestionnaireBuilderProps) {
  const initialDraft = useMemo(() => {
    const fallback = createEmptyQuestionnaireDraft();

    const sections = (initialValue?.sections ?? fallback.sections).map((section) => {
      if (section.kind !== "formal") {
        return section;
      }

      return {
        ...section,
        questions: section.questions.map((question) => {
          if (question.type !== "single" && question.type !== "multiple") {
            return question;
          }

          return {
            ...question,
            options: question.options.map((option) =>
              typeof option === "string" ? { label: option, score: 0 } : option,
            ),
          };
        }),
      };
    });

    return {
      title: initialValue?.title ?? fallback.title,
      description: initialValue?.description ?? fallback.description,
      sections,
    };
  }, [initialValue]);

  const [draft, setDraft] = useState(initialDraft);
  const isReadyToSubmit =
    draft.title.trim().length > 0 &&
    draft.sections.every(
      (section) =>
        section.questions.length > 0 &&
        section.questions.every((question) => question.title.trim().length > 0),
    );

  function addQuestion(sectionIndex: number) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index !== sectionIndex
          ? section
          : {
              ...section,
              questions: [...section.questions, createEditableQuestion(section.kind)],
            },
      ),
    }));
  }

  function updateQuestion(
    sectionIndex: number,
    questionIndex: number,
    updater: (question: QuestionnaireQuestion) => QuestionnaireQuestion,
  ) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIdx) =>
        sectionIdx !== sectionIndex
          ? section
          : {
              ...section,
              questions: section.questions.map((question, currentQuestionIndex) =>
                currentQuestionIndex !== questionIndex ? question : updater(question),
              ),
            },
      ),
    }));
  }

  function removeQuestion(sectionIndex: number, questionIndex: number) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index !== sectionIndex
          ? section
          : {
              ...section,
              questions: section.questions.filter(
                (_question, currentQuestionIndex) => currentQuestionIndex !== questionIndex,
              ),
            },
      ),
    }));
  }

  return (
    <form action={submitAction} className="space-y-8">
      <input name="draftJson" type="hidden" value={JSON.stringify(draft)} />
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">
          {mode === "create" ? "Manual Builder" : "Questionnaire Editor"}
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
              {mode === "create" ? "手工新建问卷" : "编辑问卷"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              当前版本支持手工维护题目标题、题型和删除操作，可直接完成最小可用的问卷编辑与保存。
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
              href="/questionnaires"
            >
              返回列表
            </Link>
            <SaveQuestionnaireButton disabled={!isReadyToSubmit} mode={mode} />
          </div>
        </div>
        {questionnaireId ? (
          <p className="text-xs text-neutral-500">问卷 ID: {questionnaireId}</p>
        ) : null}
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-neutral-700">
                  问卷标题
                </span>
                <input
                  className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="例如：培训反馈问卷"
                  type="text"
                  value={draft.title}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-neutral-700">
                  问卷描述
                </span>
                <input
                  className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="例如：用于课程结束后的匿名反馈"
                  type="text"
                  value={draft.description}
                />
              </label>
            </div>
          </section>

          {draft.sections.map((section, sectionIndex) => (
            <section
              key={`${section.kind}-${sectionIndex}`}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                    {section.kind === "base-info" ? "Base Info" : "Formal Questions"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-neutral-950">
                    {section.title}
                  </h2>
                </div>
                <button
                  className="rounded-full border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
                  onClick={() => addQuestion(sectionIndex)}
                  type="button"
                >
                  添加题目
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {section.questions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-sm text-neutral-500">
                    该分组题目编辑器将在下一步补全，这里先保留结构位置和新增入口。
                  </div>
                ) : (
                  section.questions.map((question, questionIndex) => (
                    <article
                      key={`${question.key}-${questionIndex}`}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-4">
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-neutral-700">
                              题目标题
                            </span>
                            <input
                              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                              onChange={(event) =>
                                updateQuestion(sectionIndex, questionIndex, (currentQuestion) => ({
                                  ...currentQuestion,
                                  title: event.target.value,
                                }))
                              }
                              placeholder="例如：你的部门"
                              type="text"
                              value={question.title}
                            />
                          </label>

                          <div className="grid gap-4 md:grid-cols-[minmax(0,220px)_1fr]">
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-neutral-700">
                                题型
                              </span>
                              <select
                                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                                onChange={(event) =>
                                  updateQuestion(sectionIndex, questionIndex, (currentQuestion) =>
                                    normalizeQuestionType(
                                      section.kind,
                                      currentQuestion,
                                      event.target.value as QuestionnaireQuestion["type"],
                                    ),
                                  )
                                }
                                value={question.type}
                              >
                                {QUESTION_TYPE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.value}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="flex items-center gap-3 pt-8 text-sm text-neutral-600">
                              <input
                                checked={question.required}
                                className="h-4 w-4 rounded border-neutral-300 accent-emerald-500"
                                onChange={(event) =>
                                  updateQuestion(sectionIndex, questionIndex, (currentQuestion) => ({
                                    ...currentQuestion,
                                    required: event.target.checked,
                                  }))
                                }
                                type="checkbox"
                              />
                              设为必填
                            </label>
                          </div>

                          <p className="text-sm text-neutral-500">
                            当前题型：{getQuestionTypeLabel(question.type)}
                          </p>

                          {section.kind === "formal" &&
                          (question.type === "single" || question.type === "multiple") ? (
                            <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
                              <p className="text-sm font-medium text-neutral-700">选项与分值</p>
                              <div className="space-y-3">
                                {question.options.map((option, optionIndex) => {
                                  const normalizedOption =
                                    typeof option === "string" ? { label: option, score: 0 } : option;
                                  const optionLabel = normalizedOption.label;
                                  const optionScore = String(normalizedOption.score);

                                  return (
                                    <div
                                      className="flex flex-col gap-3 md:flex-row md:items-end"
                                      key={`${question.key}-option-${optionIndex}`}
                                    >
                                      <label className="block flex-1">
                                        <span className="mb-2 block text-sm font-medium text-neutral-700">
                                          选项 {optionIndex + 1} 文案
                                        </span>
                                        <input
                                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                                          onChange={(event) =>
                                            updateQuestion(sectionIndex, questionIndex, (currentQuestion) => {
                                              if (
                                                currentQuestion.type !== "single" &&
                                                currentQuestion.type !== "multiple"
                                              ) {
                                                return currentQuestion;
                                              }

                                              return {
                                                ...currentQuestion,
                                                options: currentQuestion.options.map((entry, index) => {
                                                  if (index !== optionIndex) {
                                                    return entry;
                                                  }

                                                  const currentEntry =
                                                    typeof entry === "string"
                                                      ? { label: entry, score: 0 }
                                                      : entry;
                                                  return {
                                                    ...currentEntry,
                                                    label: event.target.value,
                                                  };
                                                }),
                                              };
                                            })
                                          }
                                          type="text"
                                          value={optionLabel}
                                        />
                                      </label>

                                      <label className="block w-full md:w-32">
                                        <span className="mb-2 block text-sm font-medium text-neutral-700">
                                          选项 {optionIndex + 1} 分值
                                        </span>
                                        <input
                                          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                                          onChange={(event) =>
                                            updateQuestion(sectionIndex, questionIndex, (currentQuestion) => {
                                              if (
                                                currentQuestion.type !== "single" &&
                                                currentQuestion.type !== "multiple"
                                              ) {
                                                return currentQuestion;
                                              }

                                              const parsedScore = Number(event.target.value);

                                              return {
                                                ...currentQuestion,
                                                options: currentQuestion.options.map((entry, index) => {
                                                  if (index !== optionIndex) {
                                                    return entry;
                                                  }

                                                  const currentEntry =
                                                    typeof entry === "string"
                                                      ? { label: entry, score: 0 }
                                                      : entry;
                                                  return {
                                                    ...currentEntry,
                                                    score: Number.isFinite(parsedScore) ? parsedScore : 0,
                                                  };
                                                }),
                                              };
                                            })
                                          }
                                          step={1}
                                          type="number"
                                          value={optionScore}
                                        />
                                      </label>

                                      <button
                                        className="inline-flex items-center justify-center rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={question.options.length <= 1}
                                        onClick={() =>
                                          updateQuestion(sectionIndex, questionIndex, (currentQuestion) => {
                                            if (
                                              currentQuestion.type !== "single" &&
                                              currentQuestion.type !== "multiple"
                                            ) {
                                              return currentQuestion;
                                            }

                                            if (currentQuestion.options.length <= 1) {
                                              return currentQuestion;
                                            }

                                            return {
                                              ...currentQuestion,
                                              options: currentQuestion.options.filter(
                                                (_entry, index) => index !== optionIndex,
                                              ),
                                            };
                                          })
                                        }
                                        type="button"
                                      >
                                        删除
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              <button
                                className="inline-flex items-center justify-center rounded-full border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
                                onClick={() =>
                                  updateQuestion(sectionIndex, questionIndex, (currentQuestion) => {
                                    if (
                                      currentQuestion.type !== "single" &&
                                      currentQuestion.type !== "multiple"
                                    ) {
                                      return currentQuestion;
                                    }

                                    const nextIndex = currentQuestion.options.length + 1;

                                    return {
                                      ...currentQuestion,
                                      options: [
                                        ...currentQuestion.options.map((entry) =>
                                          typeof entry === "string" ? { label: entry, score: 0 } : entry,
                                        ),
                                        { label: `选项 ${nextIndex}`, score: 0 },
                                      ],
                                    };
                                  })
                                }
                                type="button"
                              >
                                新增选项
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <button
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                          onClick={() => removeQuestion(sectionIndex, questionIndex)}
                          type="button"
                        >
                          删除题目
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>

        <aside className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-600">Builder Status</p>
          <h2 className="mt-3 text-xl font-semibold text-neutral-950">当前骨架能力</h2>
          <ul className="mt-4 space-y-3 text-sm text-neutral-600">
            <li>支持问卷标题和描述草稿编辑</li>
            <li>支持在基础信息和正式题目分组中添加题目</li>
            <li>支持手工编辑题目标题、题型和必填状态</li>
            <li>支持删除不需要的题目</li>
            <li>固定展示“基础信息 / 正式题目”双分组</li>
            <li>编辑模式可回显已有问卷标题、描述和题目内容</li>
            <li>保存已接线，后续可继续增强选项编辑和 Excel 导入</li>
          </ul>
        </aside>
      </div>
    </form>
  );
}
