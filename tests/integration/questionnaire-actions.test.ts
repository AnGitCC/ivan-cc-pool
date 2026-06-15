import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createQuestionnaire,
  deleteOwnedQuestionnaire,
  listOwnedQuestionnaires,
  updateQuestionnaire,
} from "@/features/questionnaires/actions";
import QuestionnairesPage from "@/app/(console)/questionnaires/page";

const { authMock, createMock, deleteManyMock, findFirstMock, findManyMock, updateMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    createMock: vi.fn(),
    deleteManyMock: vi.fn(),
    findFirstMock: vi.fn(),
    findManyMock: vi.fn(),
    updateMock: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    questionnaire: {
      create: createMock,
      deleteMany: deleteManyMock,
      findFirst: findFirstMock,
      findMany: findManyMock,
      update: updateMock,
    },
  },
}));

describe("createQuestionnaire", () => {
  beforeEach(() => {
    authMock.mockReset();
    createMock.mockReset();
    deleteManyMock.mockReset();
    findFirstMock.mockReset();
    findManyMock.mockReset();
    updateMock.mockReset();
  });

  it("validates input and persists schema json", async () => {
    createMock.mockResolvedValue({
      id: "q1",
      ownerId: "u1",
      title: "培训反馈",
    });

    const result = await createQuestionnaire("u1", {
      title: "培训反馈",
      sections: [
        {
          kind: "base-info",
          title: "基础信息",
          questions: [
            {
              key: "department",
              type: "single",
              title: "部门",
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
              type: "single",
              title: "课程质量",
              options: [
                { label: "满意", score: 5 },
                { label: "一般", score: 3 },
              ],
            },
          ],
        },
      ],
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        ownerId: "u1",
        title: "培训反馈",
        description: undefined,
        schemaJson: {
          title: "培训反馈",
          sections: [
            {
              kind: "base-info",
              title: "基础信息",
              questions: [
                {
                  key: "department",
                  type: "single",
                  title: "部门",
                  required: false,
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
                  type: "single",
                  title: "课程质量",
                  required: false,
                  options: [
                    { label: "满意", score: 5 },
                    { label: "一般", score: 3 },
                  ],
                },
              ],
            },
          ],
        },
      },
    });
    expect(result.id).toBe("q1");
  });

  it("persists manually edited questions when updating a questionnaire", async () => {
    updateMock.mockResolvedValue({
      id: "q-edit",
      ownerId: "u1",
      title: "培训反馈问卷",
    });

    const result = await updateQuestionnaire("q-edit", "u1", {
      title: "培训反馈问卷",
      description: "手工编辑版本",
      sections: [
        {
          kind: "base-info",
          title: "基础信息",
          questions: [
            {
              key: "department",
              type: "text",
              title: "你的部门",
              required: true,
            },
          ],
        },
        {
          kind: "formal",
          title: "正式题目",
          questions: [
            {
              key: "satisfaction",
              type: "rating",
              title: "课程满意度",
              required: true,
            },
          ],
        },
      ],
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: {
        id: "q-edit",
        ownerId: "u1",
      },
      data: {
        title: "培训反馈问卷",
        description: "手工编辑版本",
        schemaJson: {
          title: "培训反馈问卷",
          description: "手工编辑版本",
          sections: [
            {
              kind: "base-info",
              title: "基础信息",
              questions: [
                {
                  key: "department",
                  type: "text",
                  title: "你的部门",
                  required: true,
                },
              ],
            },
            {
              kind: "formal",
              title: "正式题目",
              questions: [
                {
                  key: "satisfaction",
                  type: "rating",
                  title: "课程满意度",
                  required: true,
                },
              ],
            },
          ],
        },
      },
    });
    expect(result.id).toBe("q-edit");
  });
});

describe("deleteOwnedQuestionnaire", () => {
  beforeEach(() => {
    authMock.mockReset();
    createMock.mockReset();
    deleteManyMock.mockReset();
    findFirstMock.mockReset();
    findManyMock.mockReset();
    updateMock.mockReset();
  });

  it("deletes questionnaire when it has no linked sessions", async () => {
    findFirstMock.mockResolvedValue({
      id: "q-empty",
      _count: {
        sessions: 0,
      },
    });
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(deleteOwnedQuestionnaire("q-empty", "u1")).resolves.toEqual({
      deleted: true,
    });

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        id: "q-empty",
        ownerId: "u1",
      },
      select: {
        id: true,
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        id: "q-empty",
        ownerId: "u1",
      },
    });
  });

  it("rejects deleting questionnaire when linked sessions exist", async () => {
    findFirstMock.mockResolvedValue({
      id: "q-used",
      _count: {
        sessions: 2,
      },
    });

    await expect(deleteOwnedQuestionnaire("q-used", "u1")).rejects.toThrow(
      "QUESTIONNAIRE_HAS_SESSIONS",
    );

    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("renders a delete error banner from search params", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "u1",
      },
    });
    findManyMock.mockResolvedValue([]);

    const html = renderToStaticMarkup(
      await QuestionnairesPage({
        searchParams: Promise.resolve({
          deleteError: encodeURIComponent("该问卷已经关联场次，暂时不能删除。"),
        }),
      }),
    );

    expect(html).toContain("删除未完成：该问卷已经关联场次，暂时不能删除。");
  });
});

describe("listOwnedQuestionnaires", () => {
  beforeEach(() => {
    authMock.mockReset();
    createMock.mockReset();
    deleteManyMock.mockReset();
    findFirstMock.mockReset();
    findManyMock.mockReset();
    updateMock.mockReset();
  });

  it("lists questionnaires with newest first", async () => {
    findManyMock.mockResolvedValue([{ id: "new" }, { id: "old" }]);

    await listOwnedQuestionnaires("u1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        ownerId: "u1",
      },
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });
  });
});
