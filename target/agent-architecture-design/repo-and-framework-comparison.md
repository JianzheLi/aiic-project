# 候选框架与仓库对比

## 评估标准

本项目不是通用 agent 平台，而是 16 小时挑战里的 AI 模拟面试官 MVP。评估标准按重要性排序：

1. 10 小时内可落地。
2. 兼容当前 FastAPI + DeepSeek/OpenAI-compatible Chat Completions。
3. 能稳定控制 3-5 轮中文技术面试追问。
4. 依赖少，部署风险低，适合公网 demo。
5. 能清楚解释“为什么比通用聊天机器人更好”。

## 方案对比

| 方案 | 适配度 | 优点 | 风险 | 结论 |
| --- | --- | --- | --- | --- |
| 单 prompt 聊天增强 | 中 | 改动最少，几小时可做完。 | 容易退化成普通聊天；轮次、阶段和复盘不稳定。 | 不够产品化，只能作为 fallback。 |
| 轻量状态机 workflow | 高 | 可控、依赖少、能表达面试阶段和结束条件；完全兼容当前后端。 | 需要自己写 prompt builder 和状态推进。 | 推荐首版采用。 |
| OpenAI Agents SDK | 中高 | 官方、抽象清晰，支持 agents、handoffs、tools、guardrails、sessions、tracing。 | 需要引入新依赖和 provider 适配；当前不需要工具/handoff。 | 作为 v2 升级路线。 |
| LangGraph | 中 | 状态图、durable execution、human-in-the-loop、memory 很强。 | 学习和调试成本高，当前无 DB/长期状态；会拖慢 10 小时实现。 | 不用于首版，可借鉴状态图思想。 |
| AutoGen | 低 | 多 agent 对话模式成熟，历史资料多。 | 官方仓库已 maintenance mode，新项目不应引入。 | 不选。 |
| CrewAI | 中低 | Crews/Flows 对角色化任务直观，适合报告类自动化。 | 多 agent 和任务编排重于当前需求；引入后可解释成本高。 | 不选。 |
| OASIS 类访谈系统 | 中 | 对结构化访谈 protocol、访谈记录、访谈链接有参考价值。 | 架构包含 PostgreSQL/Redis/语音/多容器，AGPL 对代码复用也不友好。 | 只借鉴产品思路。 |

## 推荐架构：轻量状态机 workflow

### 为什么不是“多 agent”

真实产品体验里，用户不关心底层是不是多个 agent。用户关心的是：

- 问题是否像真实面试官。
- 追问是否抓住他自己的项目漏洞。
- 复盘是否指出下一步该改什么。
- Demo 是否稳定。

这些能力不需要多个 agent 自主对话。相反，多个 agent 会增加不可控性：可能互相复述、跑题、无法按轮次停止，也更难在 3 分钟视频里解释清楚。

### 轻量状态机如何吸收 agent 思想

| Agent 框架思想 | 首版落地方式 |
| --- | --- |
| Instructions | 每个场景一份 prompt pack。 |
| Agent roles | 用阶段 prompt 模拟：Interviewer、Follow-up Critic、Coach。 |
| Guardrails | 后端规则约束：轮次、输出格式、禁止泛泛建议。 |
| Sessions | 首版由前端携带对话历史；后端无数据库。 |
| Handoffs | 用 `phase` 切换：interview -> summary。 |
| Tools | 首版不用外部工具，避免复杂失败模式。 |
| Tracing | 首版用响应字段和浏览器可见状态替代；后续可加日志。 |

## 关键决策

1. 首版 API 不引入新 agent 框架依赖。
2. 后端新增面试训练 workflow，而不是继续依赖通用 `SYSTEM_PROMPT`。
3. 前端要显式展示面试状态：场景、轮次、项目上下文、复盘。
4. Prompt 要分场景，不做一个万能面试官。
5. 保留 `/chat` 作为兼容和排障接口，新增 `/interview/message` 承接产品主流程。
