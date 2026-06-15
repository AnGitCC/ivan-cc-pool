"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  optionSeparator,
  questionnaireTypeLabels,
  requiredFlagLabels,
  templateExampleRows,
  templateHeader,
} from "@/features/questionnaires/template";
import { ImportPreviewDialog } from "@/components/questionnaires/import-preview-dialog";
import type { QuestionnaireInput } from "@/features/questionnaires/schema";

type QuestionnaireImportPanelProps = {
  importAction: (formData: FormData) => void | Promise<void>;
};

function ImportSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "解析中..." : "上传 Excel 并生成问卷"}
    </button>
  );
}

export function QuestionnaireImportPanel({
  importAction,
}: QuestionnaireImportPanelProps) {
  const supportedTypesText = Object.values(questionnaireTypeLabels).join("、");
  const requiredFlagsText = `${requiredFlagLabels.required} / ${requiredFlagLabels.optional}`;
  const optionExampleText = `研发${optionSeparator}产品${optionSeparator}运营`;
  const scoreExampleText = `5${optionSeparator}4${optionSeparator}3`;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewQuestionnaire, setPreviewQuestionnaire] =
    useState<QuestionnaireInput | null>(null);

  async function handlePreview() {
    if (!selectedFile || previewLoading) {
      return;
    }

    setPreviewError("");
    setPreviewQuestionnaire(null);
    setPreviewLoading(true);
    setPreviewOpen(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch("/api/questionnaires/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        questionnaire?: QuestionnaireInput;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "预览解析失败。");
      }

      setPreviewQuestionnaire(payload.questionnaire ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "预览解析失败。";
      setPreviewError(message);
      setPreviewQuestionnaire(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-600">
            Excel 导入
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-neutral-950">
            先按模板填写，再上传解析成问卷
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            推荐先下载模板示例。模板里每一行代表一个字段或题目，系统会根据“所属分组”“题型”“选项列表”“选项分值”自动生成问卷结构。
          </p>
          <div className="mt-4 grid gap-3 text-sm text-neutral-600 md:grid-cols-2">
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="font-medium text-neutral-900">基础信息</p>
              <p className="mt-2">
                只做信息采集，不计入总分。例如部门、岗位、区域。
              </p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="font-medium text-neutral-900">正式题目</p>
              <p className="mt-2">
                可填写选项与分值。分值留空时，系统按频次统计而不是计分。
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-neutral-600">
            <li>列顺序固定为：所属分组、题目标题、题型、是否必填、选项列表、选项分值</li>
            <li>题型只支持中文：`{supportedTypesText}`</li>
            <li>是否必填只支持：`{requiredFlagsText}`</li>
            <li>选择题的多个选项使用 `{optionSeparator}` 分隔，例如 `{optionExampleText}`</li>
            <li>选项分值与选项一一对应，例如 `{scoreExampleText}`</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <a
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
            href="/api/questionnaires/template"
          >
            下载 Excel 模板
          </a>
          <p className="max-w-xs text-xs leading-5 text-neutral-500">
            模板中已内置全部 4 种题型示例，下载后直接替换内容即可。
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr>
                {templateHeader.map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-4 py-3 text-left font-medium text-neutral-700"
                    scope="col"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {templateExampleRows.map((row, index) => (
                <tr key={`${row[0]}-${row[1]}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${templateHeader[cellIndex]}-${index}`}
                      className="whitespace-nowrap px-4 py-3 text-neutral-600"
                    >
                      {cell || "留空"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form action={importAction} className="mt-6 flex flex-col gap-4 rounded-2xl bg-neutral-50 p-4 md:flex-row md:items-end md:justify-between">
        <label className="block flex-1">
          <span className="mb-2 block text-sm font-medium text-neutral-700">
            上传 Excel 文件
          </span>
          <input
            accept=".xlsx,.xls"
            className="block w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-700 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
            name="file"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
            }}
            required
            type="file"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!selectedFile || previewLoading}
            onClick={handlePreview}
            type="button"
          >
            {previewLoading ? "预览中..." : "预览解析结果"}
          </button>
          <ImportSubmitButton />
        </div>
      </form>

      <ImportPreviewDialog
        error={previewError}
        loading={previewLoading}
        onOpenChange={setPreviewOpen}
        open={previewOpen}
        questionnaire={previewQuestionnaire}
      />
    </section>
  );
}
