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
});
