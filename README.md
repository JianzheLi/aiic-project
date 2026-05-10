# AI 模拟面试官

面向中国本科生技术实习面试准备的 AI 模拟面试产品。用户上传 PDF/DOCX/TXT 简历或粘贴简历文本后，AI 会围绕简历里的项目、技能和岗位目标连续追问，并在结束后输出结构化复盘，指出最可能被问挂的点和下一轮行动。

当前公网 demo：

```text
http://8.139.254.60:3000/
```

## 核心功能

- 3 个训练场景：项目深挖压力面、后端八股项目化追问、RAG/Agent 项目真实性拷打。
- 简历驱动：支持上传 PDF/DOCX/TXT，文本型 PDF 直接解析，扫描 PDF 尝试 OCR，可粘贴文本兜底。
- 本地 OCR：文本型 PDF 直接抽取，扫描 PDF 会尝试 Tesseract OCR 兜底。
- Agentic RAG：每轮从资料卡检索技术依据，生成后用 critic 规则检查泛泛追问并重写。
- 场景独立会话：同一份简历可以在不同训练场景中分别练习，切换场景不丢对话。
- 连续追问：后端用轻量状态机控制 `opening -> followup -> completed`。
- 结构化复盘：总评、最可能被问挂的 3 个点、维度反馈、下一轮行动、下一轮练习题。
- 追问依据展示：前端展示简历证据、风险假设、问题标签和资料来源。
- 默认模型：DeepSeek `deepseek-v4-pro`，对该模型启用 thinking 和 high reasoning effort。
- 部署简单：FastAPI + Vite/React + Docker Compose，浏览器只访问 `3000`，前端通过 `/api/*` 同源代理后端。

## 技术栈

- 后端：FastAPI、OpenAI Python SDK、python-multipart、pypdf、PyMuPDF、python-docx、Tesseract OCR。
- 前端：Vite、React、TypeScript、react-markdown、lucide-react。
- 测试：pytest、Playwright。
- 部署：Docker Compose，前端 `3000`，后端 `8000`。

## 主要接口

| 接口 | 说明 |
| --- | --- |
| `GET /health` | 后端健康检查 |
| `GET /config` | 返回 provider/model/key 配置状态，不泄露 key |
| `POST /resume/extract` | 上传并解析 PDF/DOCX/TXT 简历 |
| `POST /chat` | 保留的兼容聊天接口 |
| `POST /interview/message` | 面试训练主接口 |

`POST /resume/extract` 使用 `multipart/form-data`，字段名为 `file`。

`POST /interview/message` 请求示例：

```json
{
  "scenario": "rag_agent_review",
  "phase": "opening",
  "round": 0,
  "max_rounds": 5,
  "resume_text": "候选人简历：我做了一个基于 RAG 的课程问答系统...",
  "resume_filename": "resume.pdf",
  "job_target": "AI 应用开发实习",
  "messages": []
}
```

响应示例：

```json
{
  "reply": "简历里你写了 PDF 解析和 chunk 策略。请说明 chunk 大小、重叠长度和评估依据是怎么定的？",
  "phase": "followup",
  "round": 1,
  "max_rounds": 5,
  "is_complete": false,
  "model": "deepseek-v4-pro",
  "source_cards": [
    {
      "id": "rag-milvus-009",
      "title": "Milvus hybrid search reranking",
      "url": "https://milvus.io/docs/reranking.md",
      "source_type": "official-doc",
      "tags": ["rag", "retrieval", "rerank", "evaluation"],
      "matched_terms": ["Milvus", "rerank"],
      "score": 18.5
    }
  ],
  "question_tags": ["rag", "retrieval", "rerank"],
  "resume_evidence": "项目：智能课程问答系统，负责 PDF 解析、chunk 策略、检索链路。",
  "risk_hypothesis": "候选人可能只描述了 RAG 流程，但缺少 chunk/rerank 参数选择、坏例归因和评估指标。"
}
```

## 环境变量

复制示例文件后填写真实配置：

```bash
cp .env.example .env
```

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI-compatible API Key | `sk-...` |
| `OPENAI_BASE_URL` | OpenAI-compatible API 地址，默认 DeepSeek | `https://api.deepseek.com` |
| `MODEL_NAME` | 模型名称 | `deepseek-v4-pro` |
| `RESUME_MAX_BYTES` | 简历上传文件大小上限，默认 25MB | `26214400` |
| `SYSTEM_PROMPT` | 兼容 `/chat` 的系统提示词 | `你是一个中文友好的助手...` |

不要把真实 `.env` 提交到 Git。

## 本地运行

### 后端

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
export OPENAI_API_KEY="你的 key"
export OPENAI_BASE_URL="https://api.deepseek.com"
export MODEL_NAME="deepseek-v4-pro"
export RESUME_MAX_BYTES="26214400"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

健康检查：

```bash
curl http://localhost:8000/health
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

访问：

```text
http://localhost:3000
```

开发模式下 Vite 会把 `/api/*` 代理到 `http://localhost:8000`。

## 测试

后端：

```bash
.deps/backend-venv/bin/python -m pytest backend/tests -q
```

前端：

```bash
cd frontend
npm run build
npm run test:e2e
```

首次运行 Playwright 需要安装浏览器：

```bash
cd frontend
npx playwright install chromium
```

## Docker 部署

在项目根目录执行：

```bash
cp .env.example .env
# 编辑 .env，填入真实 OPENAI_API_KEY
bash scripts/build-with-version.sh
```

查看服务：

```bash
docker compose ps
docker compose logs -f
```

## 云服务器验证

浏览器访问：

```text
http://8.139.254.60:3000/
```

接口验证：

```bash
curl http://8.139.254.60:3000/api/config
curl http://8.139.254.60:3000/api/health
curl -X POST http://8.139.254.60:3000/api/interview/message \
  -H "Content-Type: application/json" \
  -d '{"scenario":"rag_agent_review","phase":"opening","round":0,"max_rounds":5,"resume_text":"候选人简历：我做了一个基于 FastAPI、Milvus 和 RAG 的课程问答系统，负责 PDF 解析、chunk 策略、检索链路和部署。","resume_filename":"resume.txt","job_target":"AI 应用开发实习","messages":[]}'
```

浏览器验收只依赖 `3000`。如果云服务器安全组单独放行了 `8000`，也可以直接检查 `http://8.139.254.60:8000/health`。

## 交付材料

- 计划文档：`target/PLAN.md`
- 调研报告：`target/research/final-report/ai-interviewer-research-report.md`
- 调研 PDF：`target/research/final-report/ai-interviewer-research-report.pdf`
- 架构设计：`target/agent-architecture-design/design-proposal.md`
- Agentic RAG 升级：`target/agentic-rag-upgrade/`
- Product Memo 草稿：`target/product-delivery/product-memo.md`
- Demo 视频脚本：`target/product-delivery/demo-video-script.md`
