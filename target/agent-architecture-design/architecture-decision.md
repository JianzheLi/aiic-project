# 架构决策：项目驱动的轻量面试 Workflow

## 决策结论

首版 AI 模拟面试官采用：

> Deterministic Interview Workflow + Scenario Prompt Pack + Structured Debrief

即：后端用确定性状态机控制面试阶段、轮次和结束条件；模型只负责在每个阶段生成问题或复盘内容。暂不引入 OpenAI Agents SDK、LangGraph、AutoGen 或 CrewAI 作为运行时依赖。

## 背景约束

- 当前项目是 FastAPI + Vite + Docker Compose。
- 浏览器只需要访问 `3000`，前端通过 `/api/*` 同源代理后端。
- 当前模型调用是 OpenAI-compatible Chat Completions，默认 DeepSeek。
- 挑战剩余时间紧，必须优先保证稳定 demo。
- 目标产品是中文技术实习模拟面试，不是通用 agent 平台。

## 设计原则

1. 流程由代码控制，语言由模型生成。
2. 让用户感觉“被真实追问”，而不是“和聊天机器人闲聊”。
3. 每次训练必须有明确开始、轮次推进、结束和复盘。
4. 输出复盘必须可执行，不能只说“基础薄弱”。
5. 保持无数据库、无登录、无复杂编排，减少部署风险。

## 架构形态

```text
Frontend Interview Workspace
  - scenario selector
  - project context input
  - interview timeline
  - answer composer
  - debrief panel

      POST /api/interview/message

FastAPI Interview Workflow
  - validate request
  - infer phase and round
  - build scenario prompt
  - call OpenAI-compatible Chat Completions
  - return reply + next phase + round

LLM Provider
  - DeepSeek now
  - OpenAI-compatible provider later
```

## 状态机

| Phase | 触发 | 模型任务 | 下一步 |
| --- | --- | --- | --- |
| `opening` | 用户点击开始面试 | 基于项目经历问第一个高质量问题 | `followup` |
| `followup` | 用户提交回答，轮次未到上限 | 抓回答漏洞连续追问 | `followup` |
| `summary` | 用户点击结束，或达到建议轮次 | 输出结构化复盘 | `completed` |
| `completed` | 复盘已生成 | 前端展示结果，可重新开始 | 新 session |

首版推荐默认 `max_rounds = 5`，最少 3 轮后允许结束。用户可以随时点击“结束并复盘”。

## 不选其他框架的理由

### OpenAI Agents SDK

优点是官方、轻量、抽象清晰，支持 handoffs、tools、guardrails、sessions、tracing。当前不选的原因是：首版没有工具调用和多 agent handoff，现有 DeepSeek Chat Completions 后端已经可用，引入 SDK 会改变依赖和调用路径。

升级时机：需要真实 tools、可观测 tracing、服务端 session、或迁移到 OpenAI Responses API 时再考虑。

### LangGraph

优点是状态图、durable execution、human-in-the-loop、memory 和调试生态。当前不选的原因是：我们没有长期任务、后台恢复、人工审批或数据库状态，图框架会让实现重于产品闭环。

升级时机：要做历史记录、学习路径、跨 session 画像、人工教练介入时再考虑。

### AutoGen

不选。官方 README 已显示维护模式，新项目不应引入。

### CrewAI

不选。CrewAI 的 Crews/Flows 对自动化报告、调研任务更自然，但面试训练更需要短链路和强状态控制。

## 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 模型输出过长 | Prompt 限制每次只问 1 个主问题，最多 2 个补充点。 |
| 模型给答案而不是追问 | Follow-up prompt 明确禁止讲解，必须提问。 |
| 复盘泛泛而谈 | Summary prompt 固定维度：项目可信度、专业深度、表达结构、工程闭环、承压表现、下一轮行动。 |
| 用户输入项目太短 | Opening phase 先追问项目背景和个人贡献，不阻塞流程。 |
| 无数据库导致刷新丢失 | MVP 可接受；前端可在内存中保留，后续再加 localStorage。 |
