# AGENTS.md

## 目录职责

本目录用于沉淀 AI 模拟面试官的 agent 架构与产品设计调研，目标是把“怎么做”说清楚，服务下一步前后端实现。

## 写作约定

- 默认中文写作，框架名、API 名、命令和代码标识保持英文。
- 优先引用官方文档、官方 GitHub 仓库和项目 README。
- 外部资料要记录访问日期、链接、用途和可借鉴点。
- 不把第三方仓库源码复制进来；只记录架构思路、接口形态和可复用模式。
- 不记录 API key、cookie、token 或个人隐私。
- 结论要围绕当前项目约束：FastAPI + Vite、DeepSeek/OpenAI-compatible、文字交互、10 小时内可落地。

## 产物约定

- `sources.md`：外部资料与 GitHub 仓库索引。
- `repo-and-framework-comparison.md`：候选框架和仓库对比。
- `architecture-decision.md`：最终架构决策。
- `ai-interviewer-product-design.md`：产品流程和体验设计。
- `implementation-design.md`：接口、数据流和实现边界。
- `design-proposal.md`：给实现阶段使用的整体设计方案。
