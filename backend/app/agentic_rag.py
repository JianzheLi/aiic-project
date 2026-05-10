import json
import math
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent / "data"
SOURCE_CARD_PATH = DATA_DIR / "interview_source_cards.json"

SCENARIO_TAGS = {
    "project_deep_dive": {"project", "metrics", "ownership", "failure", "tradeoff", "system-design"},
    "backend_fundamentals": {"backend", "mysql", "redis", "kafka", "mq", "consistency", "concurrency"},
    "rag_agent_review": {"rag", "agent", "retrieval", "chunking", "rerank", "evaluation", "hallucination"},
}


@dataclass(frozen=True)
class SourceCard:
    id: str
    title: str
    url: str
    source_type: str
    domains: tuple[str, ...]
    tags: tuple[str, ...]
    keywords: tuple[str, ...]
    key_points: tuple[str, ...]
    probe_templates: tuple[str, ...]
    anti_patterns: tuple[str, ...]


@dataclass(frozen=True)
class RetrievedSourceCard:
    card: SourceCard
    score: float
    matched_terms: tuple[str, ...]


@dataclass(frozen=True)
class InterviewEvidence:
    source_cards: tuple[RetrievedSourceCard, ...]
    question_tags: tuple[str, ...]
    resume_evidence: str
    risk_hypothesis: str


def _as_tuple(value: object) -> tuple[str, ...]:
    if not isinstance(value, list):
        return ()
    return tuple(str(item).strip() for item in value if str(item).strip())


@lru_cache(maxsize=1)
def load_source_cards() -> tuple[SourceCard, ...]:
    with SOURCE_CARD_PATH.open("r", encoding="utf-8") as file:
        raw_cards = json.load(file)

    cards: list[SourceCard] = []
    for item in raw_cards:
        cards.append(
            SourceCard(
                id=str(item["id"]),
                title=str(item["title"]),
                url=str(item["url"]),
                source_type=str(item["source_type"]),
                domains=_as_tuple(item.get("domains")),
                tags=_as_tuple(item.get("tags")),
                keywords=_as_tuple(item.get("keywords")),
                key_points=_as_tuple(item.get("key_points")),
                probe_templates=_as_tuple(item.get("probe_templates")),
                anti_patterns=_as_tuple(item.get("anti_patterns")),
            )
        )
    return tuple(cards)


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower())


def _keyword_match(keyword: str, normalized_text: str) -> bool:
    normalized_keyword = keyword.lower().strip()
    if not normalized_keyword:
        return False
    return normalized_keyword in normalized_text


def _score_card(card: SourceCard, scenario: str, normalized_text: str) -> tuple[float, tuple[str, ...]]:
    scenario_tags = SCENARIO_TAGS.get(scenario, set())
    matched_keywords = [keyword for keyword in card.keywords if _keyword_match(keyword, normalized_text)]
    matched_tags = sorted(set(card.tags) & scenario_tags)
    domain_matches = [domain for domain in card.domains if _keyword_match(domain, normalized_text)]

    score = 0.0
    score += len(matched_keywords) * 4.0
    score += len(matched_tags) * 2.5
    score += len(domain_matches) * 2.0
    if set(card.tags) & scenario_tags:
        score += 1.0
    if matched_keywords:
        score += 1.5 * math.log2(len(matched_keywords) + 1)

    matched_terms = tuple(dict.fromkeys([*matched_keywords, *matched_tags, *domain_matches]))
    return score, matched_terms


def retrieve_source_cards(
    scenario: str,
    resume_text: str,
    job_target: str,
    messages: list[dict[str, str]],
    limit: int = 5,
) -> tuple[RetrievedSourceCard, ...]:
    conversation_text = "\n".join(message.get("content", "") for message in messages[-6:])
    normalized_text = _normalize_text(f"{resume_text}\n{job_target}\n{conversation_text}")
    ranked: list[RetrievedSourceCard] = []

    for card in load_source_cards():
        score, matched_terms = _score_card(card, scenario, normalized_text)
        if score > 0:
            ranked.append(RetrievedSourceCard(card=card, score=score, matched_terms=matched_terms))

    ranked.sort(key=lambda item: (item.score, len(item.matched_terms), item.card.id), reverse=True)
    if ranked:
        return tuple(ranked[:limit])

    fallback = [
        RetrievedSourceCard(card=card, score=0.1, matched_terms=tuple(sorted(set(card.tags) & SCENARIO_TAGS.get(scenario, set()))))
        for card in load_source_cards()
        if set(card.tags) & SCENARIO_TAGS.get(scenario, set())
    ]
    fallback.sort(key=lambda item: item.card.id)
    return tuple(fallback[:limit])


def extract_resume_evidence(resume_text: str, cards: tuple[RetrievedSourceCard, ...]) -> str:
    lines = [line.strip() for line in resume_text.splitlines() if line.strip()]
    if not lines:
        return "简历文本为空"

    keywords = {keyword.lower() for item in cards for keyword in item.card.keywords}
    scored_lines: list[tuple[int, str]] = []
    for line in lines:
        normalized = line.lower()
        score = sum(1 for keyword in keywords if keyword and keyword in normalized)
        if any(marker in line for marker in ("项目", "实习", "技能", "负责", "系统")):
            score += 2
        scored_lines.append((score, line))

    scored_lines.sort(key=lambda item: (item[0], len(item[1])), reverse=True)
    evidence = scored_lines[0][1]
    return evidence[:220]


def build_risk_hypothesis(scenario: str, cards: tuple[RetrievedSourceCard, ...]) -> str:
    tags = {tag for item in cards for tag in item.card.tags}
    if scenario == "rag_agent_review":
        if {"chunking", "rerank"} & tags:
            return "候选人可能只描述了 RAG 流程，但缺少 chunk/rerank 选择依据、坏例归因和基本观察方法。"
        return "候选人可能只说调 API，缺少数据处理、检索质量和幻觉控制的工程证据。"
    if scenario == "backend_fundamentals":
        if {"mysql", "redis"} & tags:
            return "候选人可能能背概念，但说不清事务、锁、缓存一致性和故障兜底如何落到项目。"
        return "候选人可能缺少并发、稳定性和部署故障的可验证经历。"
    return "候选人可能把项目写得完整，但个人贡献、指标基线、失败路径和取舍依据不够可验证。"


def build_question_tags(cards: tuple[RetrievedSourceCard, ...]) -> tuple[str, ...]:
    ordered: list[str] = []
    for item in cards:
        for tag in item.card.tags:
            if tag not in ordered:
                ordered.append(tag)
    return tuple(ordered[:8])


def build_interview_evidence(
    scenario: str,
    resume_text: str,
    job_target: str,
    messages: list[dict[str, str]],
) -> InterviewEvidence:
    cards = retrieve_source_cards(scenario, resume_text, job_target, messages)
    return InterviewEvidence(
        source_cards=cards,
        question_tags=build_question_tags(cards),
        resume_evidence=extract_resume_evidence(resume_text, cards),
        risk_hypothesis=build_risk_hypothesis(scenario, cards),
    )


def format_source_context(evidence: InterviewEvidence) -> str:
    blocks: list[str] = []
    for index, item in enumerate(evidence.source_cards, start=1):
        card = item.card
        blocks.append(
            "\n".join(
                [
                    f"[S{index}] {card.title}",
                    f"来源：{card.url}",
                    f"标签：{', '.join(card.tags)}",
                    f"匹配：{', '.join(item.matched_terms) if item.matched_terms else '场景默认'}",
                    "关键结论：" + "；".join(card.key_points[:3]),
                    "可追问：" + "；".join(card.probe_templates[:2]),
                    "常见空泛回答：" + "；".join(card.anti_patterns[:2]),
                ]
            )
        )
    return "\n\n".join(blocks)


def critique_interview_reply(reply: str, evidence: InterviewEvidence, *, is_summary: bool) -> list[str]:
    if is_summary:
        return []

    issues: list[str] = []
    normalized_reply = _normalize_text(reply)
    if len(reply.strip()) < 45:
        issues.append("问题太短，缺少真实面试里的技术约束。")
    if not any(keyword in normalized_reply for item in evidence.source_cards for keyword in item.card.keywords):
        issues.append("问题没有明显使用检索到的技术资料关键词。")
    if "简历" not in reply and not any(term in reply for term in ("你写", "你提到", "项目", "负责")):
        issues.append("问题没有显式绑定简历证据。")
    if reply.count("？") + reply.count("?") > 2:
        issues.append("一次问了太多问题，应该收敛为一个主问题。")
    if any(term in reply for term in ("自我介绍", "简单介绍", "聊聊你的项目")):
        issues.append("问题过于泛泛，需要改成针对实现细节、指标、坏例或失败路径的追问。")
    demand_markers = ("另外", "分别", "同时", "以及", "再说明", "给我一组数字", "调优前后")
    if sum(1 for marker in demand_markers if marker in reply) >= 2:
        issues.append("问题像连珠炮，要求候选人同时回答太多子任务。")
    exact_metric_terms = ("给我一组数字", "召回率", "准确率", "调优前后", "topK", "最终进入上下文")
    if "给我一组数字" in reply or sum(1 for term in exact_metric_terms if term in reply) >= 3:
        issues.append("问题过度要求精确量化数据，容易逼候选人编数字；应改问判断过程、日志线索或如果没记录会如何补指标。")
    return issues[:4]
