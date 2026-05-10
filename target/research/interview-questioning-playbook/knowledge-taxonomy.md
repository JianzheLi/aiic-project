# 基础八股与专项知识图谱

## 总体结构

面试训练不应按“题目列表”组织，而应按“项目暴露点 -> 基础知识 -> 专项深挖 -> 工程验证”组织。真实面试里，面试官经常先听项目，再抓一个技术词继续追问。

## 后端基础八股

- Java 基础：集合、HashMap、ConcurrentHashMap、异常、泛型、反射、类加载、JVM 内存、GC。
- 并发：线程池参数、拒绝策略、锁、CAS、ABA、AQS、ThreadLocal、并发容器。
- MySQL：索引、B+树、事务隔离、MVCC、锁、慢 SQL、Explain、binlog、主从、一致性。
- Redis：数据结构、持久化、过期淘汰、缓存穿透/击穿/雪崩、分布式锁、大 Key、热点 Key、集群。
- MQ：为什么引入、可靠投递、重复消费、幂等、顺序性、消息堆积、最终一致性。
- 网络/操作系统：TCP/HTTP、请求链路、进程线程、IO 模型、文件系统、内存管理。
- 系统设计：秒杀、点赞、报表导出、短链、Feed、搜索、限流、降级、监控和回滚。

## 算法与手撕题

- 基础模式：哈希、双指针、滑动窗口、二分、栈、队列、堆。
- 数据结构：链表、树、图、并查集、LRU、Trie。
- 动态规划：状态定义、初始化、转移、空间压缩、变体。
- 回溯/搜索：剪枝、visited、复杂度估算、边界恢复。
- 面试追问重点：复杂度证明、边界条件、变体升级、代码可读性、失败后如何定位。

## AI 应用专项

- RAG：数据来源、文档解析、chunk、embedding、混合检索、rerank、引用、拒答、权限、增量更新。
- RAG 评估：context relevance、groundedness、answer relevance、人工评估集、坏例回放、线上监控。
- Agent：ReAct、Plan-and-Execute、工具调用、状态、记忆、JSON 校验、超时重试、循环检测、可回放日志。
- Prompt：系统提示词、few-shot、结构化输出、回归测试、版本管理、安全边界。
- LLM 应用工程：FastAPI/异步、流式输出、成本、延迟、限流、降级、密钥管理、部署验证。

## 大模型算法与 AI Infra

- LLM 基础：Transformer、Attention、位置编码、MHA/MQA/GQA、SFT、RLHF、PPO/GRPO。
- PEFT：LoRA 原理、rank 选择、adapter 注入位置、显存收益、合并部署。
- 推理：prefill/decode、KV Cache、PagedAttention、continuous batching、量化、投机解码。
- 高性能：FlashAttention、kernel、显存带宽、吞吐/延迟 tradeoff。
- 训练/部署：DeepSpeed、Megatron-LM、TensorRT-LLM、vLLM、llama.cpp、Kubernetes GPU scheduling、DCGM/GPU 监控。

## 保研/老师/老板视角

- 经历真实性：时间线、个人贡献、项目规模、参与深度、可验证产出。
- 科研潜力：问题意识、方法选择、失败复盘、未来计划、导师方向匹配。
- 表达稳定性：自我介绍、压力题、不会的问题如何处理、是否不懂装懂。
- 评价标准：逻辑链、诚信、匹配度、行动证据、反问质量。
