# Agent 架构与产品设计调研

本目录保存 AI 模拟面试官 MVP 的第二阶段设计调研：选择适合的 agent/workflow 架构，参考高质量开源仓库，形成可直接交给工程实现的设计方案。

## 当前结论

首版不采用重型多 agent 框架。推荐实现为“轻量状态机 workflow + 场景化 prompt pack + 结构化复盘”，沿用当前 FastAPI + Vite + OpenAI-compatible Chat Completions 架构。

这个选择不是否定 OpenAI Agents SDK 或 LangGraph，而是基于挑战时间和当前产品目标：我们现在最需要可控的面试训练闭环，而不是复杂工具调用、长期记忆、后台任务或多 agent 自主协作。

## 文件索引

- `sources.md`：官方资料、GitHub 仓库、面试类开源项目参考。
- `repo-and-framework-comparison.md`：候选框架对比和打分。
- `architecture-decision.md`：架构选择与不选其他方案的理由。
- `ai-interviewer-product-design.md`：用户流程、场景、反馈结构和 Demo 亮点。
- `implementation-design.md`：后端接口、状态、prompt 分层和前端界面改造。
- `design-proposal.md`：最终整体设计方案。

## 下一步

按 `design-proposal.md` 进入工程实现：先改后端面试 workflow，再改前端训练工作台，最后验证 Docker Compose 和公网 `3000`。
