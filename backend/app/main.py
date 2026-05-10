import os
from typing import Literal
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import APIConnectionError, APIStatusError, APITimeoutError, OpenAI, OpenAIError
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool


DEFAULT_BASE_URL = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-v4-flash"
DEFAULT_SYSTEM_PROMPT = "你是一个中文友好的 AI Agent 产品挑战助手，回答要清晰、务实、可执行。"

Scenario = Literal["project_deep_dive", "backend_fundamentals", "rag_agent_review"]
InterviewPhase = Literal["opening", "followup", "summary", "completed"]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)


class ChatResponse(BaseModel):
    reply: str
    model: str


class ConfigResponse(BaseModel):
    model: str
    provider: str
    api_base_url: str
    api_key_configured: bool


class InterviewRequest(BaseModel):
    scenario: Scenario
    phase: InterviewPhase = "opening"
    round: int = Field(default=0, ge=0, le=8)
    max_rounds: int = Field(default=5, ge=1, le=8)
    project_context: str = Field(min_length=1, max_length=16000)
    job_target: str = Field(default="", max_length=1000)
    messages: list[ChatMessage] = Field(default_factory=list, max_length=40)


class InterviewResponse(BaseModel):
    reply: str
    phase: InterviewPhase
    round: int
    max_rounds: int
    is_complete: bool
    model: str


SCENARIO_CONFIG: dict[Scenario, dict[str, str]] = {
    "project_deep_dive": {
        "name": "项目深挖压力面",
        "focus": "项目背景、个人贡献、技术选型、关键指标、压测、失败路径、线上问题和取舍。",
        "tone": "可以有压力感，但不要羞辱候选人；像真实一面或二面的项目深挖。",
    },
    "backend_fundamentals": {
        "name": "后端八股项目化追问",
        "focus": "Redis、MySQL、MQ、并发、接口设计、部署、稳定性，必须落回候选人的项目场景。",
        "tone": "像后端实习面试官，追问概念如何真实用于项目，不接受只背定义。",
    },
    "rag_agent_review": {
        "name": "RAG/Agent 项目真实性拷打",
        "focus": "数据来源、chunk、embedding、rerank、prompt、工具调用、评估、部署、成本和是否只是调 API。",
        "tone": "对项目真实性保持敏感，追问工程闭环和坏例分析。",
    },
}


COMMON_INTERVIEW_RULES = """
你是中文技术实习模拟面试官，目标是训练候选人经得起真实追问。
规则：
1. 每轮只问一个主问题，最多补充一个追问方向。
2. 必须围绕用户项目经历、目标岗位和上一轮回答追问。
3. 不要替候选人回答，不要长篇讲解知识点。
4. 不要泛泛鼓励或给空洞建议。
5. 如果项目描述太短，先追问项目背景、个人贡献、技术栈和可验证指标。
6. 输出要自然、具体、中文化，像真实面试现场。
""".strip()


SUMMARY_INSTRUCTION = """
请结束本轮模拟面试，基于候选人的项目经历和全部问答生成复盘。必须使用 Markdown，结构固定为：

## 总评

## 最可能被问挂的 3 个点

## 维度反馈

| 维度 | 判断 | 证据 | 改进 |
| --- | --- | --- | --- |

## 下一轮行动

## 下一轮练习题

维度反馈至少覆盖：项目可信度、专业深度、表达结构、工程闭环、承压表现。
证据必须来自用户项目或本轮回答；不要写泛泛建议。
""".strip()


app = FastAPI(
    title="AIIC Agent Backend",
    description="OpenAI-compatible backend for an AI mock interview demo.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_model_name() -> str:
    return os.getenv("MODEL_NAME", DEFAULT_MODEL).strip() or DEFAULT_MODEL


def get_base_url() -> str:
    return os.getenv("OPENAI_BASE_URL", DEFAULT_BASE_URL).strip() or DEFAULT_BASE_URL


def get_required_api_key() -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or api_key == "replace-with-your-api-key":
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY 未配置。请在环境变量或 .env 中配置可用的 API Key。",
        )
    return api_key


def get_openai_client() -> OpenAI:
    return OpenAI(api_key=get_required_api_key(), base_url=get_base_url())


def get_provider_name(base_url: str) -> str:
    hostname = urlparse(base_url).hostname or base_url
    if "deepseek" in hostname:
        return "DeepSeek"
    if "openai" in hostname:
        return "OpenAI"
    return hostname


def request_chat_completion(messages: list[dict[str, str]], temperature: float = 0.7) -> str:
    completion = get_openai_client().chat.completions.create(
        model=get_model_name(),
        messages=messages,
        temperature=temperature,
    )
    return completion.choices[0].message.content or ""


async def generate_model_reply(messages: list[dict[str, str]], temperature: float = 0.7) -> str:
    try:
        reply = await run_in_threadpool(request_chat_completion, messages, temperature)
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
    return reply.strip()


def should_generate_summary(payload: InterviewRequest) -> bool:
    return payload.phase in {"summary", "completed"} or (
        payload.phase == "followup" and payload.round >= payload.max_rounds
    )


def build_interview_system_prompt(payload: InterviewRequest) -> str:
    scenario = SCENARIO_CONFIG[payload.scenario]
    job_target = payload.job_target.strip() or "技术实习岗位"
    return f"""
{COMMON_INTERVIEW_RULES}

当前训练场景：{scenario["name"]}
场景重点：{scenario["focus"]}
面试语气：{scenario["tone"]}
目标岗位：{job_target}

候选人项目经历：
{payload.project_context.strip()}
""".strip()


def build_stage_instruction(payload: InterviewRequest) -> str:
    if should_generate_summary(payload):
        return SUMMARY_INSTRUCTION

    scenario = SCENARIO_CONFIG[payload.scenario]
    if payload.phase == "opening":
        return f"""
现在开始“{scenario["name"]}”。
请基于候选人的项目经历提出第一轮问题。
问题要具体，不要让候选人泛泛自我介绍；优先切入个人贡献、技术栈或项目里最容易被追问的点。
只输出面试官这一轮要问的话。
""".strip()

    return f"""
现在是第 {payload.round + 1} 轮追问，最多 {payload.max_rounds} 轮。
请基于上一轮候选人的回答，抓住一个最值得深挖的漏洞或不清楚处继续追问。
如果候选人回答太空泛，就要求他给出项目里的具体数据、设计细节、失败案例或取舍依据。
只输出面试官这一轮要问的话。
""".strip()


def build_interview_messages(payload: InterviewRequest) -> list[dict[str, str]]:
    messages = [{"role": "system", "content": build_interview_system_prompt(payload)}]
    messages.extend(message.model_dump() for message in payload.messages[-20:])
    messages.append({"role": "user", "content": build_stage_instruction(payload)})
    return messages


def next_interview_state(payload: InterviewRequest) -> tuple[InterviewPhase, int, bool]:
    if should_generate_summary(payload):
        return "completed", min(payload.round, payload.max_rounds), True
    if payload.phase == "opening":
        return "followup", 1, False
    return "followup", min(payload.round + 1, payload.max_rounds), False


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "aiic-agent-backend"}


@app.get("/config", response_model=ConfigResponse)
def config() -> ConfigResponse:
    base_url = get_base_url()
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    return ConfigResponse(
        model=get_model_name(),
        provider=get_provider_name(base_url),
        api_base_url=base_url,
        api_key_configured=bool(api_key and api_key != "replace-with-your-api-key"),
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    system_prompt = os.getenv("SYSTEM_PROMPT", DEFAULT_SYSTEM_PROMPT).strip() or DEFAULT_SYSTEM_PROMPT
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(message.model_dump() for message in payload.messages)
    reply = await generate_model_reply(messages)
    return ChatResponse(reply=reply, model=get_model_name())


@app.post("/interview/message", response_model=InterviewResponse)
async def interview_message(payload: InterviewRequest) -> InterviewResponse:
    prompt_messages = build_interview_messages(payload)
    reply = await generate_model_reply(prompt_messages, temperature=0.72 if should_generate_summary(payload) else 0.65)
    next_phase, next_round, is_complete = next_interview_state(payload)
    return InterviewResponse(
        reply=reply,
        phase=next_phase,
        round=next_round,
        max_rounds=payload.max_rounds,
        is_complete=is_complete,
        model=get_model_name(),
    )
