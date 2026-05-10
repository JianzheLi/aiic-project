# Backend AGENTS.md

## 职责

`backend/` 负责 FastAPI 服务、健康检查、兼容聊天接口、面试训练 workflow 和 OpenAI-compatible API 调用。

## 开发约定

- 保持接口简单稳定，优先返回中文友好的错误信息。
- 不在日志或响应中泄露 `OPENAI_API_KEY`。
- 环境变量从运行环境读取，不在代码中写死真实密钥。
- MVP 阶段不加入数据库、鉴权、队列或流式输出。
- `/interview/message` 是产品主接口，变更时同步更新后端测试和 `target/PLAN.md`。
