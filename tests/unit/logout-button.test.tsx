// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  cookiesMock,
  redirectMock,
  signOutMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  cookiesMock: vi.fn(),
  redirectMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/layout/app-footer", () => ({
  AppFooter: () => <div>App footer</div>,
}));

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

import ConsoleLayout from "@/app/(console)/layout";

afterEach(() => {
  cleanup();
});

describe("ConsoleLayout logout entry", () => {
  beforeEach(() => {
    authMock.mockReset();
    cookiesMock.mockReset();
    redirectMock.mockReset();
    signOutMock.mockReset();

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });
    authMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
  });

  it("renders logout button for authenticated users", async () => {
    render(await ConsoleLayout({ children: <div>Dashboard</div> }));

    expect(screen.getByRole("button", { name: "退出登录" })).toBeTruthy();
  });

  it("signs out to login page when logout button is clicked", async () => {
    render(await ConsoleLayout({ children: <div>Dashboard</div> }));

    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });
});
