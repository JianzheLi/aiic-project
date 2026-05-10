import json
from functools import lru_cache
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parent / "data"
KNOWLEDGE_TOPIC_PATH = DATA_DIR / "knowledge_topics.json"
CODING_PROBLEM_PATH = DATA_DIR / "coding_problems.json"


@lru_cache(maxsize=1)
def load_knowledge_categories() -> tuple[dict[str, Any], ...]:
    with KNOWLEDGE_TOPIC_PATH.open("r", encoding="utf-8") as file:
        return tuple(json.load(file))


@lru_cache(maxsize=1)
def load_coding_categories() -> tuple[dict[str, Any], ...]:
    with CODING_PROBLEM_PATH.open("r", encoding="utf-8") as file:
        return tuple(json.load(file))


def get_category(categories: tuple[dict[str, Any], ...], category_id: str) -> dict[str, Any] | None:
    return next((category for category in categories if category.get("id") == category_id), None)


def get_item(category: dict[str, Any], collection_key: str, item_id: str | None) -> dict[str, Any]:
    items = category.get(collection_key, [])
    if not items:
        raise ValueError("category has no training items")
    if item_id:
        selected = next((item for item in items if item.get("id") == item_id), None)
        if selected:
            return selected
    return items[0]


def list_category_ids(categories: tuple[dict[str, Any], ...]) -> list[str]:
    return [str(category.get("id")) for category in categories]
