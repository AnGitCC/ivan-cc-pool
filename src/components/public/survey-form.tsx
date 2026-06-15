import Link from "next/link";
import type { QuestionnaireInput, QuestionnaireQuestion } from "@/features/questionnaires/schema";

type SurveyFormProps = {
  slug: string;
  sessionName: string;
  questionnaire: QuestionnaireInput;
  submitted: boolean;
  hasError: boolean;
  submitAction: (formData: FormData) => void | Promise<void>;
};

function getOptionLabel(option: string | { label: string; score: number }) {
  return typeof option === "string" ? option : option.label;
}

function ChoiceOptionGroup({
  question,
  inputType,
}: {
  question: Extract<QuestionnaireQuestion, { type: "single" | "multiple" }>;
  inputType: "radio" | "checkbox";
}) {
  return (
    <div
      className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]"
      data-testid="survey-choice-options"
    >
      {question.options.map((option) => {
        const value = getOptionLabel(option);

        return (
          <label
            className="flex min-h-12 w-full cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition hover:border-emerald-300"
            data-testid="survey-choice-option"
            key={`${question.key}-${value}`}
          >
            <input
              className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
              name={question.key}
              required={question.required && inputType === "radio"}
              type={inputType}
              value={value}
            />
            <span className="min-w-0 break-words text-sm text-neutral-700">{value}</span>
          </label>
        );
      })}
    </div>
  );
}

function QuestionField({ question }: { question: QuestionnaireQuestion }) {
  const requiredMark = question.required ? (
    <span className="text-sm font-medium text-emerald-600">必填</span>
  ) : (
    <span className="text-sm text-neutral-400">选填</span>
  );

  if (question.type === "single" && question.options) {
    return (
      <div className="space-y-4" data-testid={`survey-question-${question.key}`}>
        <div className="flex items-start justify-between gap-4">
          <label className="text-base font-medium text-neutral-950">
            {question.title}
          </label>
          {requiredMark}
        </div>
        <ChoiceOptionGroup inputType="radio" question={question} />
      </div>
    );
  }

  if (question.type === "multiple" && question.options) {
    return (
      <div className="space-y-4" data-testid={`survey-question-${question.key}`}>
        <div className="flex items-start justify-between gap-4">
          <label className="text-base font-medium text-neutral-950">
            {question.title}
          </label>
          {requiredMark}
        </div>
        <ChoiceOptionGroup inputType="checkbox" question={question} />
      </div>
    );
  }

  if (question.type === "rating") {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <label
            className="text-base font-medium text-neutral-950"
            htmlFor={question.key}
          >
            {question.title}
          </label>
          {requiredMark}
        </div>
        <input
          className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
          id={question.key}
          max={10}
          min={1}
          name={question.key}
          placeholder="1-10 分"
          required={question.required}
          step={1}
          type="number"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <label
          className="text-base font-medium text-neutral-950"
          htmlFor={question.key}
        >
          {question.title}
        </label>
        {requiredMark}
      </div>
      <textarea
        className="min-h-32 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
        id={question.key}
        name={question.key}
        placeholder="请输入回答"
        required={question.required}
      />
    </div>
  );
}

export function SurveyForm({
  slug,
  sessionName,
  questionnaire,
  submitted,
  hasError,
  submitAction,
}: SurveyFormProps) {
  if (submitted) {
    return (
      <section className="rounded-[32px] border border-emerald-200 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">
          Submitted
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          感谢提交
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
          你的匿名反馈已成功提交到“{sessionName}”。如需重新填写，可重新打开链接再次提交一份新答卷。
        </p>
        <Link
          className="mt-6 inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
          href={`/s/${slug}`}
        >
          返回填写页
        </Link>
      </section>
    );
  }

  return (
    <form action={submitAction} className="space-y-8">
      {hasError ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          提交失败，请检查必填项和答案格式后重试。如果场次刚被关闭，页面会自动跳转到结束页。
        </div>
      ) : null}

      {questionnaire.sections.map((section) => (
        <section
          key={section.kind}
          className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                {section.kind === "base-info" ? "Base Info" : "Formal Questions"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                {section.title}
              </h2>
            </div>
            <p className="text-sm text-neutral-500">
              共 {section.questions.length} 题
            </p>
          </div>

          <div className="mt-6 space-y-6">
            {section.questions.map((question) => (
              <div
                key={question.key}
                className="rounded-[28px] bg-neutral-50 p-5"
              >
                <QuestionField question={question} />
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex flex-col gap-4 rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">确认提交匿名反馈</h2>
          <p className="mt-2 text-sm text-neutral-600">
            提交后将直接写入当前场次，不采集登录信息或身份信息。
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-600"
          type="submit"
        >
          提交问卷
        </button>
      </div>
    </form>
  );
}
