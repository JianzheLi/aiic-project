import { expect, test } from "@playwright/test";

const resumeText =
  "候选人：某高校计算机本科。\n技能：Python、FastAPI、Milvus、bge embedding、rerank、Docker。\n项目：智能课程问答系统，使用 FastAPI 提供后端接口，把课程 PDF 切分后写入向量库，通过 embedding 检索相关片段，再调用大模型生成回答。我主要负责 PDF 解析、chunk 策略、检索链路、Prompt 调优和 Docker 部署。";

async function mockConfig(page: import("@playwright/test").Page) {
  await page.route("**/api/config", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        model: "deepseek-v4-pro",
        provider: "DeepSeek",
        api_base_url: "https://api.deepseek.com",
        api_key_configured: true,
      }),
    });
  });
}

async function mockResumeExtract(page: import("@playwright/test").Page) {
  await page.route("**/api/resume/extract", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        filename: "resume.txt",
        content_type: "text/plain",
        text: resumeText,
        character_count: resumeText.length,
        truncated: false,
        extraction_method: "txt",
        ocr_used: false,
        page_count: null,
        warning: "",
      }),
    });
  });
}

async function mockInterview(page: import("@playwright/test").Page) {
  await page.route("**/api/interview/message", async (route) => {
    const request = route.request().postDataJSON();
    const isSummary = request.phase === "summary";
    const nextRound = request.phase === "opening" ? 1 : Math.min(request.round + 1, request.max_rounds);
    const openingReply =
      request.scenario === "backend_fundamentals"
        ? "简历里你写了 Redis 和后端接口。请说明缓存和数据库一致性在你的项目里怎么保证，失败时怎么兜底？"
        : request.scenario === "rag_agent_review"
          ? "简历里你写了 PDF 解析、chunk 策略和 rerank。请说明 chunk 大小、重叠长度和 rerank 阈值是怎么定的，有没有坏例对比？"
          : "简历里你写了课程问答系统。请说明你个人负责的链路、关键指标和一次失败路径。";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: isSummary
          ? "## 总评\n表达有基础，但简历指标不够清晰。\n\n## 最可能被问挂的 3 个点\n1. chunk 策略没有解释依据。\n2. 检索坏例没有量化。\n3. 部署稳定性没有监控。\n\n## 维度反馈\n\n| 维度 | 判断 | 证据 | 改进 |\n| --- | --- | --- | --- |\n| 项目可信度 | 中 | 简历说了 FastAPI 和向量检索 | 补充指标 |\n\n## 下一轮行动\n补齐坏例分析。\n\n## 下一轮练习题\n解释 chunk 大小怎么定。"
          : request.phase === "opening"
            ? openingReply
            : "你说做过坏例分析。请给一个具体坏例，并说明你怎么判断问题出在检索还是生成？",
        phase: isSummary ? "completed" : "followup",
        round: isSummary ? request.round : nextRound,
        max_rounds: request.max_rounds,
        is_complete: isSummary,
        model: "deepseek-v4-pro",
        source_cards: [
          {
            id: "rag-milvus-009",
            title: "Milvus hybrid search reranking",
            url: "https://milvus.io/docs/reranking.md",
            source_type: "official-doc",
            tags: ["rag", "retrieval", "rerank", "evaluation"],
            matched_terms: ["Milvus", "rerank", "embedding"],
            score: 18.5,
          },
        ],
        question_tags: ["rag", "retrieval", "rerank", "evaluation"],
        resume_evidence: "项目：智能课程问答系统，负责 PDF 解析、chunk 策略、检索链路、Prompt 调优和 Docker 部署。",
        risk_hypothesis: "候选人可能只描述了 RAG 流程，但缺少 chunk/rerank 参数选择、坏例归因和评估指标。",
      }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockConfig(page);
  await mockResumeExtract(page);
  await mockInterview(page);
});

test("uploads a resume and runs the core interview flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AI 模拟面试官" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "简历追问训练" })).toBeVisible();

  await page.getByRole("button", { name: "开始面试" }).click();
  await expect(page.getByRole("alert")).toContainText("上传或粘贴至少 30 个字");

  await page.getByLabel("上传简历文件").setInputFiles({
    name: "resume.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(resumeText),
  });
  await expect(page.getByText("resume.txt")).toBeVisible();
  await expect(page.getByLabel("简历内容（可粘贴备用）")).toContainText("智能课程问答系统");

  await page.getByLabel("目标岗位").fill("AI 应用开发实习");
  await page.getByRole("radio", { name: /RAG\/Agent 项目真实性拷打/ }).click();
  await page.getByRole("button", { name: "开始面试" }).click();

  await expect(page.getByText("chunk 大小")).toBeVisible();
  await expect(page.getByLabel("本轮追问依据").getByText("Milvus hybrid search reranking").first()).toBeVisible();
  await expect(page.getByLabel("问题标签").getByText("rerank").first()).toBeVisible();
  await expect(page.getByText("第 1 / 5 轮")).toBeVisible();

  await page.getByLabel("你的回答").fill("我用 500 字切块，重叠 80 字，主要根据课程章节和召回坏例调整。");
  await page.getByRole("button", { name: "发送回答" }).click();

  await expect(page.getByText("具体坏例")).toBeVisible();
  await expect(page.getByText("第 2 / 5 轮")).toBeVisible();

  await page.getByRole("button", { name: "结束并复盘" }).click();
  await expect(page.getByRole("heading", { name: "最可能被问挂的 3 个点" })).toBeVisible();
  await expect(page.getByLabel("面试复盘").getByText("部署稳定性没有监控。", { exact: true })).toBeVisible();
});

test("keeps independent conversations when switching scenarios", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("简历内容（可粘贴备用）").fill(resumeText);

  await page.getByRole("radio", { name: /RAG\/Agent 项目真实性拷打/ }).click();
  await page.getByRole("button", { name: "开始面试" }).click();
  await expect(page.getByText("rerank 阈值")).toBeVisible();

  await page.getByRole("radio", { name: /后端八股项目化追问/ }).click();
  await expect(page.getByText("上传简历，开始被追问")).toBeVisible();
  await page.getByRole("button", { name: "开始面试" }).click();
  await expect(page.getByText("缓存和数据库一致性")).toBeVisible();

  await page.getByRole("radio", { name: /RAG\/Agent 项目真实性拷打/ }).click();
  await expect(page.getByText("rerank 阈值")).toBeVisible();
  await expect(page.getByText("缓存和数据库一致性")).not.toBeVisible();
});

test("clears all scenario sessions after replacing resume", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "RAG 简历" }).click();
  await page.getByRole("button", { name: "开始面试" }).click();
  await expect(page.getByText("个人负责的链路")).toBeVisible();

  await page.getByLabel("简历内容（可粘贴备用）").fill(`${resumeText}\n新增项目：校园二手交易平台。`);
  await expect(page.getByText("上传简历，开始被追问")).toBeVisible();
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
  await page.getByLabel("简历内容（可粘贴备用）").fill(resumeText);
  await page.getByRole("button", { name: "开始面试" }).click();

  await expect(page.getByRole("alert")).toContainText("模型服务请求超时");
  await expect(page.getByLabel("简历内容（可粘贴备用）")).toHaveValue(resumeText);
});

test("guards rapid repeated start clicks", async ({ page }) => {
  await page.unroute("**/api/interview/message");
  let requestCount = 0;
  await page.route("**/api/interview/message", async (route) => {
    requestCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "请说明简历里课程问答系统的个人贡献。",
        phase: "followup",
        round: 1,
        max_rounds: 5,
        is_complete: false,
        model: "deepseek-v4-pro",
        source_cards: [],
        question_tags: [],
        resume_evidence: "",
        risk_hypothesis: "",
      }),
    });
  });

  await page.goto("/");
  await page.getByLabel("简历内容（可粘贴备用）").fill(resumeText);
  const startButton = page.getByRole("button", { name: "开始面试" });
  await startButton.dispatchEvent("click");
  await startButton.dispatchEvent("click");

  await expect(page.getByText("第 1 / 5 轮")).toBeVisible();
  expect(requestCount).toBe(1);
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
