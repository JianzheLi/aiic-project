# 小红书技术实习面试调研

## 目标

通过小红书公开笔记调研“中国本科生准备大厂技术实习面试”的真实痛点，为 AI 模拟面试官的 MVP 范围和 Product Memo 提供证据。

## 范围

核心岗位：

- 后端开发：Java、Go、C++、后台开发。
- 算法/大模型：机器学习、LLM 算法、大模型算法。
- AI Infra/AI 应用：推理优化、RAG、Agent、LLM 工程、大模型应用开发。

横向主题：

- 项目深挖
- 被拷打
- 面试焦虑
- 复盘困难
- 手撕代码
- 八股追问

## 样本目标

- 总样本数不少于 120 条去重笔记。
- 每个核心岗位不少于 30 条样本。
- 横向主题不少于 30 条样本。
- 只保留“摘要+证据”，不全量搬运原文。

## 文件说明

- `notes/backend.md`：后端开发方向样本。
- `notes/algorithm-llm.md`：算法/大模型方向样本。
- `notes/ai-infra-app.md`：AI Infra/AI 应用方向样本。
- `notes/cross-cutting.md`：跨岗位主题样本。
- `notes/appendix-frontend-fullstack.md`：前端/全栈对照样本。
- `data/samples.json`：结构化样本数据，已移除 cookie 和 xsec token。
- `data/collection-summary.json`：采集规模、候选池规模和错误摘要。
- `findings.md`：综合调研结论。

## 复查方式

样本记录中保留 `note_id`、搜索关键词、标题和短证据片段。需要复查时，可使用本地 `xhs-apis` skill 和有效小红书 cookie 重新读取公开笔记详情。
