import { expect, test, type BrowserContext, type Locator } from "@playwright/test";

async function enableE2eFixture(context: BrowserContext) {
  await context.addCookies([
    {
      name: "trae-e2e-fixture",
      value: "1",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
}

async function expectCompactWrappedItems(items: Locator, maxWidth: number) {
  const boxes = await items.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = (element as HTMLElement).getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        width: Math.round(rect.width),
      };
    }),
  );

  expect(boxes.length).toBeGreaterThan(1);
  expect(boxes[0]?.width ?? 0).toBeLessThan(maxWidth);
  expect(boxes[1]?.width ?? 0).toBeLessThan(maxWidth);
  expect(Math.abs((boxes[0]?.top ?? 0) - (boxes[1]?.top ?? 0))).toBeLessThanOrEqual(1);
}

test("lecturer can open the session workbench from dashboard, launch share dialog, and see export entry", async ({
  context,
  page,
}) => {
  await enableE2eFixture(context);

  await page.goto("/dashboard");
  const metrics = page.locator("aside");
  await expect(page.getByRole("heading", { name: "场次工作台" })).toBeVisible();
  await expect(page.getByRole("button", { name: "投屏填写" })).toBeVisible();
  await expect(page.getByRole("button", { name: "关闭场次" })).toBeVisible();
  await expect(page.getByRole("link", { name: "返回场次管理" })).toBeVisible();
  await expect(metrics.getByText("回收量")).toBeVisible();
  await expect(metrics.getByText("最近提交")).toBeVisible();
  await expect(page.getByRole("link", { name: "导出原始明细" })).toHaveAttribute(
    "href",
    "/api/sessions/e2e-session/exports/raw",
  );

  await page.getByRole("button", { name: "投屏填写" }).click();

  await expect(page.getByText("下载二维码图片")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "https://join.example.com/s/e2eslug01" }),
  ).toBeVisible();
});

test("lecturer can open the session workbench from a session deep link and see raw export", async ({
  context,
  page,
}) => {
  await enableE2eFixture(context);

  await page.goto("/sessions/e2e-session");

  await expect(page.getByRole("heading", { name: "场次工作台" })).toBeVisible();
  await expect(page.getByRole("button", { name: "投屏填写" })).toBeVisible();
  await expect(page.getByRole("link", { name: "返回场次管理" })).toBeVisible();
  await expect(page.getByRole("link", { name: "返回工作台首页" })).toBeVisible();
  await expect(page.getByRole("link", { name: "导出原始明细" })).toHaveAttribute(
    "href",
    "/api/sessions/e2e-session/exports/raw",
  );
});

test("lecturer can switch sessions and keep the deep-link URL in sync", async ({
  context,
  page,
}) => {
  await enableE2eFixture(context);

  await page.goto("/dashboard");

  const switcher = page.getByRole("combobox", { name: "切换场次" });
  await expect(switcher).toHaveValue("e2e-session");
  await expect(switcher.locator("option")).toHaveCount(2);
  await expect(
    switcher.locator('option[value="e2e-session-other-questionnaire"]'),
  ).toHaveCount(0);

  await switcher.selectOption("e2e-session-closed");
  await page.waitForURL("**/sessions/e2e-session-closed");

  await expect(switcher).toHaveValue("e2e-session-closed");
  await expect(page.getByRole("button", { name: "关闭场次" })).toHaveCount(0);
  await expect(page.getByText("场次已结束")).toBeVisible();
  await expect(page.getByRole("link", { name: "导出原始明细" })).toHaveAttribute(
    "href",
    "/api/sessions/e2e-session-closed/exports/raw",
  );
});

test("adaptive layout keeps stat chips and choice answers compact instead of stretching full rows", async ({
  context,
  page,
}) => {
  await enableE2eFixture(context);

  await page.goto("/sessions/e2e-session");

  const campusSummaryItems = page
    .getByTestId("chart-block-campus")
    .getByTestId("chart-summary-item");
  await expect(campusSummaryItems).toHaveCount(3);
  await expectCompactWrappedItems(campusSummaryItems, 260);

  await page.goto("/s/e2eslug01");

  const campusSingleOptions = page
    .getByTestId("survey-question-campus")
    .getByTestId("survey-choice-option");
  await expect(campusSingleOptions).toHaveCount(3);
  await expectCompactWrappedItems(campusSingleOptions, 260);

  const topicMultipleOptions = page
    .getByTestId("survey-question-topics")
    .getByTestId("survey-choice-option");
  await expect(topicMultipleOptions).toHaveCount(3);
  await expectCompactWrappedItems(topicMultipleOptions, 260);
});

test("lecturer sees imported questionnaire success feedback on edit page", async ({
  context,
  page,
}) => {
  await enableE2eFixture(context);

  await page.goto("/questionnaires/e2e-questionnaire/edit?imported=1");

  await expect(
    page.getByText("Excel 问卷已成功导入，请继续检查并完善内容。"),
  ).toBeVisible();
});

test("lecturer can draft a manual questionnaire in the builder before saving", async ({
  context,
  page,
}) => {
  const questionnaireTitle = `讲师手工建卷 ${Date.now()}`;

  await enableE2eFixture(context);
  await page.goto("/questionnaires/new");
  await page.getByLabel("问卷标题").fill(questionnaireTitle);
  await page.getByRole("button", { name: "添加题目" }).first().click();

  const firstQuestionTitle = page.getByLabel("题目标题").nth(1);
  await firstQuestionTitle.fill("你的部门");
  await expect(page.getByRole("button", { name: "保存问卷" })).toBeEnabled();
  await expect(page.getByLabel("问卷标题")).toHaveValue(questionnaireTitle);
  await expect(firstQuestionTitle).toHaveValue("你的部门");
  await expect(page.getByText("支持删除不需要的题目")).toBeVisible();
});

test("lecturer sees destructive delete entry on questionnaire session management page", async ({
  context,
  page,
}) => {
  await enableE2eFixture(context);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toBe(
      "删除后，该场次的答卷、统计与导出记录将一并清除，且不可恢复。",
    );
    await dialog.dismiss();
  });

  await page.goto("/questionnaires/e2e-questionnaire/sessions");

  await expect(page.getByRole("heading", { name: "培训反馈问卷 的场次管理" })).toBeVisible();
  const deleteButtons = page.getByRole("button", { name: "删除场次" });
  await expect(deleteButtons).toHaveCount(2);

  await deleteButtons.first().click();
});

test("lecturer sees delete error feedback on questionnaire list", async ({ context, page }) => {
  await enableE2eFixture(context);

  await page.goto(
    "/questionnaires?deleteError=" +
      encodeURIComponent("该问卷已经关联场次，暂时不能删除。"),
  );

  await expect(
    page.getByText("删除未完成：该问卷已经关联场次，暂时不能删除。"),
  ).toBeVisible();
});
