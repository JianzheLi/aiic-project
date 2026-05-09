import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bot, Loader2, Plus, RefreshCw, Send, Sparkles, UserRound, Wifi } from "lucide-react";

type ChatRole = "user" | "assistant";
type ConnectionState = "checking" | "ready" | "missing-key" | "error";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ChatResponse = {
  reply: string;
  model: string;
};

type ConfigResponse = {
  model: string;
  provider: string;
  api_base_url: string;
  api_key_configured: boolean;
};

const starterPrompts = [
  "帮我把一个 AI Agent 产品想法拆成 3 个可验证功能",
  "给我一份 16 小时 demo 的开发节奏",
  "从评委视角挑出这个产品最该展示的亮点",
];

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  return configured ? configured.replace(/\/$/, "") : "/api";
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [modelName, setModelName] = useState("");
  const [providerName, setProviderName] = useState("DeepSeek");
  const [connectionState, setConnectionState] = useState<ConnectionState>("checking");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const apiBaseUrl = useMemo(getApiBaseUrl, []);

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

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: text }) => ({ role, content: text })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "请求失败，请稍后重试。");
      }

      const chatData = data as ChatResponse;
      setModelName(chatData.model);
      setConnectionState("ready");
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: chatData.reply,
        },
      ]);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "请求失败，请稍后重试。";
      setError(message);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function startNewChat() {
    setMessages([]);
    setInput("");
    setError("");
    inputRef.current?.focus();
  }

  const statusText = {
    checking: "连接中",
    ready: modelName || "已连接",
    "missing-key": "密钥未配置",
    error: "连接异常",
  }[connectionState];

  return (
    <main className="app-shell">
      <section className="workspace" aria-label="AI Agent 聊天演示">
        <aside className="side-panel">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="eyebrow">AI Agent Challenge</p>
              <h1>中文产品助手</h1>
            </div>
          </div>

          <div className={`connection-card connection-${connectionState}`}>
            <div className="connection-title">
              <Wifi size={16} />
              <span>{providerName}</span>
            </div>
            <strong>{statusText}</strong>
            <p>{connectionState === "ready" ? "3000 同源代理已启用" : "正在检查运行状态"}</p>
          </div>

          <div className="prompt-stack">
            {starterPrompts.map((prompt) => (
              <button className="prompt-button" key={prompt} type="button" onClick={() => setInput(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <button className="utility-button" type="button" onClick={startNewChat}>
            <Plus size={16} />
            <span>新对话</span>
          </button>
        </aside>

        <div className="chat-panel">
          <header className="chat-header">
            <div>
              <p className="section-label">Demo Chat</p>
              <h2>把想法推进到可展示版本</h2>
            </div>
            <button className="icon-button" type="button" onClick={loadConfig} aria-label="刷新连接状态">
              <RefreshCw size={18} />
            </button>
          </header>

          <div className="messages" aria-live="polite">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Bot size={26} />
                </div>
                <h3>先问一个具体问题</h3>
                <p>例如产品定位、功能切分、演示话术、技术实现路径。</p>
              </div>
            ) : (
              messages.map((message) => (
                <article className={`message message-${message.role}`} key={message.id}>
                  <span className="avatar">{message.role === "user" ? <UserRound size={16} /> : <Bot size={16} />}</span>
                  <div>
                    <span className="message-role">{message.role === "user" ? "你" : providerName}</span>
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
                  <span className="message-role">{providerName}</span>
                  <p className="typing">正在生成回复...</p>
                </div>
              </article>
            ) : null}
          </div>

          {error ? (
            <div className="error-banner">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <form className="composer" onSubmit={sendMessage}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题..."
              rows={3}
              disabled={isLoading}
            />
            <button className="send-button" type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              <span>{isLoading ? "发送中" : "发送"}</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default App;
