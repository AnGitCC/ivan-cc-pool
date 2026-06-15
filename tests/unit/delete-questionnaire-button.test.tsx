"use client";

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteQuestionnaireButton } from "@/components/questionnaires/delete-questionnaire-button";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DeleteQuestionnaireButton", () => {
  it("renders as disabled in the server HTML before hydration", () => {
    const html = renderToStaticMarkup(<DeleteQuestionnaireButton />);

    expect(html).toContain('type="button"');
    expect(html).toContain("disabled");
  });

  it("does not request form submission when deletion is not confirmed", () => {
    const handleSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const requestSubmitSpy = vi.spyOn(HTMLFormElement.prototype, "requestSubmit");

    render(
      <form onSubmit={handleSubmit}>
        <DeleteQuestionnaireButton />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "删除空问卷" }));

    expect(window.confirm).toHaveBeenCalledWith("确认删除这份空问卷吗？删除后不可恢复。");
    expect(handleSubmit).not.toHaveBeenCalled();
    expect(requestSubmitSpy).not.toHaveBeenCalled();
  });

  it("requests form submission only after deletion is confirmed", () => {
    const handleSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const requestSubmitSpy = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(function (this: HTMLFormElement) {
        fireEvent.submit(this);
      });

    const { getByRole } = render(
      <form onSubmit={handleSubmit}>
        <DeleteQuestionnaireButton />
      </form>,
    );

    fireEvent.click(getByRole("button", { name: "删除空问卷" }));

    expect(window.confirm).toHaveBeenCalledWith("确认删除这份空问卷吗？删除后不可恢复。");
    expect(requestSubmitSpy).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("renders as a non-submit button until the user confirms", () => {
    render(
      <form>
        <DeleteQuestionnaireButton />
      </form>,
    );

    expect(screen.getByRole("button", { name: "删除空问卷" }).getAttribute("type")).toBe(
      "button",
    );
  });
});
