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

function sourceCards(tags: string[]) {
  return [
    {
      id: "source-1",
      title: "训练资料卡",
      url: "https://example.com/source",
      source_type: "test-source",
      tags,
      matched_terms: tags.slice(0, 2),
      score: 10,
    },
  ];
}

async function mockTraining(page: import("@playwright/test").Page) {
  await page.route("**/api/training/message", async (route) => {
    const request = route.request().postDataJSON();
    const isSummary = request.phase === "summary";
    const nextRound = request.phase === "opening" ? 1 : Math.min(request.round + 1, request.max_rounds);
    const base = {
      phase: isSummary ? "completed" : "followup",
      round: isSummary ? request.round : nextRound,
      max_rounds: request.max_rounds,
      is_complete: isSummary,
      model: "deepseek-v4-pro",
      feedback: "",
    };

    if (request.mode === "knowledge") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...base,
          reply: isSummary
            ? "## 总评\nRAG 基础有概念，但评价链路不够完整。\n\n## 知识漏洞\n1. chunk 和 rerank 归因不清。"
            : request.phase === "opening"
              ? "请解释 RAG 中 chunk、embedding 召回和 rerank 分别解决什么问题，并说明一个坏例如何归因。"
              : "**反馈**\n- 你说清楚了向量召回，但没有区分 recall 和 answer correctness。\n\n**追问**\n如果答案错了但召回片段正确，你会优先排查哪一层？",
          source_cards: sourceCards(["rag", "rerank", "evaluation"]),
          question_tags: ["rag", "rerank", "evaluation"],
          resume_evidence: "当前训练项：RAG 检索与评估",
          risk_hypothesis: "常见挂点：无法说明坏例归因",
          item: {
            id: "rag-retrieval-evaluation",
            title: "RAG 检索与评估",
            category: request.category,
            description: "Agent/LLM 八股",
            prompt: "围绕 chunk、embedding、rerank、评估和幻觉控制提问。",
            difficulty: "",
            tags: ["rag", "rerank", "evaluation"],
            starter_code: "",
            source_url: "https://example.com/rag",
          },
        }),
      });
      return;
    }

    if (request.mode === "coding") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...base,
          reply: isSummary
            ? "## 总评\n思路方向正确，但 shape 和 mask 细节需要补强。\n\n## 代码主要问题\n1. 没有除以 sqrt(D)。"
            : request.phase === "opening"
              ? "请实现 scaled dot-product attention，先说明 shape、复杂度和 mask 处理，再贴代码。"
              : "**代码反馈**\n- 你写出了 qk 相乘，但缺少 sqrt(D) 缩放和 mask 处理。\n\n**追问**\nmask 在 softmax 前还是后处理，为什么？",
          source_cards: sourceCards(["attention", "mha", "pytorch"]),
          question_tags: ["attention", "mha", "pytorch"],
          resume_evidence: "当前训练项：Scaled Dot-Product Attention",
          risk_hypothesis: "评审重点：shape、mask、数值稳定性",
          item: {
            id: "scaled-dot-product-attention",
            title: "Scaled Dot-Product Attention",
            category: request.category,
            description: "AI 算子题",
            prompt: "用 PyTorch 实现 attention，输入 q/k/v 为 [B, H, T, D]。",
            difficulty: "Medium",
            tags: ["attention", "mha", "pytorch"],
            starter_code: "import torch\n\ndef attention(q, k, v, mask=None):\n    pass",
            source_url: "https://example.com/attention",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...base,
        reply: isSummary
          ? "## 总评\n表达有基础，但简历指标不够清晰。\n\n## 最可能被问挂的 3 个点\n1. chunk 策略没有解释依据。"
          : request.phase === "opening"
            ? "简历里你写了 PDF 解析、chunk 策略和 rerank。请说明 chunk 大小、重叠长度和 rerank 阈值是怎么定的，有没有坏例对比？"
            : "你说做过坏例分析。请给一个具体坏例，并说明你怎么判断问题出在检索还是生成？",
        source_cards: sourceCards(["rag", "retrieval", "rerank"]),
        question_tags: ["rag", "retrieval", "rerank"],
        resume_evidence: "项目：智能课程问答系统，负责 PDF 解析、chunk 策略、检索链路、Prompt 调优和 Docker 部署。",
        risk_hypothesis: "候选人可能只描述了 RAG 流程，但缺少 chunk/rerank 参数选择和坏例归因。",
        item: null,
      }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockConfig(page);
  await mockResumeExtract(page);
  await mockTraining(page);
});

test("starts from a three-mode training landing page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AI 模拟面试官" })).toBeVisible();
  await expect(page.getByRole("button", { name: /八股知识点/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /简历经历/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /手撕代码/ })).toBeVisible();
});

test("runs knowledge practice without a resume", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /八股知识点/ }).click();
  await page.getByRole("radio", { name: /Agent \/ LLM/ }).click();
  await page.getByRole("button", { name: /开始八股知识点/ }).click();

  await expect(page.getByText("RAG 检索与评估").first()).toBeVisible();
  await expect(page.getByText("chunk、embedding 召回和 rerank")).toBeVisible();
  await expect(page.getByLabel("问题标签").getByText("evaluation")).toBeVisible();

  await page.getByLabel("你的回答").fill("chunk 负责切分语义单元，embedding 负责召回，rerank 负责精排。");
  await page.getByRole("button", { name: "发送回答" }).click();
  await expect(page.getByText("没有区分 recall")).toBeVisible();
});

test("keeps the resume upload flow in the resume mode", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /简历经历/ }).click();
  await page.getByRole("button", { name: /开始简历经历/ }).click();
  await expect(page.getByRole("alert")).toContainText("上传或粘贴至少 30 个字");

  await page.getByLabel("上传简历文件").setInputFiles({
    name: "resume.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(resumeText),
  });
  await expect(page.getByText("resume.txt")).toBeVisible();
  await expect(page.getByLabel("简历内容（可粘贴备用）")).toContainText("智能课程问答系统");

  await page.getByRole("radio", { name: /RAG\/Agent 项目追问/ }).click();
  await page.getByRole("button", { name: /开始简历经历/ }).click();
  await expect(page.getByText("chunk 大小")).toBeVisible();
  await expect(page.getByLabel("本轮追问依据").getByText("训练资料卡").first()).toBeVisible();
});

test("runs coding practice and reviews pasted code", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /手撕代码/ }).click();
  await page.getByRole("radio", { name: /AI 算子/ }).click();
  await page.getByRole("button", { name: /开始手撕代码/ }).click();

  await expect(page.getByLabel("当前手撕题目").getByText("Scaled Dot-Product Attention")).toBeVisible();
  await expect(page.getByText("import torch")).toBeVisible();

  await page.getByLabel("你的回答").fill("scores = q @ k.transpose(-2, -1)\nreturn scores.softmax(-1) @ v");
  await page.getByRole("button", { name: "提交代码" }).click();
  await expect(page.getByText("缺少 sqrt(D) 缩放")).toBeVisible();
  await expect(page.getByText("mask 在 softmax 前还是后处理")).toBeVisible();
});

test("keeps conversations isolated across modes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /八股知识点/ }).click();
  await page.getByRole("button", { name: /开始八股知识点/ }).click();
  await expect(page.getByText("chunk、embedding 召回和 rerank")).toBeVisible();

  await page.getByRole("button", { name: /手撕代码/ }).click();
  await expect(page.getByText("选择题类，开始手撕代码")).toBeVisible();
  await page.getByRole("button", { name: /开始手撕代码/ }).click();
  await expect(page.getByRole("heading", { name: "Scaled Dot-Product Attention" })).toBeVisible();

  await page.getByRole("button", { name: /八股知识点/ }).click();
  await expect(page.getByText("chunk、embedding 召回和 rerank")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scaled Dot-Product Attention" })).not.toBeVisible();
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
  await expect(page.getByRole("button", { name: /手撕代码/ })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
