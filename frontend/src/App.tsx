import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  Bot,
  ClipboardList,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Server,
  Sparkles,
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
};

type InterviewResponse = {
  reply: string;
  phase: InterviewPhase;
  round: number;
  max_rounds: number;
  is_complete: boolean;
  model: string;
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

const sampleProject =
  "我做了一个基于 RAG 的课程问答系统，使用 FastAPI 提供后端接口，把课程 PDF 切分后写入向量库，通过 embedding 检索相关片段，再调用大模型生成回答。我主要负责后端接口、检索链路、Prompt 调优和 Docker 部署，做过一些坏例分析，比如相似课程章节被召回导致答案混淆。";

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

function App() {
  const [scenario, setScenario] = useState<ScenarioId>("project_deep_dive");
  const [projectContext, setProjectContext] = useState("");
  const [jobTarget, setJobTarget] = useState("后端开发实习");
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [answerInput, setAnswerInput] = useState("");
  const [debrief, setDebrief] = useState("");
  const [phase, setPhase] = useState<InterviewPhase>("opening");
  const [round, setRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(5);
  const [error, setError] = useState("");
  const [modelName, setModelName] = useState("");
  const [providerName, setProviderName] = useState("DeepSeek");
  const [connectionState, setConnectionState] = useState<ConnectionState>("checking");
  const [isLoading, setIsLoading] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const requestInFlightRef = useRef(false);
  const apiBaseUrl = useMemo(getApiBaseUrl, []);

  const activeScenario = scenarios.find((item) => item.id === scenario) ?? scenarios[0];
  const hasStarted = messages.length > 0 || phase !== "opening";
  const canStart = !isLoading;
  const canAnswer = hasStarted && phase !== "completed" && answerInput.trim().length > 0 && !isLoading;

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

  async function requestInterview(nextPhase: InterviewPhase, nextRound: number, nextMessages: InterviewMessage[]) {
    const response = await fetch(`${apiBaseUrl}/interview/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scenario,
        phase: nextPhase,
        round: nextRound,
        max_rounds: maxRounds,
        project_context: projectContext.trim(),
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

  function applyInterviewResponse(data: InterviewResponse, nextMessages: InterviewMessage[]) {
    const assistantMessage: InterviewMessage = {
      id: createMessageId(),
      role: "assistant",
      content: data.reply,
    };
    const allMessages = [...nextMessages, assistantMessage];
    setMessages(allMessages);
    setPhase(data.phase);
    setRound(data.round);
    setMaxRounds(data.max_rounds);
    setModelName(data.model);
    setConnectionState("ready");
    if (data.is_complete) {
      setDebrief(data.reply);
    }
  }

  async function startInterview() {
    if (!beginRequest()) {
      return;
    }
    if (projectContext.trim().length < 30) {
      finishRequest();
      setError("请先粘贴至少 30 个字的项目经历，面试官才能围绕细节追问。");
      return;
    }

    setError("");
    setDebrief("");
    setMessages([]);
    setAnswerInput("");
    setPhase("opening");
    setRound(0);

    try {
      const data = await requestInterview("opening", 0, []);
      applyInterviewResponse(data, []);
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
    const content = answerInput.trim();
    if (!content || phase === "completed" || !beginRequest()) {
      return;
    }

    const userMessage: InterviewMessage = {
      id: createMessageId(),
      role: "user",
      content,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setAnswerInput("");
    setError("");

    try {
      const data = await requestInterview("followup", round, nextMessages);
      applyInterviewResponse(data, nextMessages);
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
    const pendingAnswer = answerInput.trim()
      ? [
          ...messages,
          {
            id: createMessageId(),
            role: "user" as const,
            content: answerInput.trim(),
          },
        ]
      : messages;

    setMessages(pendingAnswer);
    setAnswerInput("");
    setError("");

    try {
      const data = await requestInterview("summary", round, pendingAnswer);
      applyInterviewResponse(data, pendingAnswer);
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
    setMessages([]);
    setAnswerInput("");
    setDebrief("");
    setPhase("opening");
    setRound(0);
    setMaxRounds(5);
    setError("");
    answerRef.current?.focus();
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
              <p className="brand-subtitle">把项目经历练到经得起追问</p>
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
                      <small>{item.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="field-group" htmlFor="project-context">
            <span className="field-label">项目经历</span>
            <textarea
              id="project-context"
              value={projectContext}
              onChange={(event) => setProjectContext(event.target.value)}
              placeholder="粘贴你的简历项目、课程项目或实习项目经历..."
              rows={7}
              disabled={isLoading}
            />
          </label>

          <label className="field-group" htmlFor="job-target">
            <span className="field-label">目标岗位</span>
            <input
              id="job-target"
              value={jobTarget}
              onChange={(event) => setJobTarget(event.target.value)}
              placeholder="例如：后端开发实习、AI 应用开发实习"
              disabled={isLoading}
            />
          </label>

          <div className="button-row">
            <button className="primary-button" type="button" onClick={startInterview} disabled={!canStart}>
              {isLoading && !hasStarted ? <Loader2 className="spin" size={17} /> : <Play size={17} />}
              <span>开始面试</span>
            </button>
            <button className="secondary-button" type="button" onClick={() => setProjectContext(sampleProject)} disabled={isLoading}>
              <ClipboardList size={16} />
              <span>填入样例</span>
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
              <h2>项目追问训练</h2>
            </div>
            <div className="round-meter" aria-label="面试轮次">
              <span>
                第 {round} / {maxRounds} 轮
              </span>
              <strong>{phase === "completed" ? "已复盘" : hasStarted ? "进行中" : "待开始"}</strong>
            </div>
          </header>

          <div className="message-timeline" aria-live="polite">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Bot size={26} />
                </div>
                <h3>贴项目，开始被追问</h3>
                <p>面试官会围绕项目细节连续追问，并在结束后指出最容易被问挂的点。</p>
              </div>
            ) : (
              messages.map((message) => (
                <article className={`message message-${message.role}`} key={message.id}>
                  <span className="avatar">{message.role === "user" ? <UserRound size={16} /> : <Bot size={16} />}</span>
                  <div>
                    <span className="message-role">{message.role === "user" ? "候选人" : "AI 面试官"}</span>
                    <p>{message.content}</p>
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
              value={answerInput}
              onChange={(event) => setAnswerInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasStarted ? "输入你的回答，Enter 发送，Shift+Enter 换行" : "先填写项目经历并开始面试"}
              rows={3}
              disabled={isLoading || !hasStarted || phase === "completed"}
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
                <span>重新练一次</span>
              </button>
            </div>
          </form>
        </section>

        <aside className="debrief-panel" aria-label="面试复盘">
          <header className="debrief-header">
            <p className="section-label">Debrief</p>
            <h2>结构化复盘</h2>
          </header>
          {debrief ? (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{debrief}</ReactMarkdown>
            </div>
          ) : (
            <div className="debrief-empty">
              <ClipboardList size={28} />
              <h3>复盘会出现在这里</h3>
              <p>结束面试后，你会看到总评、挂点、维度反馈和下一轮行动。</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

export default App;
