# 资料来源索引

> 原始 PDF 和网页快照不提交。这里保留可追溯来源、采用理由和转化成面试资料卡的方式。

| 来源 | 类型 | 采用理由 | 转化方式 |
| --- | --- | --- | --- |
| ReAct: Synergizing Reasoning and Acting in Language Models, https://arxiv.org/abs/2210.03629 | 论文 | 支持“先观察/检索，再决定下一步动作”的 agentic workflow。 | 转化为 Agent 状态、工具调用失败、观察结果如何影响追问的资料卡。 |
| Self-RAG: Learning to Retrieve, Generate, and Critique, https://arxiv.org/abs/2310.11511 | 论文 | 支持“生成后自检/critique”的设计，不只是普通 RAG。 | 转化为生成问题后 critic 检查泛泛追问、无简历证据、无资料关键词的规则。 |
| Microsoft GraphRAG Query Overview, https://microsoft.github.io/graphrag/query/overview/ | 技术文档 | local/global/DRIFT/question generation 的拆分适合映射到简历局部证据和岗位通用题纲。 | 转化为“简历局部证据 + 技术域全局题纲”的检索设计。 |
| LLM-as-an-Interviewer, https://arxiv.org/abs/2412.10424 | 论文 | 强调动态多轮追问和最终报告，比静态题库更贴近面试训练。 | 转化为连续追问和复盘必须引用回答证据的资料卡。 |
| PyMuPDF OCR recipes, https://pymupdf.readthedocs.io/en/latest/recipes-ocr.html | 技术文档 | 支持扫描 PDF OCR，并说明 OCR 比文本提取更慢。 | 转化为“先文本层解析，失败后 OCR 兜底”的文件解析策略。 |
| MySQL InnoDB Transaction Isolation Levels, https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html | 官方文档 | 后端面试高频追问事务隔离、锁、并发扣减。 | 转化为库存/订单项目中的隔离级别、锁范围、失败重试追问。 |
| Redis Distributed Locks, https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/ | 官方文档 | Redis 锁是实习面试常见“背概念但落不到项目”的追问点。 | 转化为 token、TTL、释放校验、暂停超时等追问。 |
| Apache Kafka Design, https://kafka.apache.org/41/design/design/ | 官方文档 | exactly-once、producer idempotence、事务与业务幂等适合 MQ 追问。 | 转化为重复消费、offset 提交失败、业务副作用幂等追问。 |
| Milvus Reranking, https://milvus.io/docs/reranking.md | 官方文档 | RAG 项目真实性判断需要追 topK、rerank、召回坏例和评估。 | 转化为检索错因归因、rerank 阈值、召回质量指标追问。 |
| GPTInterviewer, https://github.com/jiatastic/GPTInterviewer | 开源产品 | 代表“简历 + JD + mock interview”的常见产品形态。 | 转化为竞品差异：不能停留在静态问题，需要连续技术追问和证据复盘。 |
