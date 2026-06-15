"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { QuestionnaireInput } from "@/features/questionnaires/schema";

type ImportPreviewDialogProps = {
  error: string;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  questionnaire: QuestionnaireInput | null;
};

function getQuestionLabel(question: QuestionnaireInput["sections"][number]["questions"][number]) {
  if (question.type === "single") {
    return "单选题";
  }
  if (question.type === "multiple") {
    return "多选题";
  }
  if (question.type === "rating") {
    return "打分题";
  }
  return "文本题";
}

export function ImportPreviewDialog({
  error,
  loading,
  onOpenChange,
  open,
  questionnaire,
}: ImportPreviewDialogProps) {
  const sectionCount = questionnaire?.sections.length ?? 0;
  const questionCount =
    questionnaire?.sections.reduce((total, section) => total + section.questions.length, 0) ??
    0;

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-[32px] bg-white p-8 shadow-2xl outline-none">
          <div className="flex items-start justify-between gap-6">
            <div>
              <Dialog.Title className="text-2xl font-semibold tracking-tight text-neutral-950">
                预览解析结果
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-neutral-600">
                确认问卷结构无误后，再点击“上传 Excel 并生成问卷”。
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="关闭预览弹窗"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-lg text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-900"
                type="button"
              >
                ×
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-8 space-y-4">
            {loading ? (
              <div className="rounded-[28px] bg-neutral-50 px-5 py-6 text-sm text-neutral-600">
                解析中...
              </div>
            ) : error ? (
              <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700">
                {error}
              </div>
            ) : questionnaire ? (
              <>
                <div className="rounded-[28px] bg-neutral-50 px-5 py-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                    Questionnaire Overview
                  </p>
                  <p className="mt-3 text-lg font-semibold text-neutral-950">
                    {questionnaire.title}
                  </p>
                  <p className="mt-2 text-sm text-neutral-600">
                    共 {sectionCount} 个分组，{questionCount} 题
                  </p>
                </div>

                <div className="grid gap-4">
                  {questionnaire.sections.map((section) => (
                    <section
                      className="rounded-[28px] border border-neutral-200 bg-white px-5 py-4"
                      key={`${section.kind}-${section.title}`}
                    >
                      <h3 className="text-sm font-semibold text-neutral-950">
                        {section.title}
                      </h3>
                      <div className="mt-3 grid gap-2">
                        {section.questions.map((question) => (
                          <div
                            className="flex flex-col gap-1 rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
                            key={question.key}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-neutral-950">
                                {question.title}
                              </span>
                              <span className="text-xs text-neutral-500">
                                {getQuestionLabel(question)}
                                {question.required ? " · 必填" : " · 选填"}
                              </span>
                            </div>
                            {"options" in question && Array.isArray(question.options) ? (
                              <span className="text-xs text-neutral-500">
                                选项数：{question.options.length}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-[28px] bg-neutral-50 px-5 py-6 text-sm text-neutral-600">
                暂无预览内容
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

