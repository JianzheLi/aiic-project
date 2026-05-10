# Agentic RAG 面试官升级

## 目标

把现有简历驱动模拟面试从“场景 Prompt”升级成“资料驱动的 Agentic RAG 工作流”：

1. 先从简历、目标岗位和上一轮回答中抽取技术线索。
2. 检索面试资料卡，找到与场景最相关的论文、官方文档、开源产品经验和技术题纲。
3. 让模型基于“简历证据 + 资料依据 + 风险假设”生成追问。
4. 用 critic 规则检查问题是否过于泛泛，必要时重写一次。
5. 前端展示追问依据，让用户看出这不是普通聊天机器人。

## 已落地范围

- 后端新增资料卡检索模块，运行时读取 `backend/app/data/interview_source_cards.json`。
- `/interview/message` 响应新增 `source_cards`、`question_tags`、`resume_evidence`、`risk_hypothesis`。
- 前端每轮 AI 问题展示“本轮追问依据”。
- `/resume/extract` 支持文本型 PDF/DOCX/TXT，并对扫描 PDF 尝试本地 OCR。
- Docker 后端安装 Tesseract OCR 中文和英文语言包。

## 资料卡设计

资料卡不是完整文章摘要，而是面试追问用的最小知识单元：

- `domains`：资料所在技术域。
- `tags`：用于场景匹配和问题标签展示。
- `keywords`：用于轻量检索打分。
- `key_points`：可转化成追问依据的关键结论。
- `probe_templates`：面试官可以借鉴的追问模板。
- `anti_patterns`：候选人常见空泛回答或实现漏洞。

## 资料来源

当前 v1 source cards 覆盖：

- Agent/RAG：ReAct、Self-RAG、Microsoft GraphRAG。
- 面试评估：LLM-as-an-Interviewer。
- 文档解析：PyMuPDF OCR。
- 后端技术：MySQL InnoDB、Redis distributed locks、Kafka exactly-once。
- RAG 工程：Milvus hybrid search/reranking。
- 竞品参考：GPTInterviewer。

详见 `sources.md` 和后端 JSON 资料卡。

## 后续可选

- 把资料卡从 JSON 升级为向量索引或 BM25 索引。
- 加入岗位 JD 解析，让资料检索同时匹配简历和 JD。
- 用真实用户回答积累“挂点案例库”。
- 对 critic 引入结构化 JSON 输出和可视化评分。
