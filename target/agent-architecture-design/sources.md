# 外部资料与 GitHub 仓库索引

访问日期：2026-05-10

## 官方架构资料

| 来源 | 关键信息 | 对本项目的启发 | 结论 |
| --- | --- | --- | --- |
| [OpenAI Agents SDK README](https://github.com/openai/openai-agents-python) | 官方 README 描述其为 lightweight multi-agent workflow framework，核心概念包括 agents、handoffs、tools、guardrails、sessions、tracing；README 也说明支持 Responses API、Chat Completions 和其他 LLM。 | 如果后续要做工具调用、handoff、trace 和 session，Agents SDK 是强候选。 | 首版不引入，但把 manager/handoff/guardrails 思路转化为轻量 prompt/workflow。 |
| [OpenAI Agents SDK docs: Agents](https://openai.github.io/openai-agents-python/agents/) | 文档列出 agent 配置、output types、multi-agent patterns、dynamic instructions、lifecycle hooks、guardrails 等能力。 | “面试官/追问者/教练”可以看作角色化 agent，但首版可用单模型不同阶段 prompt 模拟。 | 作为后续升级路线，不作为本轮实现依赖。 |
| [OpenAI Responses API reference](https://platform.openai.com/docs/api-reference/responses/object) | Responses API 支持 stateful interaction、tools、structured JSON data、previous_response_id 等。 | 如果切 OpenAI 原生模型，Responses API 能减少会话拼接和结构化输出成本。 | 当前 DeepSeek OpenAI-compatible 后端已稳定，首版继续 Chat Completions。 |
| [OpenAI practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/) | 指出 agent 基础组件是 model、tools、instructions；建议从单 agent 增量演进到多 agent，而不是一开始过度复杂。 | 支持本轮结论：先做可控单 workflow，再按复杂度升级。 | 作为架构原则来源。 |

## 高质量 GitHub 仓库

| 仓库 | 快照 | 可借鉴点 | 对当前项目的适配判断 |
| --- | --- | --- | --- |
| [openai/openai-agents-python](https://github.com/openai/openai-agents-python) | GitHub API 快照：约 26.1k stars、4.0k forks、MIT、2026-05-10 有更新。 | Agent、tool、handoff、guardrail、session、tracing 的清晰抽象。 | 适合后续增强，不适合现在引入依赖重构。 |
| [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | GitHub API 快照：约 31.6k stars、5.4k forks、MIT、2026-05-10 有更新。README 强调 long-running stateful agents、durable execution、human-in-the-loop、memory、debugging。 | 状态图、可恢复流程、human-in-the-loop。 | 对生产级复杂流程强，但首版没有长期状态和恢复需求。 |
| [microsoft/autogen](https://github.com/microsoft/autogen) | GitHub API 快照：约 57.9k stars、8.7k forks；README 明确 AutoGen 已进入 maintenance mode，并建议新项目使用 Microsoft Agent Framework。 | 多 agent 对话、human collaboration 的历史参考。 | 不选。维护状态不适合 16 小时挑战引入。 |
| [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI) | GitHub API 快照：约 51.1k stars、7.1k forks、MIT。README 强调 Crews、Flows、hierarchical process。 | 角色化任务、顺序/层级流程、自动生成报告。 | 对调研写作类任务有参考意义，但对面试训练 MVP 过重。 |

## 面试/访谈类开源产品参考

| 项目 | 可借鉴点 | 不直接复用原因 |
| --- | --- | --- |
| [OASIS: Open Agentic Survey Interview System](https://oasis-surveys.github.io/) | 自托管访谈系统，支持文本/语音、结构化 protocols、OpenAI/Gemini/Claude/Mistral、FastAPI、React、PostgreSQL、Redis。 | AGPL-3.0，架构明显重于当前 MVP；适合借鉴“结构化访谈 protocol”，不适合复制代码或引入数据库。 |
| [GitHub topic: ai-interviewer](https://github.com/topics/ai-interviewer) | 有大量 mock interview、voice AI、Firebase/Next.js/Vapi 方向项目。 | 大多偏通用面试、语音或海外岗位；与“中国本科生技术实习项目深挖”定位不完全一致。 |
| [Loadout](https://loadout.live/) | AI system design mock interview，强调 senior engineer 校准和系统设计训练。 | 方向偏系统设计；可借鉴“AI 模拟资深工程师追问”的定位表达。 |

## 本轮资料判断

1. 现有成熟 agent 框架的价值主要在工具、handoff、trace、长期状态、human-in-the-loop 和恢复。
2. 当前项目最需要的是可控的 interview loop：限定场景、限定轮次、稳定追问、稳定复盘。
3. 直接引入 LangGraph/AutoGen/CrewAI 会带来依赖、学习、调试和部署风险，短时间内未必提升 Demo 效果。
4. 最适合首版的做法是借鉴框架思想，不引入框架依赖：用后端确定性状态机承担 orchestration，用 prompt pack 承担角色分层。
