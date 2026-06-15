"use client";

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionnaireImportPanel } from "@/components/questionnaires/questionnaire-import-panel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("QuestionnaireImportPanel preview", () => {
  it("parses workbook via api and shows preview dialog", async () => {
    const fetchSpy = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          questionnaire: {
            title: "Excel 导入问卷",
            sections: [
              {
                kind: "base-info",
                title: "基础信息",
                questions: [
                  {
                    key: "department",
                    title: "部门",
                    type: "single",
                    required: true,
                    options: ["研发", "产品"],
                  },
                ],
              },
              {
                kind: "formal",
                title: "正式题目",
                questions: [
                  {
                    key: "course-quality",
                    title: "课程质量",
                    type: "text",
                    required: false,
                  },
                ],
              },
            ],
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });

    vi.stubGlobal("fetch", fetchSpy);

    render(<QuestionnaireImportPanel importAction={vi.fn()} />);

    const file = new File([new Uint8Array([1, 2, 3])], "demo.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.change(screen.getByLabelText("上传 Excel 文件"), {
      target: {
        files: [file],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "预览解析结果" }));

    expect(await screen.findByText("Excel 导入问卷")).toBeTruthy();
    expect(fetchSpy).toHaveBeenCalledWith("/api/questionnaires/import", expect.anything());
  });
});

