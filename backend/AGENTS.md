# Backend AGENTS.md

## 职责

`backend/` 负责 FastAPI 服务、健康检查、简历解析、三入口训练 workflow、Agentic RAG 简历追问、兼容聊天接口和 OpenAI-compatible API 调用。

## 开发约定

- 保持接口简单稳定，优先返回中文友好的错误信息。
- 不在日志或响应中泄露 `OPENAI_API_KEY`。
- 环境变量从运行环境读取，不在代码中写死真实密钥。
- MVP 阶段不加入数据库、鉴权、队列或流式输出。
- `/resume/extract` 是简历上传解析接口；只解析内存中的文件，不保存用户文件。
- `/resume/extract` 文本层解析失败时可尝试本地 OCR；OCR 失败要返回中文可理解错误。
- `/training/message` 是产品主接口，统一支持八股知识点、简历经历、手撕代码、完整模拟四种训练模式。
- `/interview/message` 是简历追问兼容接口，变更时同步更新后端测试、资料卡和 `target/PLAN.md`。
- Agentic RAG 资料卡放在 `app/data/interview_source_cards.json`，新增资料卡必须保留 URL、关键结论、追问模板和反模式。
- 八股与手撕代码内置题库放在 `app/data/knowledge_topics.json` 和 `app/data/coding_problems.json`，题目需要保留分类、标签、考察点和来源 URL。
