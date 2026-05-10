# 第二轮调研：面试追问链与拷打方式

## 调研目标

第一轮小红书调研已经证明“项目深挖 + 连续追问 + 挂点复盘”是高价值方向。第二轮扩展到 GitHub、开源题库、牛客、掘金、知乎、技术博客、论文、官方文档、面试官/老师/老板视角，目标是回答四个问题：

1. 面试官通常如何从项目或八股切入。
2. 哪些追问方式最容易把候选人问崩。
3. 基础八股和 AI 专项如何组织成训练链，而不是题目堆砌。
4. AI 模拟面试官应该怎样比通用聊天机器人更像真实面试。

## 样本统计

结构化样本见 `data/sources.json`，覆盖统计见 `data/coverage-summary.json`。

- 总样本：204 条。
- GitHub/开源来源：54 条。
- 小红书公开笔记：100 条。
- 面试官/老师/老板相关视角：108 条。
- 高置信公开来源：104 条；小红书搜索结果级样本：100 条。

## 来源范围

- GitHub/开源：JavaGuide、CS-Notes、doocs/advanced-java、system-design-primer、Doocs LeetCode、vLLM、FlashAttention、TensorRT-LLM、AgentGuide、LLMInterviewQuestions 等。
- 真实面经：小红书、牛客、掘金、CSDN、博客园等公开页面。
- 面试官/老师/老板视角：技术面试项目讲解、产品/工程 manager 面试标准、保研/复试老师视角、导师匹配材料。
- AI 专项：RAG、Agent、LLM 应用、Prompt、评估、LoRA、KV Cache、FlashAttention、推理服务、GPU 监控和部署。

## 使用方式

- 产品设计先读 `findings.md`。
- 提示词和训练流程设计先读 `questioning-playbook.md`。
- 题库和场景模板设计先读 `knowledge-taxonomy.md`。
- 竞品和替代方案判断读 `competitor-notes.md`。
- 需要追溯证据时查 `data/sources.json` 的 `id`、`url`、`questioning_chain` 和 `product_insight`。
