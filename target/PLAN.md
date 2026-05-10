# AI 模拟面试官挑战计划

## 资料来源

- 原始说明：`target/2026-05-09_项目挑战说明.pdf`
- 当前 demo：根目录的全栈聊天样本，前端 `3000`，后端 `8000`
- 当前公网 demo：`http://8.139.254.60:3000/`

## 挑战约束摘录

- 主题：做一个能切实帮助学生的 AI 模拟面试官。
- 时间：2026-05-10 08:00 到 2026-05-10 24:00，按邮件服务器时间戳提交。
- 必交材料：3 分钟以内 Demo 视频、可访问产品链接、Product Memo、public GitHub 仓库。
- 产品链接需要至少可访问到 2026-05-15 24:00。
- 评分重点：理解目标用户、抓住核心产品闭环、可用产品、有效使用 AI、快速迭代、创业者式取舍。
- 不鼓励泛泛而做，建议在用户群上做窄做深。
- 文字版做扎实是基础线，语音或视频是加分项，不是必选项。

## 总体推进框架

这个项目按三个阶段推进，避免一上来堆功能：

1. 先确定产品面向的痛点，并尽量找到用户调研证据。
2. 再决定产品如何解决这个痛点，明确 MVP 闭环和关键取舍。
3. 最后进入实施、部署、验证和提交材料准备。

每个阶段都要产出可写进 Product Memo 的材料，而不是只产出代码。

## 阶段一：痛点与用户调研

### 当前目标用户

中国本科生，正在准备互联网大厂技术实习面试。

### 当前痛点假设

- 缺少高频、低成本的模拟面试机会。
- 不知道自己的回答问题出在哪里，只能得到“多刷题”“表达不清楚”这类泛泛建议。
- 面试准备容易停留在背八股或刷题，缺少针对自己简历和项目经历的连续追问。
- 面对追问时容易暴露项目细节不扎实、思路跳跃、表达无结构等问题。

### 待补充调研

- [x] 从小红书收集 120+ 条技术实习面试公开笔记样本，详见 `target/research/xhs-tech-intern-interviews/`。
- [x] 小红书调研可使用 `xhs-apis` skill 辅助搜索、读取笔记和评论；该工具通常需要有效 `cookies_str`，不把 cookie 写入仓库。
- [x] 扩展第二轮公开调研，不局限小红书，覆盖 GitHub/开源题库、牛客、掘金、知乎、技术博客、论文、官方文档、面试官/老师/老板视角，详见 `target/research/interview-questioning-playbook/`。
- [x] 建立结构化调研样本库：第二轮新增 204 条样本，其中 GitHub/开源来源 54 条，小红书公开笔记 100 条，面试官/老师/老板相关视角 108 条。
- [x] 提炼真实面试中的追问链和“拷打方式”，包括项目真实性、Redis/MySQL/MQ、性能压测、RAG/Agent、LLM 推理、LoRA、保研压力面等。
- [x] 完成第三轮需求验证 desk research：补充 36 条项目/简历样本、50 条岗位 JD、8 个竞品/替代方案体验，详见 `target/research/demand-validation-desk-research/`。
- [x] 完成三轮调研整合，详见 `target/research/synthesis.md`。
- [x] 完成最终调研报告，包含 Markdown、LaTeX/PDF 和关键统计图，详见 `target/research/final-report/`。
- [x] 提炼用户最常见的 3 个面试准备痛点。
- [x] 判断这些痛点里哪一个最适合 16 小时内做出闭环。
- [x] 找到 2-3 个竞品或替代方案，明确为什么直接用通用聊天机器人不够好，详见 `target/research/interview-questioning-playbook/competitor-notes.md`。
- [x] 把调研结论沉淀成 Product Memo 的“目标用户与核心痛点”段落。

## 阶段二：解决方案设计

### 解决思路草案

先不做完整招聘系统，而是做一个面向技术实习面试的训练闭环：

1. 用户选择面试场景。
2. 用户上传 PDF/DOCX/TXT 简历，或粘贴简历文本；岗位方向可选。
3. AI 面试官按技术实习场景连续追问。
4. 用户用文字作答。
5. AI 给出结构化反馈、评分和下一轮改进建议。
6. 用户可以基于反馈继续追问或重练。

### 待定产品取舍

- [x] 输入升级为上传 PDF/DOCX/TXT 简历或粘贴简历文本，岗位 JD 可选；文本型 PDF 直接解析，扫描 PDF 尝试本地 OCR。
- [x] 反馈维度确定为：项目可信度、专业深度、表达结构、工程闭环、承压表现、下一步行动。
- [x] 产品第一屏改成“面试训练工作台”，不是普通聊天页。
- [x] Demo 视频前 30 秒的 wow moment：用户上传简历后，AI 抓住简历里的具体技术栈和项目风险点连续追问，并指出最可能被问挂的点。
- [x] 首版明确不做：登录、数据库、语音、视频、完整题库浏览器、复杂招聘 pipeline。
- [x] 完成 Agent 架构与产品设计调研，详见 `target/agent-architecture-design/`。
- [x] 首版架构确定为“轻量状态机 workflow + 场景化 prompt pack + 结构化复盘”，不引入 LangGraph、AutoGen、CrewAI 或 OpenAI Agents SDK 作为运行时依赖。
- [x] 训练场景切换改为“每个场景独立对话”，同一份简历可以分别练项目深挖、后端八股和 RAG/Agent。
- [x] 默认模型升级为 `deepseek-v4-pro`，并对该模型启用 thinking 和 high reasoning effort。
- [x] 架构升级为 Agentic RAG：每轮基于资料卡检索技术依据，生成追问后用 critic 规则拦截泛泛问题，前端展示简历证据、风险假设、问题标签和来源。

### MVP 方向草案

- 场景选择：首版优先提供 3 个中文训练场景：项目深挖压力面、后端八股项目化追问、RAG/Agent 项目真实性拷打。
- 面试流程：上传/粘贴简历、选择场景、开始面试、连续追问、结束并总结。
- 反馈输出：总评、亮点、风险点、项目可信度、表达结构、工程闭环、承压表现、可执行改进建议、下一轮练习题。
- 交互体验：让用户明显感到这是“面试训练产品”，不是普通聊天框。
- 后端工作流：单接口内显式编排“简历画像/资料检索/问题生成/critic 重写/结构化复盘”，暂不引入重型 agent 框架。
- 部署：继续使用 Docker Compose，保持 `3000` 公网访问和 `/api/*` 同源代理。

## 阶段三：实施与交付

### 工程实施

- [x] 保存原始挑战说明到 `target/`。
- [x] 建立显式计划文档。
- [x] 确定第一个窄目标用户和面试场景：准备互联网大厂技术实习面试的中国本科生。
- [x] 完成实现设计：新增 `/interview/message`，保留 `/chat`、`/config`、`/health`，详见 `target/agent-architecture-design/implementation-design.md`。
- [x] 改造前端，从通用聊天 demo 变成模拟面试训练界面。
- [x] 改造后端系统提示词和返回逻辑，支持面试追问与结构化反馈。
- [x] 新增 `/resume/extract`，支持 PDF/DOCX/TXT 简历解析；扫描 PDF 尝试本地 OCR，失败时给出清晰错误。
- [x] 新增 Agentic RAG 资料卡检索模块和前端追问依据展示。
- [x] 补充 README 的产品定位、运行方式、技术栈和提交说明。
- [x] 本地或服务器验证 `/health`、`/api/config`、`/api/chat`。
- [x] Docker Compose 重新构建并部署到公网 demo。

### 提交材料

- [x] 准备 Product Memo 草稿，详见 `target/product-delivery/product-memo.md`。
- [x] 准备可作为 Product Memo 原料的调研报告：`target/research/final-report/ai-interviewer-research-report.md` 和 `target/research/final-report/ai-interviewer-research-report.pdf`。
- [x] 准备 3 分钟以内 Demo 视频脚本，详见 `target/product-delivery/demo-video-script.md`。
- [ ] 提交 git commit 并 push 到远程仓库。

## Product Memo 素材池

- 目标用户与核心痛点：基于三轮公开调研整合，详见 `target/research/synthesis.md` 和 `target/research/final-report/ai-interviewer-research-report.md`。
- 产品设计说明：强调窄场景、简历驱动、连续追问、结构化挂点复盘；完整设计见 `target/agent-architecture-design/design-proposal.md`。
- 版本迭代记录：从通用聊天样本到模拟面试官；后续每次关键变更继续记录。
- 交付材料草稿：`target/product-delivery/`。
- 下一步设计：首版之后可选方向包括 JD 匹配、语音练习、历史记录、个性化题库、向量化资料库；需要 tools/session/tracing 时再考虑 OpenAI Agents SDK，需要长期状态和 human-in-the-loop 时再考虑 LangGraph。
- AI 工具使用：Codex 用于代码理解、计划维护、实现和调试；LLM API 用于面试官能力。

## 决策记录

- 2026-05-10：把 `target/PLAN.md` 作为挑战计划的唯一维护入口，根 `AGENTS.md` 增加挑战方向和计划维护约定。
- 2026-05-10：第一个 MVP 场景确定为“中国本科生准备互联网大厂技术实习面试”。
- 2026-05-10：安装 `xhs-apis` skill，用于小红书公开内容调研；使用时需要本地提供有效 cookie。
- 2026-05-10：验证 `xhs-apis` 可正常搜索小红书笔记、读取笔记详情和读取评论，能用于阶段一用户调研。
- 2026-05-10：完成小红书公开内容调研，采集 158 条去重样本，其中核心岗位样本 144 条，综合结论沉淀到 `target/research/xhs-tech-intern-interviews/findings.md`。
- 2026-05-10：完成第二轮广泛公开调研，建立 `target/research/interview-questioning-playbook/`，采集 204 条结构化样本；产品判断更新为“以简历/项目经历驱动的连续追问 + 结构化挂点复盘”为 MVP 核心闭环。
- 2026-05-10：完成第三轮需求验证和 research 总整合；早期输入确定为项目经历文本，后续已升级为简历上传/粘贴，产品形态确定为面试训练工作台。
- 2026-05-10：完成最终调研报告与 LaTeX PDF，整合 456 条结构化研究输入，沉淀用户痛点、竞品缺口、优先级矩阵和 MVP 取舍。
- 2026-05-10：完成 Agent 架构与产品设计调研；调研 OpenAI Agents SDK、Responses API、LangGraph、AutoGen、CrewAI、OASIS 等资料后，决定首版采用轻量状态机 workflow，不引入重型 agent 框架。
- 2026-05-10：完成首版完整产品实现：后端 `/interview/message` workflow、前端面试训练工作台、Product Memo 草稿、Demo 视频脚本和自动化测试。
- 2026-05-10：完成简历上传升级：新增 `/resume/extract`，支持 PDF/DOCX/TXT；前端改为上传/粘贴简历主流程；场景切换改为独立对话；默认模型切到 `deepseek-v4-pro`。
- 2026-05-10：取消扫描 PDF 限制并升级架构：后端加入本地 OCR 兜底、资料卡检索、Agentic RAG 追问生成和 critic 重写；前端展示本轮追问依据。
