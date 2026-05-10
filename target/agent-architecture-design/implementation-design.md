# 工程实现设计

## 总体策略

不重写项目，不引入数据库，不引入 agent 框架。沿用当前 FastAPI + OpenAI Python SDK + Vite/React。

实现顺序：

1. 后端增加面试 workflow 数据模型和 prompt builder。
2. 新增 `/interview/message` API。
3. 前端从普通聊天页改成训练工作台。
4. 保留 `/chat`、`/config`、`/health` 以便回归和排障。

## 后端接口

### Endpoint

```http
POST /interview/message
```

前端通过 `/api/interview/message` 同源代理调用。

### Request

```json
{
  "scenario": "project_deep_dive",
  "phase": "opening",
  "round": 0,
  "max_rounds": 5,
  "project_context": "我做了一个基于 RAG 的课程问答系统...",
  "job_target": "AI 应用开发实习",
  "messages": [
    {"role": "assistant", "content": "请先介绍你的项目背景。"},
    {"role": "user", "content": "这个项目主要是..."}
  ]
}
```

### Response

```json
{
  "reply": "你提到用了向量检索。请具体说一下 chunk 大小怎么定的，以及有没有坏例分析？",
  "phase": "followup",
  "round": 1,
  "max_rounds": 5,
  "is_complete": false,
  "model": "deepseek-v4-flash"
}
```

复盘阶段仍然返回 `reply`，但 `phase = "completed"`、`is_complete = true`。

## 枚举值

### Scenario

| 值 | 展示名 |
| --- | --- |
| `project_deep_dive` | 项目深挖压力面 |
| `backend_fundamentals` | 后端八股项目化追问 |
| `rag_agent_review` | RAG/Agent 项目真实性拷打 |

### Phase

| 值 | 含义 |
| --- | --- |
| `opening` | 第一个问题 |
| `followup` | 连续追问 |
| `summary` | 生成复盘 |
| `completed` | 复盘完成 |

## 状态推进规则

| 当前 phase | 请求条件 | 返回 phase | round |
| --- | --- | --- | --- |
| `opening` | 用户点击开始 | `followup` | 1 |
| `followup` | 用户提交回答且 `round < max_rounds` | `followup` | `round + 1` |
| `followup` | 用户点击结束并复盘 | `completed` | 不增加 |
| `summary` | 用户点击结束并复盘 | `completed` | 不增加 |

实现上可以让前端在点击“结束并复盘”时直接传 `phase = "summary"`。

## Prompt Pack

### 公共系统约束

- 你是中文技术实习模拟面试官。
- 你的目标是训练候选人，不是替候选人回答。
- 每轮只问一个主问题，最多补充一个追问方向。
- 不要长篇讲解知识点。
- 必须围绕用户项目和上一轮回答追问。
- 如果项目描述太短，先追问项目背景、个人贡献和技术栈。

### 场景差异

`project_deep_dive`：

- 重点追问项目背景、个人贡献、技术选型、指标、压测、失败路径。
- 语气可以有压力，但不要羞辱用户。

`backend_fundamentals`：

- 从项目中出现的 Redis/MySQL/MQ/接口/并发/部署词汇切入。
- 要求用户把八股概念落到项目场景。

`rag_agent_review`：

- 重点追问数据来源、切块、embedding、rerank、prompt、工具调用、评估、部署、成本。
- 对“只调 API”的风险保持敏感。

### 复盘 Prompt

复盘必须输出 Markdown，结构固定：

```markdown
## 总评

## 最可能被问挂的 3 个点

## 维度反馈

| 维度 | 判断 | 证据 | 改进 |
| --- | --- | --- | --- |

## 下一轮行动

## 下一轮练习题
```

## 前端改造

### 状态

前端需要维护：

- `scenario`
- `projectContext`
- `jobTarget`
- `phase`
- `round`
- `maxRounds`
- `messages`
- `debrief`
- `isLoading`
- `error`

首版全部放 React state，不落数据库。是否使用 `localStorage` 作为刷新保护可在实现时看时间，默认不做。

### 页面结构

```text
main.interview-workspace
  aside.control-panel
    brand
    provider/model status
    scenario selector
    project context textarea
    job target input
    start/reset buttons
    round indicator

  section.interview-panel
    header
    message timeline
    error banner
    composer
    end-and-debrief button

  section.debrief-panel
    rendered summary
```

### 文案

- 页面主标题：`AI 模拟面试官`
- 副标题：`把项目经历练到经得起追问`
- 开始按钮：`开始面试`
- 结束按钮：`结束并复盘`
- 重练按钮：`重新练一次`

## 测试与验收

### 后端

- `/health` 返回 ok。
- `/config` 不泄露 key。
- `/chat` 仍可用。
- `/interview/message` 在三种场景下都能返回非空问题。
- `phase = summary` 时返回结构化复盘。
- 未配置 API key 时返回 503。

### 前端

- 首屏不是普通聊天页，而是训练工作台。
- 未填写项目经历时不允许开始，或给出明确提示。
- 开始后能显示第 1 轮问题。
- 回答后轮次递增。
- 点击结束后展示复盘。
- 连接异常时显示可理解错误。

### Docker/Public Demo

- `docker compose up --build -d` 后，`http://8.139.254.60:3000/` 可访问。
- 浏览器只依赖 `3000`。
- `/api/config` 和 `/api/interview/message` 可从前端同源调用。

## 后续升级路线

1. 加 `localStorage` 保存当前训练。
2. 加更严格 JSON 结构化输出。
3. 加题库/知识点推荐。
4. 加历史记录和用户画像。
5. 迁移到 OpenAI Responses API 或 Agents SDK，获得 session、tracing、guardrails。
6. 需要长期状态或人工教练介入时，再考虑 LangGraph。
