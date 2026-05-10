import sys
from collections.abc import Callable
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import main


client = TestClient(main.app)


@pytest.fixture(autouse=True)
def configure_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://api.deepseek.com")
    monkeypatch.setenv("MODEL_NAME", "test-model")


def stub_completion(
    monkeypatch: pytest.MonkeyPatch,
    reply: str | Callable[[list[dict[str, str]], float], str],
) -> dict[str, object]:
    captured: dict[str, object] = {}

    def fake_completion(messages: list[dict[str, str]], temperature: float = 0.7) -> str:
        captured["messages"] = messages
        captured["temperature"] = temperature
        return reply(messages, temperature) if callable(reply) else reply

    monkeypatch.setattr(main, "request_chat_completion", fake_completion)
    return captured


def interview_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "scenario": "project_deep_dive",
        "phase": "opening",
        "round": 0,
        "max_rounds": 5,
        "project_context": "我做了一个基于 FastAPI、Redis 和向量检索的课程问答系统，负责后端接口、检索链路和部署。",
        "job_target": "后端开发实习",
        "messages": [],
    }
    payload.update(overrides)
    return payload


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_config_does_not_expose_api_key() -> None:
    response = client.get("/config")
    assert response.status_code == 200
    data = response.json()
    assert data["api_key_configured"] is True
    assert data["model"] == "test-model"
    assert "test-key" not in response.text


def test_chat_remains_compatible(monkeypatch: pytest.MonkeyPatch) -> None:
    stub_completion(monkeypatch, "你好，这是兼容聊天回复。")

    response = client.post("/chat", json={"messages": [{"role": "user", "content": "你好"}]})

    assert response.status_code == 200
    assert response.json() == {"reply": "你好，这是兼容聊天回复。", "model": "test-model"}


@pytest.mark.parametrize(
    ("scenario", "expected_focus"),
    [
        ("project_deep_dive", "个人贡献"),
        ("backend_fundamentals", "Redis"),
        ("rag_agent_review", "chunk"),
    ],
)
def test_interview_opening_for_each_scenario(
    monkeypatch: pytest.MonkeyPatch,
    scenario: str,
    expected_focus: str,
) -> None:
    captured = stub_completion(monkeypatch, "请具体讲一下你在这个项目里的个人贡献和技术取舍。")

    response = client.post("/interview/message", json=interview_payload(scenario=scenario))

    assert response.status_code == 200
    data = response.json()
    assert data["phase"] == "followup"
    assert data["round"] == 1
    assert data["is_complete"] is False
    assert data["model"] == "test-model"
    prompt_text = "\n".join(message["content"] for message in captured["messages"])  # type: ignore[index]
    assert expected_focus in prompt_text


def test_interview_followup_increments_round(monkeypatch: pytest.MonkeyPatch) -> None:
    stub_completion(monkeypatch, "你说用了 Redis 缓存，请说明缓存一致性和失效策略怎么设计。")

    response = client.post(
        "/interview/message",
        json=interview_payload(
            phase="followup",
            round=1,
            messages=[
                {"role": "assistant", "content": "你负责了哪些模块？"},
                {"role": "user", "content": "我主要负责缓存和接口。"},
            ],
        ),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["phase"] == "followup"
    assert data["round"] == 2
    assert data["is_complete"] is False


def test_interview_summary_returns_completed(monkeypatch: pytest.MonkeyPatch) -> None:
    stub_completion(
        monkeypatch,
        "## 总评\n项目表达还可以。\n\n## 最可能被问挂的 3 个点\n1. 指标不清楚\n",
    )

    response = client.post(
        "/interview/message",
        json=interview_payload(
            phase="summary",
            round=3,
            messages=[{"role": "user", "content": "我做了接口和检索。"}],
        ),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["phase"] == "completed"
    assert data["round"] == 3
    assert data["is_complete"] is True
    assert "## 总评" in data["reply"]


def test_followup_at_max_round_auto_completes(monkeypatch: pytest.MonkeyPatch) -> None:
    stub_completion(monkeypatch, "## 总评\n已经达到最大轮次，进入复盘。")

    response = client.post("/interview/message", json=interview_payload(phase="followup", round=5, max_rounds=5))

    assert response.status_code == 200
    assert response.json()["phase"] == "completed"
    assert response.json()["is_complete"] is True


def test_interview_requires_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    response = client.post("/interview/message", json=interview_payload())

    assert response.status_code == 503
    assert "OPENAI_API_KEY 未配置" in response.json()["detail"]


def test_empty_model_reply_is_error(monkeypatch: pytest.MonkeyPatch) -> None:
    stub_completion(monkeypatch, " ")

    response = client.post("/interview/message", json=interview_payload())

    assert response.status_code == 502
    assert "空内容" in response.json()["detail"]


def test_invalid_scenario_is_validation_error() -> None:
    response = client.post("/interview/message", json=interview_payload(scenario="frontend"))

    assert response.status_code == 422
