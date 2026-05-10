# AI 模拟面试官整体设计方案

## 1. 设计结论

首版采用“轻量状态机 workflow + 场景化 prompt pack + 结构化复盘”的 agent 架构。

不引入 LangGraph、AutoGen、CrewAI，也暂不引入 OpenAI Agents SDK。原因是当前 MVP 的核心不是复杂自主行动，而是稳定完成一次中文技术面试训练闭环：输入项目、连续追问、结束复盘。

## 2. 产品闭环

```text
项目经历输入
  -> 场景选择
  -> AI 开场问题
  -> 用户回答
  -> AI 连续追问 3-5 轮
  -> 结束并复盘
  -> 结构化挂点与下一轮行动
```

首版固定三个训练场景：

1. 项目深挖压力面。
2. 后端八股项目化追问。
3. RAG/Agent 项目真实性拷打。

## 3. Agent 架构

### 核心不是多 agent，而是受控 workflow

```text
Interview Workflow Controller
  - phase: opening | followup | summary | completed
  - round: 0..5
  - scenario prompt pack
  - project context
  - conversation history

LLM Call
  - generate one interview question
  - or generate final debrief
```

### 角色分层

底层仍是一次模型调用，但 prompt 按角色分层：

- Interviewer：问真实面试问题。
- Follow-up Critic：抓住上一轮回答的漏洞追问。
- Coach：结束时做结构化复盘。

这样可以在产品上获得 agent 感，但工程上保持可控。

## 4. 后端设计

新增主接口：

```http
POST /interview/message
```

请求包含：

- `scenario`
- `phase`
- `round`
- `max_rounds`
- `project_context`
- `job_target`
- `messages`

响应包含：

- `reply`
- `phase`
- `round`
- `max_rounds`
- `is_complete`
- `model`

保留：

- `/health`
- `/config`
- `/chat`

## 5. 前端设计

将当前普通聊天 demo 改成训练工作台：

- 左侧控制区：场景、项目经历、目标岗位、模型状态、轮次。
- 右侧面试区：对话时间线、回答输入框、开始/结束按钮。
- 复盘区：结束后展示总评、风险点、维度反馈、下一轮行动。

关键体验：

- 用户一打开就知道这是“面试训练”而不是“中文产品助手”。
- AI 每轮只问一个具体问题。
- 用户可以随时结束并获得复盘。

## 6. Prompt 设计

### 公共约束

- 使用中文。
- 像真实技术面试官，不像知识讲解老师。
- 每轮只问一个主问题。
- 必须基于用户项目和上一轮回答。
- 不要直接替用户回答。
- 不要泛泛建议。

### 场景重点

项目深挖压力面：

- 个人贡献、技术选型、指标、压测、失败路径。

后端八股项目化追问：

- Redis、MySQL、MQ、并发、接口、部署，必须回到项目。

RAG/Agent 项目真实性拷打：

- 数据、chunk、embedding、rerank、prompt、工具调用、评估、成本。

### 复盘结构

复盘必须包含：

- 总评。
- 最可能被问挂的 3 个点。
- 项目可信度。
- 专业深度。
- 表达结构。
- 工程闭环。
- 承压表现。
- 下一轮行动。
- 下一轮练习题。

## 7. 实施顺序

1. 后端新增 Pydantic models、scenario config、prompt builder、`/interview/message`。
2. 前端重构为面试训练工作台，保留现有连接状态和版本信息。
3. 用三段样例项目经历测试三个场景。
4. Docker Compose 重新构建，验证公网 `3000`。
5. 补 README、Product Memo 草稿和 Demo 视频脚本。

## 8. 验收标准

- 用户能在 3 分钟内看懂并完成一轮训练。
- AI 能围绕项目连续追问，不跑去泛泛讲知识点。
- 复盘能明确指出项目可信度、专业深度、表达结构、工程闭环等挂点。
- 不依赖登录、数据库、语音或视频。
- `3000` 公网页面可访问，前端通过 `/api/*` 调后端。

## 9. Product Memo 可复用表述

我们没有把 AI 模拟面试官做成一个复杂的多 agent 平台，而是选择了更适合 16 小时挑战的轻量 workflow。真实用户痛点不是缺一个“能聊天”的 AI，而是缺一个能围绕自己的项目连续追问、控制面试节奏、最后指出具体挂点的训练工具。因此，首版产品把 agent 能力收敛为三个明确阶段：面试官提问、追问者连续深挖、教练结构化复盘。这个设计既能明显区别于通用聊天机器人，也能在当前 FastAPI + Vite 架构上快速稳定落地。
