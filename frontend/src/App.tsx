import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  BrainCircuit,
  ClipboardList,
  Code,
  Cpu,
  Database,
  FileText,
  House,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Server,
  Sparkles,
  Upload,
  UserRound,
  Wifi,
  Workflow,
} from "lucide-react";

type ChatRole = "user" | "assistant";
type ConnectionState = "checking" | "ready" | "missing-key" | "error";
type TrainingMode = "knowledge" | "resume" | "coding" | "full_mock";
type KnowledgeCategoryId = "backend_database" | "search_ads_rec" | "agent_llm" | "ai_algorithm";
type ResumeScenarioId = "project_deep_dive" | "backend_fundamentals" | "rag_agent_review";
type CodingCategoryId = "leetcode_core" | "ai_ops";
type TrainingPhase = "opening" | "followup" | "summary" | "completed";
type IconComponent = typeof ClipboardList;

type InterviewSourceCard = {
  id: string;
  title: string;
  url: string;
  source_type: string;
  tags: string[];
  matched_terms: string[];
  score: number;
};

type TrainingItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  prompt: string;
  difficulty: string;
  tags: string[];
  starter_code: string;
  source_url: string;
};

type TrainingMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sourceCards?: InterviewSourceCard[];
  questionTags?: string[];
  resumeEvidence?: string;
  riskHypothesis?: string;
};

type TrainingSession = {
  messages: TrainingMessage[];
  answerInput: string;
  debrief: string;
  phase: TrainingPhase;
  round: number;
  maxRounds: number;
  item?: TrainingItem;
};

type TrainingResponse = {
  reply: string;
  phase: TrainingPhase;
  round: number;
  max_rounds: number;
  is_complete: boolean;
  model: string;
  source_cards?: InterviewSourceCard[];
  question_tags?: string[];
  resume_evidence?: string;
  risk_hypothesis?: string;
  feedback?: string;
  item?: TrainingItem | null;
};

type ResumeExtractResponse = {
  filename: string;
  content_type: string;
  text: string;
  character_count: number;
  truncated: boolean;
  extraction_method: "text" | "ocr" | "docx" | "txt";
  ocr_used: boolean;
  page_count: number | null;
  warning: string;
};

type ConfigResponse = {
  model: string;
  provider: string;
  api_base_url: string;
  api_key_configured: boolean;
};

type ModeOption = {
  id: TrainingMode;
  title: string;
  description: string;
  detail: string;
  icon: IconComponent;
};

type CategoryOption<T extends string> = {
  id: T;
  title: string;
  description: string;
  icon: IconComponent;
};

type SampleResume = {
  label: string;
  filename: string;
  jobTarget: string;
  text: string;
};

const modeOptions: ModeOption[] = [
  {
    id: "knowledge",
    title: "八股知识点",
    description: "纯知识点专项追问",
    detail: "后端数据库、搜广推、Agent/LLM、AI算法分类练习",
    icon: BookOpen,
  },
  {
    id: "resume",
    title: "简历经历",
    description: "上传简历后按项目追问",
    detail: "围绕项目真实性、个人贡献、失败路径和工程闭环复盘",
    icon: ClipboardList,
  },
  {
    id: "coding",
    title: "手撕代码",
    description: "算法题和 AI 算子评审",
    detail: "LeetCode 高频题、MHA/Attention/LayerNorm 等实现题",
    icon: Code,
  },
  {
    id: "full_mock",
    title: "完整模拟",
    description: "一场完整技术面试",
    detail: "AI 根据简历和回答判断下一问，覆盖项目、相关八股、手撕和综合追问",
    icon: Workflow,
  },
];

const knowledgeCategories: CategoryOption<KnowledgeCategoryId>[] = [
  {
    id: "backend_database",
    title: "后端 / 数据库",
    description: "MySQL、Redis、MQ、并发、稳定性",
    icon: Database,
  },
  {
    id: "search_ads_rec",
    title: "搜广推",
    description: "召回、排序、CTR/CVR、A/B 实验",
    icon: Search,
  },
  {
    id: "agent_llm",
    title: "Agent / LLM",
    description: "RAG、工具调用、推理、采样、KV cache",
    icon: BrainCircuit,
  },
  {
    id: "ai_algorithm",
    title: "AI 算法",
    description: "Transformer、VAE、Diffusion、损失函数",
    icon: Cpu,
  },
];

const resumeScenarios: CategoryOption<ResumeScenarioId>[] = [
  {
    id: "project_deep_dive",
    title: "项目深挖压力面",
    description: "个人贡献、技术选型、指标、失败路径",
    icon: ClipboardList,
  },
  {
    id: "backend_fundamentals",
    title: "后端项目追问",
    description: "Redis、MySQL、MQ、并发、接口、部署",
    icon: Server,
  },
  {
    id: "rag_agent_review",
    title: "RAG/Agent 项目追问",
    description: "数据、chunk、embedding、工具调用、评估",
    icon: Workflow,
  },
];

const codingCategories: CategoryOption<CodingCategoryId>[] = [
  {
    id: "leetcode_core",
    title: "LeetCode 高频算法",
    description: "链表、哈希、堆、动态规划、区间题",
    icon: Layers,
  },
  {
    id: "ai_ops",
    title: "AI 算子 / 模型实现",
    description: "Attention、MHA、LayerNorm、采样实现",
    icon: Code,
  },
];

const sampleResumes: SampleResume[] = [
  {
    label: "RAG 简历",
    filename: "sample-rag-resume.txt",
    jobTarget: "AI 应用开发实习",
    text: "候选人：某高校计算机本科，GPA 3.7/4.0。\n技能：Python、FastAPI、Milvus、bge embedding、rerank、Docker、LangGraph。\n项目一：智能课程问答系统。使用 FastAPI 提供后端接口，把课程 PDF 解析后切分写入向量库，通过 embedding 检索相关片段，再调用 DeepSeek API 生成回答。我负责 PDF 解析、chunk 策略、检索链路、Prompt 调优和 Docker 部署。做过坏例分析，比如相似课程章节召回导致答案混淆。\n项目二：多 Agent 简历修改助手。使用 LangGraph 管理规划、检索、修改、审阅节点，负责状态对象设计和工具调用。",
  },
  {
    label: "后端简历",
    filename: "sample-backend-resume.txt",
    jobTarget: "后端开发实习",
    text: "候选人：计算机本科。\n技能：Java、Spring Boot、MySQL、Redis、RabbitMQ、Docker。\n项目：校园二手交易平台。负责商品发布、订单、支付回调、库存扣减、缓存和消息异步通知。使用 Redis 缓存商品详情，RabbitMQ 发送订单状态变更通知，MySQL 保存订单和库存。写过 Docker Compose 部署，做过压测但简历没有写清楚基线和指标。",
  },
  {
    label: "全栈/OJ 简历",
    filename: "sample-oj-resume.txt",
    jobTarget: "全栈开发实习",
    text: "候选人：软件工程本科。\n技能：React、FastAPI、PostgreSQL、Redis、Docker、Python。\n项目：在线判题系统 OJ。负责题目管理、提交队列、判题 worker、结果回写和权限控制。简历写 QPS 提升 40%，但没有说明优化前基线、压测方法和瓶颈定位。系统通过 Docker 部署，Redis 用于提交状态缓存。",
  },
];

const appVersion = import.meta.env.VITE_APP_VERSION || "dev";
const buildTime = import.meta.env.VITE_BUILD_TIME || "local";

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  return configured ? configured.replace(/\/$/, "") : "/api";
}

function createMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toApiMessages(messages: TrainingMessage[]) {
  return messages.map(({ role, content }) => ({ role, content }));
}

function createEmptySession(maxRounds = 5): TrainingSession {
  return {
    messages: [],
    answerInput: "",
    debrief: "",
    phase: "opening",
    round: 0,
    maxRounds,
  };
}

function getSessionKey(mode: TrainingMode, categoryId: string) {
  return `${mode}:${categoryId}`;
}

function App() {
  const [mode, setMode] = useState<TrainingMode | null>(null);
  const [knowledgeCategory, setKnowledgeCategory] = useState<KnowledgeCategoryId>("backend_database");
  const [resumeScenario, setResumeScenario] = useState<ResumeScenarioId>("project_deep_dive");
  const [codingCategory, setCodingCategory] = useState<CodingCategoryId>("leetcode_core");
  const [language, setLanguage] = useState("Python");
  const [resumeText, setResumeText] = useState("");
  const [resumeFilename, setResumeFilename] = useState("");
  const [resumeWarning, setResumeWarning] = useState("");
  const [jobTarget, setJobTarget] = useState("后端开发实习");
  const [sessionsByKey, setSessionsByKey] = useState<Record<string, TrainingSession>>({});
  const [error, setError] = useState("");
  const [modelName, setModelName] = useState("");
  const [providerName, setProviderName] = useState("DeepSeek");
  const [connectionState, setConnectionState] = useState<ConnectionState>("checking");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const requestInFlightRef = useRef(false);
  const apiBaseUrl = useMemo(getApiBaseUrl, []);

  const selectedMode = mode ?? "knowledge";
  const activeModeOption = modeOptions.find((item) => item.id === selectedMode) ?? modeOptions[0];
  const activeCategoryId =
    selectedMode === "knowledge"
      ? knowledgeCategory
      : selectedMode === "resume"
        ? resumeScenario
        : selectedMode === "coding"
          ? codingCategory
          : "full_mock";
  const activeSessionKey = getSessionKey(selectedMode, activeCategoryId);
  const activeSession = sessionsByKey[activeSessionKey] ?? createEmptySession();
  const hasStarted = activeSession.messages.length > 0 || activeSession.phase !== "opening";
  const canStart = mode !== null && !isLoading && !isUploading;
  const canAnswer = hasStarted && activeSession.phase !== "completed" && activeSession.answerInput.trim().length > 0 && !isLoading;
  const resumeCharCount = resumeText.trim().length;

  function replaceSession(sessionKey: string, nextSession: TrainingSession) {
    setSessionsByKey((current) => ({ ...current, [sessionKey]: nextSession }));
  }

  function clearResumeSessions() {
    setSessionsByKey((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([sessionKey]) => !sessionKey.startsWith("resume:") && !sessionKey.startsWith("full_mock:"),
        ),
      ),
    );
  }

  function focusAnswerInput() {
    setTimeout(() => {
      answerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      answerRef.current?.focus();
    }, 0);
  }

  function updateResume(nextText: string, nextFilename = resumeFilename, nextWarning = "") {
    setResumeText(nextText);
    setResumeFilename(nextFilename);
    setResumeWarning(nextWarning);
    setError("");
    clearResumeSessions();
  }

  async function loadConfig() {
    setConnectionState("checking");
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/config`);
      const data = (await response.json()) as ConfigResponse;
      if (!response.ok) {
        throw new Error("无法读取后端配置。");
      }
      setModelName(data.model);
      setProviderName(data.provider || "DeepSeek");
      setConnectionState(data.api_key_configured ? "ready" : "missing-key");
      if (!data.api_key_configured) {
        setError("后端未读取到 API Key，请检查服务器上的 .env 配置并重启 Docker。");
      }
    } catch {
      setConnectionState("error");
      setError("3000 页面已打开，但无法通过 /api 连接后端。请检查 Docker 服务状态。");
    }
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  function beginRequest() {
    if (requestInFlightRef.current) {
      return false;
    }
    requestInFlightRef.current = true;
    setIsLoading(true);
    return true;
  }

  function finishRequest() {
    requestInFlightRef.current = false;
    setIsLoading(false);
  }

  async function uploadResume(file: File) {
    if (isLoading || isUploading) {
      return;
    }
    setIsUploading(true);
    setError("");
    setResumeWarning("");

    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(`${apiBaseUrl}/resume/extract`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "简历解析失败，请换一个文件或直接粘贴简历文本。");
      }
      const resumeData = data as ResumeExtractResponse;
      const methodNote = resumeData.ocr_used ? "已对扫描 PDF 使用本地 OCR，请检查错别字后开始面试。" : "";
      updateResume(resumeData.text, resumeData.filename, [resumeData.warning, methodNote].filter(Boolean).join(" "));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "简历解析失败，请稍后重试。";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void uploadResume(file);
    }
    event.target.value = "";
  }

  function buildRequestBody(
    nextPhase: TrainingPhase,
    nextRound: number,
    nextMessages: TrainingMessage[],
    requestMode: TrainingMode,
    categoryId: string,
    session: TrainingSession,
    codeAnswer = "",
  ) {
    return {
      mode: requestMode,
      category: categoryId,
      phase: nextPhase,
      round: nextRound,
      max_rounds: session.maxRounds,
      messages: toApiMessages(nextMessages),
      resume_text: requestMode === "resume" || requestMode === "full_mock" ? resumeText.trim() : "",
      resume_filename: requestMode === "resume" || requestMode === "full_mock" ? resumeFilename : "",
      job_target: requestMode === "resume" || requestMode === "full_mock" ? jobTarget.trim() : "",
      topic_id: requestMode === "knowledge" ? session.item?.id ?? "" : "",
      problem_id: requestMode === "coding" ? session.item?.id ?? "" : "",
      language: requestMode === "coding" ? language.trim() || "Python" : "",
      code_answer: requestMode === "coding" ? codeAnswer : "",
    };
  }

  async function requestTraining(
    nextPhase: TrainingPhase,
    nextRound: number,
    nextMessages: TrainingMessage[],
    requestMode: TrainingMode,
    categoryId: string,
    session: TrainingSession,
    codeAnswer = "",
  ) {
    const response = await fetch(`${apiBaseUrl}/training/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRequestBody(nextPhase, nextRound, nextMessages, requestMode, categoryId, session, codeAnswer)),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "请求失败，请稍后重试。");
    }
    return data as TrainingResponse;
  }

  function applyTrainingResponse(data: TrainingResponse, nextMessages: TrainingMessage[], sessionKey: string) {
    const baseSession = sessionsByKey[sessionKey] ?? createEmptySession();
    const assistantMessage: TrainingMessage = {
      id: createMessageId(),
      role: "assistant",
      content: data.reply,
      sourceCards: data.source_cards ?? [],
      questionTags: data.question_tags ?? [],
      resumeEvidence: data.resume_evidence ?? "",
      riskHypothesis: data.risk_hypothesis ?? "",
    };
    const allMessages = [...nextMessages, assistantMessage];
    replaceSession(sessionKey, {
      ...baseSession,
      messages: allMessages,
      answerInput: "",
      debrief: data.is_complete ? data.reply : baseSession.debrief,
      phase: data.phase,
      round: data.round,
      maxRounds: data.max_rounds,
      item: data.item ?? baseSession.item,
    });
    setModelName(data.model);
    setConnectionState("ready");
  }

  function getActiveContext() {
    if (!mode) {
      return null;
    }
    const categoryId =
      mode === "knowledge" ? knowledgeCategory : mode === "resume" ? resumeScenario : mode === "coding" ? codingCategory : "full_mock";
    return {
      mode,
      categoryId,
      sessionKey: getSessionKey(mode, categoryId),
      session: sessionsByKey[getSessionKey(mode, categoryId)] ?? createEmptySession(),
    };
  }

  async function startTraining() {
    const context = getActiveContext();
    if (!context || !beginRequest()) {
      return;
    }
    if ((context.mode === "resume" || context.mode === "full_mock") && resumeText.trim().length < 30) {
      finishRequest();
      setError("请先上传或粘贴至少 30 个字的简历内容，面试官才能围绕简历细节追问。");
      return;
    }

    const emptySession = createEmptySession(context.mode === "full_mock" ? 8 : 5);
    replaceSession(context.sessionKey, emptySession);
    setError("");

    try {
      const data = await requestTraining("opening", 0, [], context.mode, context.categoryId, emptySession);
      applyTrainingResponse(data, [], context.sessionKey);
      focusAnswerInput();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "请求失败，请稍后重试。";
      setError(message);
    } finally {
      finishRequest();
    }
  }

  async function sendAnswer(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const context = getActiveContext();
    if (!context) {
      return;
    }
    const content = context.session.answerInput.trim();
    if (!content || context.session.phase === "completed" || !beginRequest()) {
      return;
    }

    const userMessage: TrainingMessage = {
      id: createMessageId(),
      role: "user",
      content,
    };
    const nextMessages = [...context.session.messages, userMessage];
    replaceSession(context.sessionKey, { ...context.session, messages: nextMessages, answerInput: "" });
    setError("");

    try {
      const data = await requestTraining(
        "followup",
        context.session.round,
        nextMessages,
        context.mode,
        context.categoryId,
        context.session,
        context.mode === "coding" ? content : "",
      );
      applyTrainingResponse(data, nextMessages, context.sessionKey);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "请求失败，请稍后重试。";
      setError(message);
    } finally {
      finishRequest();
      focusAnswerInput();
    }
  }

  async function endAndDebrief() {
    const context = getActiveContext();
    if (!context || !hasStarted || !beginRequest()) {
      return;
    }
    const pendingAnswer = context.session.answerInput.trim()
      ? [
          ...context.session.messages,
          {
            id: createMessageId(),
            role: "user" as const,
            content: context.session.answerInput.trim(),
          },
        ]
      : context.session.messages;

    replaceSession(context.sessionKey, { ...context.session, messages: pendingAnswer, answerInput: "" });
    setError("");

    try {
      const data = await requestTraining(
        "summary",
        context.session.round,
        pendingAnswer,
        context.mode,
        context.categoryId,
        context.session,
        context.mode === "coding" ? context.session.answerInput.trim() : "",
      );
      applyTrainingResponse(data, pendingAnswer, context.sessionKey);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "请求失败，请稍后重试。";
      setError(message);
    } finally {
      finishRequest();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (selectedMode !== "coding" && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendAnswer();
    }
  }

  function resetTraining() {
    replaceSession(activeSessionKey, createEmptySession(selectedMode === "full_mock" ? 8 : 5));
    setError("");
    focusAnswerInput();
  }

  function updateAnswerInput(value: string) {
    replaceSession(activeSessionKey, { ...activeSession, answerInput: value });
  }

  function useSampleResume(sample: SampleResume) {
    setJobTarget(sample.jobTarget);
    updateResume(sample.text, sample.filename);
  }

  function enterMode(nextMode: TrainingMode) {
    setMode(nextMode);
    setError("");
    setTimeout(() => answerRef.current?.focus(), 0);
  }

  const statusText = {
    checking: "连接中",
    ready: modelName || "已连接",
    "missing-key": "密钥未配置",
    error: "连接异常",
  }[connectionState];

  const panelTitle =
    selectedMode === "knowledge"
      ? "八股专项训练"
      : selectedMode === "resume"
        ? "简历经历追问"
        : selectedMode === "coding"
          ? "手撕代码训练"
          : "完整模拟面试";
  const emptyState = {
    knowledge: {
      title: "选择分类，开始八股追问",
      body: "AI 会围绕所选方向连续提问，并在你回答后指出知识漏洞和表达问题。",
    },
    resume: {
      title: "上传简历，开始被追问",
      body: "每个简历追问场景会保留独立对话；同一份简历可以分别练项目深挖、后端和 RAG/Agent。",
    },
    coding: {
      title: "选择题类，开始手撕代码",
      body: "先讲思路和复杂度，再粘贴代码；AI 会按正确性、边界和表达给反馈。",
    },
    full_mock: {
      title: "上传简历，开始完整模拟",
      body: "完整模拟会由 AI 判断下一问方向，覆盖简历深挖、简历相关八股、手撕代码和综合追问，每个板块至少两轮。",
    },
  }[selectedMode];
  const answerPlaceholder =
    selectedMode === "coding"
      ? "粘贴你的思路、复杂度分析和代码。手撕代码模式支持多行输入，请用按钮提交。"
      : hasStarted
        ? "输入你的回答，Enter 发送，Shift+Enter 换行"
        : selectedMode === "resume" || selectedMode === "full_mock"
          ? "先上传或粘贴简历并开始该场景面试"
          : "先选择分类并开始训练";

  function renderCategoryOptions<T extends string>(
    label: string,
    options: CategoryOption<T>[],
    current: T,
    onSelect: (next: T) => void,
  ) {
    return (
      <div className="field-group">
        <span className="field-label">{label}</span>
        <div className="scenario-list" role="radiogroup" aria-label={label}>
          {options.map((item) => {
            const Icon = item.icon;
            const session = sessionsByKey[getSessionKey(selectedMode, item.id)];
            return (
              <button
                aria-checked={current === item.id}
                className={`scenario-option ${current === item.id ? "scenario-active" : ""}`}
                key={item.id}
                onClick={() => onSelect(item.id)}
                role="radio"
                type="button"
              >
                <Icon size={17} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{session?.messages.length ? `已进行 ${session.round} 轮` : item.description}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderModeControls() {
    if (selectedMode === "knowledge") {
      return (
        <>
          {renderCategoryOptions("八股分类", knowledgeCategories, knowledgeCategory, setKnowledgeCategory)}
          <div className="training-note">
            <strong>训练方式</strong>
            <span>不需要简历。开始后按所选分类抽取知识点，回答后会先指出问题再继续追问。</span>
          </div>
        </>
      );
    }

    if (selectedMode === "coding") {
      return (
        <>
          {renderCategoryOptions("题目类型", codingCategories, codingCategory, setCodingCategory)}
          <label className="field-group" htmlFor="coding-language">
            <span className="field-label">编程语言</span>
            <input
              id="coding-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              placeholder="Python / Java / C++"
              disabled={isLoading}
            />
          </label>
          <div className="training-note">
            <strong>评审方式</strong>
            <span>这一版不运行代码，重点检查思路、复杂度、边界样例和 AI 算子 shape/数值稳定性。</span>
          </div>
        </>
      );
    }

    if (selectedMode === "full_mock") {
      return (
        <>
          <div className="training-note">
            <strong>完整模拟流程</strong>
            <span>需要简历。AI 会根据简历和回答判断下一问方向，覆盖简历深挖、简历相关八股、手撕代码和综合追问，每个板块至少两轮，结束后生成完整报告。</span>
          </div>

          <div className="field-group">
            <span className="field-label">上传简历</span>
            <label className="upload-card" htmlFor="resume-file">
              <Upload size={18} />
              <span>{isUploading ? "正在解析..." : resumeFilename || "选择 PDF / DOCX / TXT 简历"}</span>
              <small>{resumeCharCount ? `${resumeCharCount} 字符已就绪` : "文本 PDF 直接解析，扫描 PDF 会尝试 OCR"}</small>
            </label>
            <input
              id="resume-file"
              aria-label="上传简历文件"
              className="file-input"
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleFileChange}
              disabled={isLoading || isUploading}
            />
            {resumeWarning ? <p className="warning-note">{resumeWarning}</p> : null}
          </div>

          <label className="field-group" htmlFor="resume-text">
            <span className="field-label">简历内容（可粘贴备用）</span>
            <textarea
              id="resume-text"
              value={resumeText}
              onChange={(event) => updateResume(event.target.value, resumeFilename || "manual-resume.txt")}
              placeholder="完整模拟建议提供完整简历，包含教育经历、技能、项目、实习和目标岗位。"
              rows={7}
              disabled={isLoading || isUploading}
            />
          </label>

          <label className="field-group" htmlFor="job-target">
            <span className="field-label">目标岗位</span>
            <input
              id="job-target"
              value={jobTarget}
              onChange={(event) => setJobTarget(event.target.value)}
              placeholder="例如：后端开发实习、AI 应用开发实习"
              disabled={isLoading || isUploading}
            />
          </label>

          <div className="sample-buttons" aria-label="样例简历">
            {sampleResumes.map((sample) => (
              <button className="secondary-button compact-text" key={sample.filename} type="button" onClick={() => useSampleResume(sample)} disabled={isLoading || isUploading}>
                <FileText size={15} />
                <span>{sample.label}</span>
              </button>
            ))}
          </div>
        </>
      );
    }

    return (
      <>
        {renderCategoryOptions("简历追问场景", resumeScenarios, resumeScenario, setResumeScenario)}

        <div className="field-group">
          <span className="field-label">上传简历</span>
          <label className="upload-card" htmlFor="resume-file">
            <Upload size={18} />
            <span>{isUploading ? "正在解析..." : resumeFilename || "选择 PDF / DOCX / TXT 简历"}</span>
            <small>{resumeCharCount ? `${resumeCharCount} 字符已就绪` : "文本 PDF 直接解析，扫描 PDF 会尝试 OCR"}</small>
          </label>
          <input
            id="resume-file"
            aria-label="上传简历文件"
            className="file-input"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handleFileChange}
            disabled={isLoading || isUploading}
          />
          {resumeWarning ? <p className="warning-note">{resumeWarning}</p> : null}
        </div>

        <label className="field-group" htmlFor="resume-text">
          <span className="field-label">简历内容（可粘贴备用）</span>
          <textarea
            id="resume-text"
            value={resumeText}
            onChange={(event) => updateResume(event.target.value, resumeFilename || "manual-resume.txt")}
            placeholder="上传失败时，可以直接粘贴简历全文。建议包含教育经历、技能、项目、实习和目标岗位。"
            rows={7}
            disabled={isLoading || isUploading}
          />
        </label>

        <label className="field-group" htmlFor="job-target">
          <span className="field-label">目标岗位</span>
          <input
            id="job-target"
            value={jobTarget}
            onChange={(event) => setJobTarget(event.target.value)}
            placeholder="例如：后端开发实习、AI 应用开发实习"
            disabled={isLoading || isUploading}
          />
        </label>

        <div className="sample-buttons" aria-label="样例简历">
          {sampleResumes.map((sample) => (
            <button className="secondary-button compact-text" key={sample.filename} type="button" onClick={() => useSampleResume(sample)} disabled={isLoading || isUploading}>
              <FileText size={15} />
              <span>{sample.label}</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  const connectionCard = (
    <div className={`connection-card connection-${connectionState}`}>
      <div className="connection-title">
        <Wifi size={16} />
        <span>{providerName}</span>
        <button className="icon-button compact" type="button" onClick={loadConfig} aria-label="刷新连接状态">
          <RefreshCw size={15} />
        </button>
      </div>
      <strong>{statusText}</strong>
      <p>{connectionState === "ready" ? "3000 同源代理已启用" : "正在检查运行状态"}</p>
    </div>
  );

  if (!mode) {
    return (
      <main className="app-shell">
        <section className="landing-panel" aria-label="AI 模拟面试官训练入口">
          <header className="landing-header">
            <div className="brand-lockup">
              <div className="brand-mark">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="eyebrow">AI Agent Challenge</p>
                <h1>AI 模拟面试官</h1>
                <p className="brand-subtitle">选择一种训练方式，进入对应练习界面</p>
              </div>
            </div>
            <div className="landing-status">{connectionCard}</div>
          </header>

          <div className="mode-grid">
            {modeOptions.map((item) => {
              const Icon = item.icon;
              return (
                <button className="mode-card" key={item.id} onClick={() => enterMode(item.id)} type="button">
                  <span className="mode-icon">
                    <Icon size={26} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                    <em>{item.detail}</em>
                  </span>
                </button>
              );
            })}
          </div>

          {error ? (
            <div className="error-banner landing-error" role="alert">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="version-card landing-version" aria-label="版本信息">
            <span>版本 {appVersion}</span>
            <span>更新 {buildTime}</span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="interview-workspace" aria-label="AI 模拟面试官训练工作台">
        <aside className="control-panel training-control-panel">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="eyebrow">AI Agent Challenge</p>
              <h1>AI 模拟面试官</h1>
              <p className="brand-subtitle">{activeModeOption.description}</p>
            </div>
          </div>

          <button className="secondary-button back-button" type="button" onClick={() => setMode(null)} disabled={isLoading || isUploading}>
            <House size={16} />
            <span>返回训练首页</span>
          </button>

          {connectionCard}

          <div className="mode-tabs" aria-label="训练入口切换">
            {modeOptions.map((item) => {
              const Icon = item.icon;
              return (
                <button className={`mode-tab ${mode === item.id ? "mode-tab-active" : ""}`} key={item.id} onClick={() => enterMode(item.id)} type="button">
                  <Icon size={15} />
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>

          {renderModeControls()}

          <div className="button-row">
            <button className="primary-button" type="button" onClick={startTraining} disabled={!canStart}>
              {isLoading && !hasStarted ? <Loader2 className="spin" size={17} /> : <Play size={17} />}
              <span>{hasStarted ? "重新开始当前训练" : `开始${activeModeOption.title}`}</span>
            </button>
          </div>

          <div className="version-card" aria-label="版本信息">
            <span>版本 {appVersion}</span>
            <span>更新 {buildTime}</span>
          </div>
        </aside>

        <section className="interview-panel">
          <header className="panel-header">
            <div>
              <p className="section-label">{activeModeOption.title}</p>
              <h2>{panelTitle}</h2>
            </div>
            <div className="round-meter" aria-label="训练轮次">
              <span>
                第 {activeSession.round} / {activeSession.maxRounds} 轮
              </span>
              <strong>{activeSession.phase === "completed" ? "已复盘" : hasStarted ? "进行中" : "待开始"}</strong>
            </div>
          </header>

          <div className="message-timeline" aria-live="polite">
            {activeSession.item && selectedMode === "coding" ? (
              <section className="active-item-card" aria-label="当前手撕题目">
                <div>
                  <p className="section-label">{activeSession.item.difficulty || "Coding"}</p>
                  <h3>{activeSession.item.title}</h3>
                  <p>{activeSession.item.prompt}</p>
                </div>
                {activeSession.item.starter_code ? <pre className="problem-starter">{activeSession.item.starter_code}</pre> : null}
              </section>
            ) : null}

            {activeSession.item && selectedMode === "knowledge" ? (
              <section className="active-item-card compact-item" aria-label="当前八股知识点">
                <div>
                  <p className="section-label">当前知识点</p>
                  <h3>{activeSession.item.title}</h3>
                  <p>{activeSession.item.prompt}</p>
                </div>
              </section>
            ) : null}

            {activeSession.messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Bot size={26} />
                </div>
                <h3>{emptyState.title}</h3>
                <p>{emptyState.body}</p>
              </div>
            ) : (
              activeSession.messages.map((message) => (
                <article className={`message message-${message.role}`} key={message.id}>
                  <span className="avatar">{message.role === "user" ? <UserRound size={16} /> : <Bot size={16} />}</span>
                  <div>
                    <span className="message-role">{message.role === "user" ? "候选人" : "AI 面试官"}</span>
                    <div className="message-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                    {message.role === "assistant" && (message.sourceCards?.length || message.resumeEvidence || message.riskHypothesis) ? (
                      <section className="evidence-panel" aria-label="本轮追问依据">
                        <div className="evidence-row">
                          <strong>{selectedMode === "resume" || selectedMode === "full_mock" ? "简历证据" : "训练依据"}</strong>
                          <span>{message.resumeEvidence || "已基于当前训练项生成追问"}</span>
                        </div>
                        <div className="evidence-row">
                          <strong>{selectedMode === "coding" ? "评审重点" : "风险假设"}</strong>
                          <span>{message.riskHypothesis || "围绕当前训练目标继续追问"}</span>
                        </div>
                        {message.questionTags?.length ? (
                          <div className="tag-list" aria-label="问题标签">
                            {message.questionTags.slice(0, 6).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                        ) : null}
                        {message.sourceCards?.length ? (
                          <ul className="source-list">
                            {message.sourceCards.slice(0, 3).map((card) => (
                              <li key={card.id}>
                                <a href={card.url} target="_blank" rel="noreferrer">
                                  {card.title}
                                </a>
                                <small>{card.matched_terms.length ? card.matched_terms.slice(0, 4).join(" / ") : card.source_type}</small>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </section>
                    ) : null}
                  </div>
                </article>
              ))
            )}
            {isLoading ? (
              <article className="message message-assistant">
                <span className="avatar">
                  <Loader2 className="spin" size={16} />
                </span>
                <div>
                  <span className="message-role">AI 面试官</span>
                  <p className="typing">正在生成...</p>
                </div>
              </article>
            ) : null}
          </div>

          {error ? (
            <div className="error-banner" role="alert">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <form className="answer-composer" onSubmit={sendAnswer}>
            <textarea
              ref={answerRef}
              id="answer-input"
              aria-label="你的回答"
              value={activeSession.answerInput}
              onChange={(event) => updateAnswerInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={answerPlaceholder}
              rows={selectedMode === "coding" ? 7 : 3}
              disabled={isLoading || !hasStarted || activeSession.phase === "completed"}
            />
            <div className="composer-actions">
              <button className="send-button" type="submit" disabled={!canAnswer}>
                {isLoading && hasStarted ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                <span>{selectedMode === "coding" ? "提交代码" : "发送回答"}</span>
              </button>
              <button className="secondary-button" type="button" onClick={endAndDebrief} disabled={isLoading || !hasStarted}>
                <ClipboardList size={17} />
                <span>结束并复盘</span>
              </button>
              <button className="ghost-button" type="button" onClick={resetTraining} disabled={isLoading}>
                <RotateCcw size={16} />
                <span>重练当前项</span>
              </button>
            </div>
          </form>
        </section>

        <aside className="debrief-panel" aria-label="训练反馈">
          <header className="debrief-header">
            <p className="section-label">Debrief</p>
            <h2>结构化反馈</h2>
          </header>
          {activeSession.debrief ? (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeSession.debrief}</ReactMarkdown>
            </div>
          ) : (
            <div className="debrief-empty">
              <ClipboardList size={28} />
              <h3>复盘会出现在这里</h3>
              <p>结束当前训练后，你会看到总评、挂点、维度反馈和下一轮行动。</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

export default App;
