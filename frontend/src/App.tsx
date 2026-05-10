import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  Bot,
  ClipboardList,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
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
type ScenarioId = "project_deep_dive" | "backend_fundamentals" | "rag_agent_review";
type InterviewPhase = "opening" | "followup" | "summary" | "completed";

type InterviewMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sourceCards?: InterviewSourceCard[];
  questionTags?: string[];
  resumeEvidence?: string;
  riskHypothesis?: string;
};

type ScenarioSession = {
  messages: InterviewMessage[];
  answerInput: string;
  debrief: string;
  phase: InterviewPhase;
  round: number;
  maxRounds: number;
};

type InterviewResponse = {
  reply: string;
  phase: InterviewPhase;
  round: number;
  max_rounds: number;
  is_complete: boolean;
  model: string;
  source_cards?: InterviewSourceCard[];
  question_tags?: string[];
  resume_evidence?: string;
  risk_hypothesis?: string;
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

type InterviewSourceCard = {
  id: string;
  title: string;
  url: string;
  source_type: string;
  tags: string[];
  matched_terms: string[];
  score: number;
};

type ConfigResponse = {
  model: string;
  provider: string;
  api_base_url: string;
  api_key_configured: boolean;
};

type ScenarioOption = {
  id: ScenarioId;
  title: string;
  description: string;
  icon: typeof ClipboardList;
};

type SampleResume = {
  label: string;
  filename: string;
  jobTarget: string;
  text: string;
};

const scenarios: ScenarioOption[] = [
  {
    id: "project_deep_dive",
    title: "项目深挖压力面",
    description: "个人贡献、技术选型、指标、失败路径",
    icon: ClipboardList,
  },
  {
    id: "backend_fundamentals",
    title: "后端八股项目化追问",
    description: "Redis、MySQL、MQ、并发、接口、部署",
    icon: Server,
  },
  {
    id: "rag_agent_review",
    title: "RAG/Agent 项目真实性拷打",
    description: "数据、chunk、embedding、工具调用、评估",
    icon: Workflow,
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

function toApiMessages(messages: InterviewMessage[]) {
  return messages.map(({ role, content }) => ({ role, content }));
}

function createEmptySession(): ScenarioSession {
  return {
    messages: [],
    answerInput: "",
    debrief: "",
    phase: "opening",
    round: 0,
    maxRounds: 5,
  };
}

function createInitialSessions(): Record<ScenarioId, ScenarioSession> {
  return {
    project_deep_dive: createEmptySession(),
    backend_fundamentals: createEmptySession(),
    rag_agent_review: createEmptySession(),
  };
}

function hasAnyStartedSession(sessions: Record<ScenarioId, ScenarioSession>) {
  return Object.values(sessions).some((session) => session.messages.length > 0 || session.phase !== "opening");
}

function App() {
  const [scenario, setScenario] = useState<ScenarioId>("project_deep_dive");
  const [resumeText, setResumeText] = useState("");
  const [resumeFilename, setResumeFilename] = useState("");
  const [resumeWarning, setResumeWarning] = useState("");
  const [jobTarget, setJobTarget] = useState("后端开发实习");
  const [sessionsByScenario, setSessionsByScenario] = useState<Record<ScenarioId, ScenarioSession>>(createInitialSessions);
  const [error, setError] = useState("");
  const [modelName, setModelName] = useState("");
  const [providerName, setProviderName] = useState("DeepSeek");
  const [connectionState, setConnectionState] = useState<ConnectionState>("checking");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const requestInFlightRef = useRef(false);
  const apiBaseUrl = useMemo(getApiBaseUrl, []);

  const activeScenario = scenarios.find((item) => item.id === scenario) ?? scenarios[0];
  const activeSession = sessionsByScenario[scenario];
  const hasStarted = activeSession.messages.length > 0 || activeSession.phase !== "opening";
  const canStart = !isLoading && !isUploading;
  const canAnswer = hasStarted && activeSession.phase !== "completed" && activeSession.answerInput.trim().length > 0 && !isLoading;
  const resumeCharCount = resumeText.trim().length;

  function replaceScenarioSession(scenarioId: ScenarioId, nextSession: ScenarioSession) {
    setSessionsByScenario((current) => ({ ...current, [scenarioId]: nextSession }));
  }

  function resetAllSessions() {
    setSessionsByScenario(createInitialSessions());
  }

  function updateResume(nextText: string, nextFilename = resumeFilename, nextWarning = "") {
    setResumeText(nextText);
    setResumeFilename(nextFilename);
    setResumeWarning(nextWarning);
    setError("");
    if (hasAnyStartedSession(sessionsByScenario)) {
      resetAllSessions();
    }
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

  async function requestInterview(nextPhase: InterviewPhase, nextRound: number, nextMessages: InterviewMessage[], scenarioId: ScenarioId) {
    const response = await fetch(`${apiBaseUrl}/interview/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scenario: scenarioId,
        phase: nextPhase,
        round: nextRound,
        max_rounds: sessionsByScenario[scenarioId].maxRounds,
        resume_text: resumeText.trim(),
        resume_filename: resumeFilename,
        job_target: jobTarget.trim(),
        messages: toApiMessages(nextMessages),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "请求失败，请稍后重试。");
    }
    return data as InterviewResponse;
  }

  function applyInterviewResponse(data: InterviewResponse, nextMessages: InterviewMessage[], scenarioId: ScenarioId) {
    const assistantMessage: InterviewMessage = {
      id: createMessageId(),
      role: "assistant",
      content: data.reply,
      sourceCards: data.source_cards ?? [],
      questionTags: data.question_tags ?? [],
      resumeEvidence: data.resume_evidence ?? "",
      riskHypothesis: data.risk_hypothesis ?? "",
    };
    const allMessages = [...nextMessages, assistantMessage];
    replaceScenarioSession(scenarioId, {
      ...sessionsByScenario[scenarioId],
      messages: allMessages,
      answerInput: "",
      debrief: data.is_complete ? data.reply : sessionsByScenario[scenarioId].debrief,
      phase: data.phase,
      round: data.round,
      maxRounds: data.max_rounds,
    });
    setModelName(data.model);
    setConnectionState("ready");
  }

  async function startInterview() {
    if (!beginRequest()) {
      return;
    }
    if (resumeText.trim().length < 30) {
      finishRequest();
      setError("请先上传或粘贴至少 30 个字的简历内容，面试官才能围绕简历细节追问。");
      return;
    }

    const scenarioId = scenario;
    const emptySession = createEmptySession();
    replaceScenarioSession(scenarioId, emptySession);
    setError("");

    try {
      const data = await requestInterview("opening", 0, [], scenarioId);
      applyInterviewResponse(data, [], scenarioId);
      setTimeout(() => answerRef.current?.focus(), 0);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "请求失败，请稍后重试。";
      setError(message);
    } finally {
      finishRequest();
    }
  }

  async function sendAnswer(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = activeSession.answerInput.trim();
    if (!content || activeSession.phase === "completed" || !beginRequest()) {
      return;
    }

    const scenarioId = scenario;
    const userMessage: InterviewMessage = {
      id: createMessageId(),
      role: "user",
      content,
    };
    const nextMessages = [...activeSession.messages, userMessage];
    replaceScenarioSession(scenarioId, { ...activeSession, messages: nextMessages, answerInput: "" });
    setError("");

    try {
      const data = await requestInterview("followup", activeSession.round, nextMessages, scenarioId);
      applyInterviewResponse(data, nextMessages, scenarioId);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "请求失败，请稍后重试。";
      setError(message);
    } finally {
      finishRequest();
      answerRef.current?.focus();
    }
  }

  async function endAndDebrief() {
    if (!hasStarted || !beginRequest()) {
      return;
    }
    const scenarioId = scenario;
    const pendingAnswer = activeSession.answerInput.trim()
      ? [
          ...activeSession.messages,
          {
            id: createMessageId(),
            role: "user" as const,
            content: activeSession.answerInput.trim(),
          },
        ]
      : activeSession.messages;

    replaceScenarioSession(scenarioId, { ...activeSession, messages: pendingAnswer, answerInput: "" });
    setError("");

    try {
      const data = await requestInterview("summary", activeSession.round, pendingAnswer, scenarioId);
      applyInterviewResponse(data, pendingAnswer, scenarioId);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "请求失败，请稍后重试。";
      setError(message);
    } finally {
      finishRequest();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendAnswer();
    }
  }

  function resetInterview() {
    replaceScenarioSession(scenario, createEmptySession());
    setError("");
    answerRef.current?.focus();
  }

  function updateAnswerInput(value: string) {
    replaceScenarioSession(scenario, { ...activeSession, answerInput: value });
  }

  function useSampleResume(sample: SampleResume) {
    setJobTarget(sample.jobTarget);
    updateResume(sample.text, sample.filename);
  }

  const statusText = {
    checking: "连接中",
    ready: modelName || "已连接",
    "missing-key": "密钥未配置",
    error: "连接异常",
  }[connectionState];

  return (
    <main className="app-shell">
      <section className="interview-workspace" aria-label="AI 模拟面试官训练工作台">
        <aside className="control-panel">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="eyebrow">AI Agent Challenge</p>
              <h1>AI 模拟面试官</h1>
              <p className="brand-subtitle">让简历经得起技术追问</p>
            </div>
          </div>

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

          <div className="field-group">
            <span className="field-label">训练场景</span>
            <div className="scenario-list" role="radiogroup" aria-label="训练场景">
              {scenarios.map((item) => {
                const Icon = item.icon;
                const session = sessionsByScenario[item.id];
                return (
                  <button
                    aria-checked={scenario === item.id}
                    className={`scenario-option ${scenario === item.id ? "scenario-active" : ""}`}
                    key={item.id}
                    onClick={() => setScenario(item.id)}
                    role="radio"
                    type="button"
                  >
                    <Icon size={17} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{session.messages.length ? `已进行 ${session.round} 轮` : item.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
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

          <div className="button-row">
            <button className="primary-button" type="button" onClick={startInterview} disabled={!canStart}>
              {isLoading && !hasStarted ? <Loader2 className="spin" size={17} /> : <Play size={17} />}
              <span>{hasStarted ? "重新开始该场景" : "开始面试"}</span>
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
              <p className="section-label">{activeScenario.title}</p>
              <h2>简历追问训练</h2>
            </div>
            <div className="round-meter" aria-label="面试轮次">
              <span>
                第 {activeSession.round} / {activeSession.maxRounds} 轮
              </span>
              <strong>{activeSession.phase === "completed" ? "已复盘" : hasStarted ? "进行中" : "待开始"}</strong>
            </div>
          </header>

          <div className="message-timeline" aria-live="polite">
            {activeSession.messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Bot size={26} />
                </div>
                <h3>上传简历，开始被追问</h3>
                <p>每个训练场景会保留独立对话；切换场景后可以从同一份简历开启不同面试。</p>
              </div>
            ) : (
              activeSession.messages.map((message) => (
                <article className={`message message-${message.role}`} key={message.id}>
                  <span className="avatar">{message.role === "user" ? <UserRound size={16} /> : <Bot size={16} />}</span>
                  <div>
                    <span className="message-role">{message.role === "user" ? "候选人" : "AI 面试官"}</span>
                    <p>{message.content}</p>
                    {message.role === "assistant" && (message.sourceCards?.length || message.resumeEvidence || message.riskHypothesis) ? (
                      <section className="evidence-panel" aria-label="本轮追问依据">
                        <div className="evidence-row">
                          <strong>简历证据</strong>
                          <span>{message.resumeEvidence || "已基于当前简历抽取项目线索"}</span>
                        </div>
                        <div className="evidence-row">
                          <strong>风险假设</strong>
                          <span>{message.riskHypothesis || "围绕项目真实性和工程闭环继续追问"}</span>
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
                  <p className="typing">正在追问...</p>
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
              placeholder={hasStarted ? "输入你的回答，Enter 发送，Shift+Enter 换行" : "先上传或粘贴简历并开始该场景面试"}
              rows={3}
              disabled={isLoading || !hasStarted || activeSession.phase === "completed"}
            />
            <div className="composer-actions">
              <button className="send-button" type="submit" disabled={!canAnswer}>
                {isLoading && hasStarted ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                <span>发送回答</span>
              </button>
              <button className="secondary-button" type="button" onClick={endAndDebrief} disabled={isLoading || !hasStarted}>
                <ClipboardList size={17} />
                <span>结束并复盘</span>
              </button>
              <button className="ghost-button" type="button" onClick={resetInterview} disabled={isLoading}>
                <RotateCcw size={16} />
                <span>重练该场景</span>
              </button>
            </div>
          </form>
        </section>

        <aside className="debrief-panel" aria-label="面试复盘">
          <header className="debrief-header">
            <p className="section-label">Debrief</p>
            <h2>结构化复盘</h2>
          </header>
          {activeSession.debrief ? (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeSession.debrief}</ReactMarkdown>
            </div>
          ) : (
            <div className="debrief-empty">
              <ClipboardList size={28} />
              <h3>复盘会出现在这里</h3>
              <p>结束当前场景后，你会看到总评、挂点、维度反馈和下一轮行动。</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

export default App;
