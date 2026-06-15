"use client";

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionnaireBuilder } from "@/components/questionnaires/questionnaire-builder";

afterEach(() => {
  cleanup();
});

describe("QuestionnaireBuilder", () => {
  it("adds a new question into the current section", () => {
    render(<QuestionnaireBuilder mode="create" submitAction={vi.fn()} />);

    const initialTitleInputs = screen.getAllByLabelText("题目标题");

    fireEvent.click(screen.getAllByRole("button", { name: "添加题目" })[0]);

    expect(screen.getAllByLabelText("题目标题")).toHaveLength(initialTitleInputs.length + 1);
  });

  it("updates question title and type", () => {
    render(<QuestionnaireBuilder mode="create" submitAction={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "添加题目" })[0]);
    const titleInputs = screen.getAllByLabelText("题目标题");
    const typeInputs = screen.getAllByLabelText("题型");

    fireEvent.change(titleInputs[titleInputs.length - 1], { target: { value: "你的部门" } });
    fireEvent.change(typeInputs[typeInputs.length - 1], { target: { value: "single" } });

    expect(screen.getByDisplayValue("你的部门")).toBeTruthy();
    expect((typeInputs[typeInputs.length - 1] as HTMLSelectElement).value).toBe("single");
  });

  it("removes an editable question", () => {
    render(<QuestionnaireBuilder mode="create" submitAction={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "添加题目" })[0]);
    const titleInputs = screen.getAllByLabelText("题目标题");
    const deleteButtons = screen.getAllByRole("button", { name: "删除题目" });

    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    expect(screen.getAllByLabelText("题目标题")).toHaveLength(titleInputs.length - 1);
  });

  it("edits option score for a formal choice question", () => {
    render(<QuestionnaireBuilder mode="create" submitAction={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "添加题目" })[1]);

    const titleInputs = screen.getAllByLabelText("题目标题");
    const typeInputs = screen.getAllByLabelText("题型");

    fireEvent.change(titleInputs[titleInputs.length - 1], { target: { value: "课程满意度" } });
    fireEvent.change(typeInputs[typeInputs.length - 1], { target: { value: "single" } });

    const optionLabelInputs = screen.getAllByLabelText("选项 1 文案");
    const optionScoreInputs = screen.getAllByLabelText("选项 1 分值");

    fireEvent.change(optionLabelInputs[optionLabelInputs.length - 1], { target: { value: "非常满意" } });
    fireEvent.change(optionScoreInputs[optionScoreInputs.length - 1], { target: { value: "10" } });

    const draftInput = document.querySelector('input[name="draftJson"]');
    expect(draftInput).toBeTruthy();
    const parsed = JSON.parse((draftInput as HTMLInputElement).value);
    expect(parsed.sections[1].questions.at(-1).options[0]).toEqual({
      label: "非常满意",
      score: 10,
    });
  });
});
