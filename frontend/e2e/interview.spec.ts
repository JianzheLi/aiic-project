import { expect, test } from "@playwright/test";

const projectText =
  "我做了一个基于 RAG 的课程问答系统，使用 FastAPI 提供后端接口，把课程 PDF 切分后写入向量库，通过 embedding 检索相关片段，再调用大模型生成回答。我主要负责后端接口、检索链路、Prompt 调优和 Docker 部署。";

async function mockConfig(page: import("@playwright/test").Page) {
  await page.route("**/api/config", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        model: "mock-model",
        provider: "MockProvider",
        api_base_url: "https://mock.local",
        api_key_configured: true,
      }),
    });
  });
}

async function mockInterview(page: import("@playwright/test").Page) {
  await page.route("**/api/interview/message", async (route) => {
    const request = route.request().postDataJSON();
    const isSummary = request.phase === "summary";
    const nextRound = request.phase === "opening" ? 1 : Math.min(request.round + 1, request.max_rounds);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: isSummary
          ? "## 总评\n表达有基础，但项目指标不够清晰。\n\n## 最可能被问挂的 3 个点\n1. chunk 策略没有解释依据。\n2. 检索坏例没有量化。\n3. 部署稳定性没有监控。\n\n## 维度反馈\n\n| 维度 | 判断 | 证据 | 改进 |\n| --- | --- | --- | --- |\n| 项目可信度 | 中 | 说了 FastAPI 和向量检索 | 补充指标 |\n\n## 下一轮行动\n补齐坏例分析。\n\n## 下一轮练习题\n解释 chunk 大小怎么定。"
          : request.phase === "opening"
            ? "你提到做了 RAG 课程问答系统。请先说明你个人负责的检索链路里，chunk 大小和重叠长度是怎么定的？"
            : "你说做过坏例分析。请给一个具体坏例，并说明你怎么判断问题出在检索还是生成？",
        phase: isSummary ? "completed" : "followup",
        round: isSummary ? request.round : nextRound,
        max_rounds: request.max_rounds,
        is_complete: isSummary,
        model: "mock-model",
      }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockConfig(page);
  await mockInterview(page);
});

test("runs the core interview and debrief flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AI 模拟面试官" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "项目追问训练" })).toBeVisible();

  await page.getByRole("button", { name: "开始面试" }).click();
  await expect(page.getByRole("alert")).toContainText("至少 30 个字");

  await page.getByLabel("项目经历").fill(projectText);
  await page.getByLabel("目标岗位").fill("AI 应用开发实习");
  await page.getByRole("radio", { name: /RAG\/Agent 项目真实性拷打/ }).click();
  await page.getByRole("button", { name: "开始面试" }).click();

  await expect(page.getByText("chunk 大小和重叠长度")).toBeVisible();
  await expect(page.getByText("第 1 / 5 轮")).toBeVisible();

  await page.getByLabel("你的回答").fill("我使用 500 字左右切块，重叠 80 字，主要根据课程章节长度和坏例做调整。");
  await page.getByRole("button", { name: "发送回答" }).click();

  await expect(page.getByText("具体坏例")).toBeVisible();
  await expect(page.getByText("第 2 / 5 轮")).toBeVisible();

  await page.getByRole("button", { name: "结束并复盘" }).click();
  await expect(page.getByRole("heading", { name: "最可能被问挂的 3 个点" })).toBeVisible();
  await expect(page.getByLabel("面试复盘").getByText("部署稳定性没有监控。", { exact: true })).toBeVisible();
});

test("keeps context and shows a readable backend error", async ({ page }) => {
  await mockConfig(page);
  await page.route("**/api/interview/message", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ detail: "模型服务请求超时，请稍后重试。" }),
    });
  });

  await page.goto("/");
  await page.getByLabel("项目经历").fill(projectText);
  await page.getByRole("button", { name: "开始面试" }).click();

  await expect(page.getByRole("alert")).toContainText("模型服务请求超时");
  await expect(page.getByLabel("项目经历")).toHaveValue(projectText);
});

test("renders cleanly on a mobile viewport", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AI 模拟面试官" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始面试" })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
