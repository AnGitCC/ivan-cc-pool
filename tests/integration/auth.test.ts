import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerLecturer } from "@/features/auth/register";

const { hashMock, createMock } = vi.hoisted(() => ({
  hashMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: hashMock,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      create: createMock,
    },
  },
}));

describe("registerLecturer", () => {
  beforeEach(() => {
    hashMock.mockReset();
    createMock.mockReset();
  });

  it("hashes the password before persisting", async () => {
    hashMock.mockResolvedValue("hashed-password");
    createMock.mockResolvedValue({
      id: "u1",
      name: "讲师",
      email: "lecturer@example.com",
      passwordHash: "hashed-password",
    });

    const user = await registerLecturer({
      name: "讲师",
      email: "lecturer@example.com",
      password: "StrongPass123",
    });

    expect(hashMock).toHaveBeenCalledWith("StrongPass123", 10);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: "讲师",
        email: "lecturer@example.com",
        passwordHash: "hashed-password",
      },
    });
    expect(user.email).toBe("lecturer@example.com");
  });
});
