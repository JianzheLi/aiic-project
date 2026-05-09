import os
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import APIConnectionError, APIStatusError, APITimeoutError, OpenAI, OpenAIError
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool


DEFAULT_BASE_URL = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-v4-flash"
DEFAULT_SYSTEM_PROMPT = "你是一个中文友好的 AI Agent 产品挑战助手，回答要清晰、务实、可执行。"


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)


class ChatResponse(BaseModel):
    reply: str
    model: str


app = FastAPI(
    title="AIIC Agent Backend",
    description="Minimal OpenAI-compatible chat backend for demo deployment.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_required_api_key() -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or api_key == "replace-with-your-api-key":
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY 未配置。请在环境变量或 .env 中配置可用的 API Key。",
        )
    return api_key


def get_openai_client() -> OpenAI:
    base_url = os.getenv("OPENAI_BASE_URL", DEFAULT_BASE_URL).strip() or DEFAULT_BASE_URL
    return OpenAI(api_key=get_required_api_key(), base_url=base_url)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "aiic-agent-backend"}


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    model = os.getenv("MODEL_NAME", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    system_prompt = os.getenv("SYSTEM_PROMPT", DEFAULT_SYSTEM_PROMPT).strip() or DEFAULT_SYSTEM_PROMPT
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(message.model_dump() for message in payload.messages)

    def create_completion() -> str:
        completion = get_openai_client().chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
        )
        return completion.choices[0].message.content or ""

    try:
        reply = await run_in_threadpool(create_completion)
    except HTTPException:
        raise
    except APITimeoutError as exc:
        raise HTTPException(status_code=504, detail="模型服务请求超时，请稍后重试。") from exc
    except APIConnectionError as exc:
        raise HTTPException(status_code=502, detail="无法连接到模型服务，请检查 OPENAI_BASE_URL。") from exc
    except APIStatusError as exc:
        message = exc.response.text[:300] if exc.response is not None else str(exc)
        raise HTTPException(status_code=502, detail=f"模型服务返回错误：{message}") from exc
    except OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"模型调用失败：{str(exc)}") from exc

    if not reply.strip():
        raise HTTPException(status_code=502, detail="模型服务返回了空内容，请稍后重试。")

    return ChatResponse(reply=reply, model=model)
