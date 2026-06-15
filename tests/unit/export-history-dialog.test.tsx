"use client";

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportHistoryDialog } from "@/components/sessions/export-history-dialog";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ExportHistoryDialog", () => {
  it("loads export jobs when opened", async () => {
    const fetchSpy = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          jobs: [
            {
              id: "j1",
              kind: "RAW_XLSX",
              status: "READY",
              fileUrl: null,
              createdAt: "2026-06-15T00:00:00.000Z",
              updatedAt: "2026-06-15T00:00:00.000Z",
            },
          ],
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

    render(<ExportHistoryDialog sessionId="s1" />);

    fireEvent.click(screen.getByRole("button", { name: "导出历史" }));

    expect(await screen.findByText("导出原始明细")).toBeTruthy();
    expect(fetchSpy).toHaveBeenCalledWith("/api/sessions/s1/exports");
  });
});

