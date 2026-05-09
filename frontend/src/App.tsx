import { FormEvent, useMemo, useRef, useState } from "react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ChatResponse = {
  reply: string;
  model: string;
};

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const protocol = window.location.protocol || "http:";
  const hostname = window.location.hostname || "localhost";
  return `${protocol}//${hostname}:8000`;
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [modelName, setModelName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const apiBaseUrl = useMemo(getApiBaseUrl, []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  return (
    <main className="app-shell">
      <section className="chat-panel" aria-label="AI Agent 聊天演示">
        <header className="chat-header">
          <div>
            <p className="eyebrow">16 小时 AI Agent 产品挑战</p>
            <h1>中文 AI Agent Demo</h1>
          </div>
          <div className="status">
            <span className="status-dot" />
            <span>{modelName || "待连接模型"}</span>
          </div>
        </header>

        <div className="messages" aria-live="polite">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h2>开始一次产品探索</h2>
              <p>输入一个需求、业务想法或技术问题，我会把它转成清晰可执行的下一步。</p>
            </div>
          ) : (
            messages.map((message) => (
              <article className={`message message-${message.role}`} key={message.id}>
                <span className="message-role">{message.role === "user" ? "你" : "AI"}</span>
                <p>{message.content}</p>
              </article>
            ))
          )}
          {isLoading ? (
            <article className="message message-assistant">
              <span className="message-role">AI</span>
              <p className="typing">正在思考...</p>
            </article>
          ) : null}
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <form className="composer" onSubmit={sendMessage}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="例如：帮我把这个 AI Agent 产品想法拆成 3 个可验证功能"
            rows={3}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? "发送中" : "发送"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default App;
