#!/usr/bin/env python3
"""Generate final research report assets without third-party Python packages."""

from __future__ import annotations

import json
import math
from pathlib import Path
from textwrap import dedent


ROOT = Path(__file__).resolve().parents[4]
REPORT_DIR = ROOT / "target" / "research" / "final-report"
FIG_DIR = REPORT_DIR / "figures"


PAIN_LABELS = {
    "project_deep_dive": "项目深挖",
    "broad_knowledge": "八股范围",
    "coding_pressure": "手撕代码",
    "ai_project_credibility": "AI项目可信度",
    "anxiety_uncertainty": "焦虑/不确定",
    "review_gap": "复盘缺口",
    "role_fit": "岗位匹配",
    "expression_structure": "表达结构",
    "basic_knowledge": "八股基础",
    "coding_test": "算法/手撕",
    "llm_knowledge": "LLM专项",
    "pressure_followup": "追问压力",
    "engineering_reality": "工程真实性",
}

XHS_LABELS = {
    "backend": "后端",
    "algorithm-llm": "算法/LLM",
    "ai-infra-app": "AI应用/Infra",
    "cross-cutting": "通用痛点",
    "appendix-frontend-fullstack": "前端/全栈",
}

QUESTIONING_LABELS = {
    "backend": "后端追问",
    "interviewer": "面试官视角",
    "github-open-source": "开源题库",
    "ai-app": "AI应用",
    "ai-infra": "AI Infra",
    "algorithm-llm": "LLM算法",
    "algorithm-coding": "算法手撕",
    "frontend-fullstack": "前端/全栈",
    "teacher-boss": "老师/老板",
    "interviewer-perspective": "面试官样本",
}

JD_LABELS = {
    "backend": "后端",
    "backend_data": "数据后端",
    "backend_infra": "平台后端",
    "ai_backend": "AI后端",
    "ai_app": "AI应用",
    "ai_app_fullstack": "AI全栈",
    "ai_infra": "AI Infra",
    "algorithm": "算法",
    "algorithm_llm": "LLM算法",
    "llm_app": "LLM应用",
}


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def count_by(items: list[dict], key: str) -> dict[str, int]:
    out: dict[str, int] = {}
    for item in items:
        val = str(item.get(key, "unknown"))
        out[val] = out.get(val, 0) + 1
    return dict(sorted(out.items(), key=lambda kv: (-kv[1], kv[0])))


def top_n(counts: dict[str, int], n: int = 8) -> dict[str, int]:
    items = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    top = dict(items[:n])
    rest = sum(v for _, v in items[n:])
    if rest:
        top["其他"] = rest
    return top


def svg_bar_chart(path: Path, title: str, data: dict[str, int], *, width=900, bar=34) -> None:
    margin_l, margin_r, margin_t, margin_b = 190, 40, 70, 60
    rows = max(len(data), 1)
    height = margin_t + margin_b + rows * (bar + 14)
    max_v = max(data.values()) if data else 1
    chart_w = width - margin_l - margin_r
    colors = ["#2563eb", "#059669", "#dc2626", "#7c3aed", "#ea580c", "#0891b2", "#4f46e5", "#65a30d", "#be123c"]
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="#ffffff"/>',
        f'<text x="{width/2}" y="34" text-anchor="middle" font-size="22" font-weight="700" fill="#111827">{escape_xml(title)}</text>',
    ]
    for idx, (label, value) in enumerate(data.items()):
        y = margin_t + idx * (bar + 14)
        w = int(chart_w * (value / max_v))
        color = colors[idx % len(colors)]
        lines.append(f'<text x="{margin_l-12}" y="{y+bar*0.68:.1f}" text-anchor="end" font-size="15" fill="#374151">{escape_xml(label)}</text>')
        lines.append(f'<rect x="{margin_l}" y="{y}" width="{w}" height="{bar}" rx="5" fill="{color}"/>')
        lines.append(f'<text x="{margin_l+w+8}" y="{y+bar*0.68:.1f}" font-size="15" fill="#111827">{value}</text>')
    lines.append("</svg>")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def svg_matrix(path: Path, title: str, rows: list[str], cols: list[str], values: list[list[int]], *, width=980) -> None:
    cell_w, cell_h = 118, 58
    margin_l, margin_t = 210, 90
    height = margin_t + len(rows) * cell_h + 70
    width = max(width, margin_l + len(cols) * cell_w + 40)
    max_v = max(max(row) for row in values) if values else 1
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="#ffffff"/>',
        f'<text x="{width/2}" y="35" text-anchor="middle" font-size="22" font-weight="700" fill="#111827">{escape_xml(title)}</text>',
    ]
    for c, col in enumerate(cols):
        x = margin_l + c * cell_w + cell_w / 2
        lines.append(f'<text x="{x}" y="{margin_t-20}" text-anchor="middle" font-size="13" fill="#374151">{escape_xml(col)}</text>')
    for r, row in enumerate(rows):
        y = margin_t + r * cell_h
        lines.append(f'<text x="{margin_l-14}" y="{y+cell_h*0.58:.1f}" text-anchor="end" font-size="14" fill="#374151">{escape_xml(row)}</text>')
        for c, val in enumerate(values[r]):
            x = margin_l + c * cell_w
            opacity = 0.12 + 0.78 * (val / max_v if max_v else 0)
            lines.append(f'<rect x="{x}" y="{y}" width="{cell_w-3}" height="{cell_h-3}" fill="#2563eb" opacity="{opacity:.2f}"/>')
            lines.append(f'<text x="{x+cell_w/2}" y="{y+cell_h*0.6:.1f}" text-anchor="middle" font-size="16" font-weight="700" fill="#111827">{val}</text>')
    lines.append("</svg>")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def tex_bar_chart(path: Path, caption: str, data: dict[str, int]) -> None:
    max_v = max(data.values()) if data else 1
    rows = []
    for idx, (label, value) in enumerate(data.items()):
        width = 9.5 * value / max_v
        y = -idx * 0.58
        rows.append(
            rf"\node[anchor=east] at (0,{y:.2f}) {{{tex_escape(label)}}};"
            rf"\fill[reportblue] (0.15,{y-0.17:.2f}) rectangle ({0.15+width:.2f},{y+0.17:.2f});"
            rf"\node[anchor=west] at ({0.25+width:.2f},{y:.2f}) {{{value}}};"
        )
    content = "\n".join(rows)
    path.write_text(
        dedent(
            rf"""
            \begin{{figure}}[H]
            \centering
            \begin{{tikzpicture}}[x=1cm,y=1cm]
            {content}
            \end{{tikzpicture}}
            \caption{{{tex_escape(caption)}}}
            \end{{figure}}
            """
        ).strip()
        + "\n",
        encoding="utf-8",
    )


def tex_matrix(path: Path, caption: str, rows: list[str], cols: list[str], values: list[list[int]]) -> None:
    max_v = max(max(row) for row in values) if values else 1
    pieces = []
    for c, col in enumerate(cols):
        pieces.append(rf"\node[rotate=30,anchor=west] at ({c+1.2:.2f},0.45) {{{tex_escape(col)}}};")
    for r, row in enumerate(rows):
        y = -r * 0.72
        pieces.append(rf"\node[anchor=east] at (0,{y:.2f}) {{{tex_escape(row)}}};")
        for c, value in enumerate(values[r]):
            shade = int(10 + 70 * (value / max_v if max_v else 0))
            x = c + 0.55
            pieces.append(rf"\fill[reportblue!{shade}] ({x:.2f},{y-0.28:.2f}) rectangle ({x+0.62:.2f},{y+0.28:.2f});")
            pieces.append(rf"\node at ({x+0.31:.2f},{y:.2f}) {{{value}}};")
    path.write_text(
        dedent(
            rf"""
            \begin{{figure}}[H]
            \centering
            \begin{{tikzpicture}}[x=1cm,y=1cm]
            {chr(10).join(pieces)}
            \end{{tikzpicture}}
            \caption{{{tex_escape(caption)}}}
            \end{{figure}}
            """
        ).strip()
        + "\n",
        encoding="utf-8",
    )


def escape_xml(text: str) -> str:
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def tex_escape(text: str) -> str:
    return (
        str(text)
        .replace("\\", r"\textbackslash{}")
        .replace("&", r"\&")
        .replace("%", r"\%")
        .replace("$", r"\$")
        .replace("#", r"\#")
        .replace("_", r"\_")
        .replace("{", r"\{")
        .replace("}", r"\}")
        .replace("~", r"\textasciitilde{}")
        .replace("^", r"\textasciicircum{}")
    )


def md_table(headers: list[str], rows: list[list[str | int]]) -> str:
    head = "| " + " | ".join(headers) + " |"
    sep = "| " + " | ".join(["---"] * len(headers)) + " |"
    body = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([head, sep] + body)


def longtable(headers: list[str], rows: list[list[str | int]], colspec: str) -> str:
    lines = [rf"\begin{{longtable}}{{{colspec}}}", r"\toprule"]
    lines.append(" & ".join(tex_escape(h) for h in headers) + r" \\")
    lines.append(r"\midrule")
    lines.append(r"\endfirsthead")
    lines.append(r"\toprule")
    lines.append(" & ".join(tex_escape(h) for h in headers) + r" \\")
    lines.append(r"\midrule")
    lines.append(r"\endhead")
    for row in rows:
        lines.append(" & ".join(tex_escape(str(c)) for c in row) + r" \\")
    lines.append(r"\bottomrule")
    lines.append(r"\end{longtable}")
    return "\n".join(lines)


def main() -> None:
    FIG_DIR.mkdir(parents=True, exist_ok=True)

    xhs = load_json(ROOT / "target/research/xhs-tech-intern-interviews/data/samples.json")
    xhs_samples = xhs["samples"]
    xhs_counts = {XHS_LABELS.get(k, k): v for k, v in xhs["summary"]["category_counts"].items()}
    pain_counts: dict[str, int] = {}
    for sample in xhs_samples:
        for tag in sample.get("pain_tags", []):
            label = PAIN_LABELS.get(tag, tag)
            pain_counts[label] = pain_counts.get(label, 0) + 1
    pain_counts = top_n(pain_counts, 8)

    q = load_json(ROOT / "target/research/interview-questioning-playbook/data/sources.json")
    q_summary = q["summary"]
    q_counts = {QUESTIONING_LABELS.get(k, k): v for k, v in q_summary["counts_by_category"].items()}

    demand_base = ROOT / "target/research/demand-validation-desk-research/data"
    demand_cov = load_json(demand_base / "coverage-summary.json")
    projects = load_json(demand_base / "project-samples.json")["samples"]
    jds = load_json(demand_base / "jd-samples.json")["samples"]
    competitors = load_json(demand_base / "competitor-experience.json")["samples"]
    jd_counts = {JD_LABELS.get(k, k): v for k, v in demand_cov["jd_counts_by_role_category"].items()}

    total_research_items = len(xhs_samples) + q_summary["total_sources"] + demand_cov["sample_counts"]["project_samples"] + demand_cov["sample_counts"]["jd_samples"] + demand_cov["sample_counts"]["competitor_samples"]
    coverage = {
        "小红书面经": len(xhs_samples),
        "追问链样本": q_summary["total_sources"],
        "项目样本": demand_cov["sample_counts"]["project_samples"],
        "岗位JD": demand_cov["sample_counts"]["jd_samples"],
        "竞品体验": demand_cov["sample_counts"]["competitor_samples"],
    }

    project_rows = ["管理/商城/秒杀", "RAG/知识库", "Agent/Workflow", "AI Infra", "科研/算法"]
    risk_cols = ["同质化", "个人贡献", "指标缺失", "失败路径", "岗位匹配"]
    risk_values = [
        [5, 4, 4, 4, 3],
        [4, 4, 5, 5, 5],
        [3, 5, 4, 5, 5],
        [2, 4, 5, 4, 4],
        [3, 4, 4, 3, 4],
    ]

    comp_rows = ["通用LLM", "AI面试产品", "题库/面经", "开源项目"]
    comp_cols = ["连续追问", "项目深挖", "结构化反馈", "中文技术实习"]
    comp_values = [
        [2, 1, 2, 2],
        [4, 2, 4, 1],
        [0, 1, 1, 5],
        [2, 2, 2, 1],
    ]

    priority_rows = ["项目深挖崩盘", "复盘不可执行", "八股项目割裂", "AI项目可信度", "面试焦虑"]
    priority_cols = ["痛感", "证据", "可行性", "MVP优先"]
    priority_values = [
        [5, 5, 5, 5],
        [5, 4, 5, 5],
        [4, 5, 5, 4],
        [4, 4, 4, 4],
        [4, 4, 3, 3],
    ]

    charts = [
        ("sample_coverage", "三轮调研样本覆盖", coverage, "三轮调研样本覆盖"),
        ("xhs_category_distribution", "小红书样本主题分布", xhs_counts, "第一轮小红书样本主题分布"),
        ("questioning_category_distribution", "追问链样本主题分布", top_n(q_counts, 10), "第二轮追问链样本主题分布"),
        ("jd_role_distribution", "岗位 JD 方向分布", jd_counts, "第三轮岗位 JD 方向分布"),
        ("pain_tag_distribution", "用户痛点标签分布", pain_counts, "公开样本中的用户痛点标签分布"),
    ]
    for key, title, data, caption in charts:
        svg_bar_chart(FIG_DIR / f"{key}.svg", title, data)
        tex_bar_chart(FIG_DIR / f"{key}.tikz", caption, data)
    svg_matrix(FIG_DIR / "project_archetype_risk_matrix.svg", "项目类型与被问穿风险矩阵", project_rows, risk_cols, risk_values)
    tex_matrix(FIG_DIR / "project_archetype_risk_matrix.tikz", "项目类型与被问穿风险矩阵", project_rows, risk_cols, risk_values)
    svg_matrix(FIG_DIR / "competitor_gap_matrix.svg", "替代方案能力矩阵", comp_rows, comp_cols, comp_values)
    tex_matrix(FIG_DIR / "competitor_gap_matrix.tikz", "替代方案能力矩阵", comp_rows, comp_cols, comp_values)
    svg_matrix(FIG_DIR / "problem_priority_matrix.svg", "用户问题优先级矩阵", priority_rows, priority_cols, priority_values)
    tex_matrix(FIG_DIR / "problem_priority_matrix.tikz", "用户问题优先级矩阵", priority_rows, priority_cols, priority_values)

    stats = {
        "total_research_items": total_research_items,
        "coverage": coverage,
        "xhs_counts": xhs_counts,
        "questioning_counts": q_counts,
        "jd_counts": jd_counts,
        "pain_counts": pain_counts,
        "project_samples": len(projects),
        "jd_samples": len(jds),
        "competitor_samples": len(competitors),
    }
    (REPORT_DIR / "generated-stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    write_markdown(stats)
    write_latex(stats)
    write_readme()


def write_markdown(stats: dict) -> None:
    coverage_rows = [[k, v] for k, v in stats["coverage"].items()]
    pain_rows = [[k, v] for k, v in stats["pain_counts"].items()]
    jd_rows = [[k, v] for k, v in stats["jd_counts"].items()]

    content = f"""# AI 模拟面试官用户痛点与需求调研报告

生成日期：2026-05-10

## 执行摘要

本报告整合三轮公开调研，共计 {stats['total_research_items']} 条结构化研究输入：第一轮小红书公开面经 {stats['coverage']['小红书面经']} 条，第二轮面试追问链与公开来源 {stats['coverage']['追问链样本']} 条，第三轮需求验证样本 {stats['coverage']['项目样本'] + stats['coverage']['岗位JD'] + stats['coverage']['竞品体验']} 条。结论非常明确：目标用户不缺题库和资料，缺的是一个能围绕自己项目连续追问、暴露真实挂点并给出结构化复盘的训练产品。

首版产品应聚焦“中国本科生技术实习面试准备”，把输入限制为项目经历或简历片段，输出聚焦 3-5 轮追问后的挂点复盘。核心要解决的问题是：项目深挖崩盘、八股与项目割裂、AI 项目可信度风险、复盘不可执行。

![三轮调研样本覆盖](figures/sample_coverage.svg)

## 1. 调研方法与样本边界

本次调研采用三阶段 desk research，而不是线下访谈。原因是挑战窗口只有 16 小时，真实访谈的招募、访谈和整理成本过高；公开面经、岗位 JD、开源项目和竞品体验已经能支撑 MVP 阶段的产品判断。

{md_table(['样本类型', '数量'], coverage_rows)}

调研边界：

- 小红书内容只记录公开笔记的摘要和痛点标签，不记录 cookie、token 或个人隐私。
- GitHub/题库/JD 只作为公开能力需求和项目风险分析来源。
- 第三轮原始 JSON 只保留本地，不进入 Git；报告只沉淀统计和产品结论。
- 本报告用于 Product Memo 和产品设计输入，不声称具备统计学意义上的总体代表性。

## 2. 目标用户画像

首版目标用户是准备互联网大厂或 AI 相关技术实习面试的中国本科生。典型状态包括：

- 已经有一个或多个项目，但不确定是否经得起面试官追问。
- 正在背 Java/MySQL/Redis/MQ/计网/操作系统等八股，但不知道如何和项目结合。
- 做过 RAG、Agent、LLM Chatbot、AI 全栈应用，但担心被问“是不是只调 API”。
- 看了很多面经，能记录问题，但不知道自己真正挂在知识、表达、项目可信度还是工程细节。

## 3. 用户痛点分析

### 3.1 痛点总览

![用户痛点标签分布](figures/pain_tag_distribution.svg)

公开样本显示，用户的痛点不是“没有题”，而是训练方式无法逼近真实面试。真实面试不是静态问答，而是一个压力逐步加深的过程：从自我介绍或项目开始，抓住一个技术词或指标，不断追问为什么、怎么验证、失败怎么办、换约束怎么办。

### 3.2 核心痛点一：项目深挖崩盘

项目深挖是最强痛点。候选人经常能讲清“做了什么功能”，但讲不清：

- 项目背景和真实业务问题。
- 自己负责的模块和不可替代贡献。
- 技术选型为什么成立。
- 指标、压测、优化前后对比。
- 失败路径和线上排障。

这类问题直接决定首版产品的输入方式：不应该先让用户选题库，而应该先让用户粘贴项目经历。

### 3.3 核心痛点二：八股与项目割裂

小红书和追问链样本都显示，Java、MySQL、Redis、MQ、计网、操作系统仍然高频出现，但它们不是孤立存在。真实面试经常是：

- 你项目里用了 Redis？那缓存一致性怎么保证？
- 你说查询慢？Explain 看过哪些字段？
- 你引入 MQ？消息重复消费怎么幂等？
- 你说高并发？QPS、RT、错误率是多少？

因此，八股应该作为项目深挖的追问工具，而不是单独的背诵模块。

### 3.4 核心痛点三：AI 项目可信度风险

第三轮项目样本和 JD 样本都显示，RAG、Agent、LLM 应用已经成为实习候选人的高频项目包装方向。但这类项目尤其容易被问穿：

- 数据从哪里来，如何清洗、切块、更新？
- 检索失败如何定位，是 chunk、embedding、rerank 还是 prompt 的问题？
- Agent 是否真的有状态、记忆、工具调用和失败重试？
- 有没有评估集，指标是什么？
- 部署后如何控制成本、延迟、权限和安全？

这说明首版必须保留“RAG/Agent 项目真实性拷打”场景。

### 3.5 核心痛点四：复盘不可执行

用户往往能记录面试题，却不知道为什么答得不好。有效复盘至少要区分：

- 项目可信度不足。
- 专业深度不足。
- 表达结构混乱。
- 工程闭环缺失。
- 承压表现不稳定。
- 下一步该补项目、补八股、补表达还是补专项。

这直接定义了产品反馈维度。

## 4. 岗位与项目需求验证

第三轮调研补充了 36 条项目样本和 50 条 JD。它们说明首版产品的输入和场景设计是合理的。

![岗位 JD 方向分布](figures/jd_role_distribution.svg)

{md_table(['JD 方向', '样本数'], jd_rows)}

JD 能力要求可以压缩为三类：

1. 后端工程能力：Spring/FastAPI、数据库、Redis、MQ、接口设计、部署、稳定性。
2. AI 应用能力：RAG、Agent、Prompt、OpenAI-compatible API、LangChain/LangGraph、服务化部署、日志与 profiling。
3. 大模型/AI Infra 能力：Transformer、LoRA/PEFT、vLLM、KV Cache、GPU/K8s、推理性能。

项目样本也呈现同质化风险：后台管理、商城、秒杀、RAG、Agent、知识库问答、LLM Web 应用最常见，最容易被问的不是“技术栈是什么”，而是“你真正做了什么”和“怎么证明有效”。

![项目类型与被问穿风险矩阵](figures/project_archetype_risk_matrix.svg)

## 5. 面试追问模式

第二轮调研把真实面试问题抽象为追问链。最适合产品化的追问结构如下：

- 项目真实性链：项目背景 -> 个人贡献 -> 技术取舍 -> 指标 -> 失败路径。
- Redis 链：使用场景 -> key 设计 -> 缓存一致性 -> 击穿/穿透/雪崩 -> 降级。
- MySQL 链：慢 SQL -> 索引 -> Explain -> 锁/MVCC -> 数据量增长后的方案。
- MQ 链：为什么引入 -> 发送失败 -> 消费失败 -> 幂等 -> 顺序性 -> 堆积排查。
- RAG 链：数据来源 -> 切块 -> 检索 -> rerank -> 评估 -> 坏例归因。
- Agent 链：任务规划 -> 工具调用 -> 状态/记忆 -> 失败重试 -> 日志回放。

![追问链样本主题分布](figures/questioning_category_distribution.svg)

## 6. 竞品与替代方案缺口

![替代方案能力矩阵](figures/competitor_gap_matrix.svg)

替代方案大致分四类：

- 通用聊天机器人：能解释概念和生成题目，但不会稳定主动追问，也缺少固定评分结构。
- 海外 AI mock interview：有完整面试体验，但偏英语、海外岗位和完整招聘 pipeline。
- 题库/面经平台：资料多，但需要用户自己筛选、模拟和复盘。
- 开源 AI 面试项目：功能参考多，但大多是通用 mock 或招聘工具，不聚焦中国本科生技术实习项目深挖。

本项目的差异化不是“也能聊天”，而是中文技术实习语境下的项目驱动追问和挂点复盘。

## 7. 需要解决的问题与优先级

![用户问题优先级矩阵](figures/problem_priority_matrix.svg)

优先级最高的问题是：

1. 用户项目经不起连续追问。
2. 用户不知道自己回答挂在哪里。
3. 八股和专项知识无法迁移到项目场景。
4. RAG/Agent 等 AI 项目容易被认为只是包装。

对应的 MVP 需求是：

- 项目经历输入，而不是完整简历解析。
- 三个训练场景：项目深挖压力面、后端八股项目化追问、RAG/Agent 项目真实性拷打。
- 每次训练 3-5 轮连续追问。
- 结束后输出总评、风险点、项目可信度、专业深度、表达结构、工程闭环、承压表现和下一轮练习题。

## 8. 产品取舍

首版应该做：

- 文字交互。
- 项目经历/简历片段输入。
- 场景选择。
- AI 面试官连续追问。
- 结构化挂点复盘。

首版不应该做：

- 登录、数据库和历史记录。
- 语音和视频。
- 完整简历解析。
- 题库浏览器。
- 复杂招聘 pipeline。
- AI Infra 和算法/LLM 全方向深度覆盖。

## 9. Product Memo 可直接复用段落

我们观察到，中国本科生在技术实习面试准备中并不缺题目和资料，真正缺的是低成本、高频、接近真实面试的连续追问训练。公开面经和面试官视角都显示，真实面试往往从项目经历切入，再追问技术选型、失败路径、指标验证和迁移能力。通用聊天机器人可以解释概念，却不会稳定地抓住用户回答里的漏洞并持续追问；题库平台资料丰富，但无法针对用户自己的项目做动态复盘。因此，我们把 MVP 聚焦在“项目经历驱动的 AI 模拟面试官”：用户粘贴项目经历后，AI 连续追问并在结束后输出结构化挂点复盘，帮助用户知道下一轮到底该补项目细节、专业知识、表达结构还是工程闭环。

## 附录：关键公开来源示例

- JavaGuide：https://javaguide.cn/
- CS-Notes：https://github.com/CyC2018/CS-Notes
- doocs/advanced-java：https://github.com/doocs/advanced-java
- Doocs LeetCode：https://leetcode.doocs.org/
- AgentGuide：https://github.com/adongwanai/AgentGuide
- vLLM：https://github.com/vllm-project/vllm
- Dify：https://github.com/langgenius/dify
- RAGFlow：https://github.com/infiniflow/ragflow
- interviewing.io：https://interviewing.io/
- Steo AI：https://steo.ai/
"""
    (REPORT_DIR / "ai-interviewer-research-report.md").write_text(content, encoding="utf-8")


def write_latex(stats: dict) -> None:
    jd_rows = [[k, v] for k, v in stats["jd_counts"].items()]
    coverage_rows = [[k, v] for k, v in stats["coverage"].items()]
    tex = rf"""\documentclass[UTF8,11pt]{{ctexart}}
\usepackage[a4paper,margin=2.3cm]{{geometry}}
\usepackage{{hyperref}}
\usepackage{{booktabs}}
\usepackage{{longtable}}
\usepackage{{array}}
\usepackage{{enumitem}}
\usepackage{{xcolor}}
\usepackage{{tikz}}
\usepackage{{float}}
\usepackage{{placeins}}
\usetikzlibrary{{positioning}}
\definecolor{{reportblue}}{{HTML}}{{2563EB}}
\definecolor{{reportgreen}}{{HTML}}{{059669}}
\definecolor{{reportred}}{{HTML}}{{DC2626}}
\hypersetup{{colorlinks=true,linkcolor=reportblue,urlcolor=reportblue,hypertexnames=false}}
\setlist[itemize]{{leftmargin=1.5em}}
\setlist[enumerate]{{leftmargin=1.7em}}
\title{{AI 模拟面试官用户痛点与需求调研报告}}
\author{{AIIC Project}}
\date{{2026-05-10}}

\begin{{document}}
\maketitle

\begin{{abstract}}
本报告整合三轮公开调研，共计 {stats['total_research_items']} 条结构化研究输入。结论是：目标用户不缺题库和资料，缺的是能围绕自己项目连续追问、暴露真实挂点并给出结构化复盘的训练产品。首版应聚焦中国本科生技术实习面试准备，以项目经历输入、三类训练场景、3--5 轮追问和挂点复盘作为核心闭环。
\end{{abstract}}

\section{{执行摘要}}

我们不应该做泛用 AI 聊天，也不应该做完整题库平台；应该做一个面向中国本科生技术实习的项目经历驱动型 AI 模拟面试官，用连续追问暴露项目、八股和 AI 专项里的真实挂点。

\input{{figures/sample_coverage.tikz}}
\FloatBarrier

\section{{调研方法与样本边界}}

本次调研采用三阶段 desk research。挑战窗口只有 16 小时，真实访谈的招募和整理成本过高；公开面经、岗位 JD、开源项目和竞品体验已经足以支撑 MVP 阶段的产品判断。

{longtable(['样本类型', '数量'], coverage_rows, 'p{0.55\\linewidth}r')}

样本边界包括：不记录 cookie、token 或个人隐私；第三轮原始 JSON 只保留本地，不进入 Git；本报告用于 Product Memo 和产品设计输入，不声称具备统计学意义上的总体代表性。
\begin{{itemize}}
\item 第一轮用于验证真实用户表达和痛点强度，重点看候选人如何描述被追问、被拷打和复盘困难。
\item 第二轮用于提炼面试官视角和追问链，重点看问题如何从项目、八股、算法和 AI 专项逐步加压。
\item 第三轮用于需求验证，重点看项目样本、岗位 JD 和竞品体验能否支持一个窄而深的 MVP。
\end{{itemize}}

\section{{目标用户画像}}

首版目标用户是准备互联网大厂或 AI 相关技术实习面试的中国本科生，尤其是有项目但不确定能否经得起追问、正在背八股但不会和项目结合、做过 RAG/Agent/LLM demo 但担心被问“是不是只调 API”的学生。
\begin{{itemize}}
\item 已经有一个或多个项目，但不确定项目背景、个人贡献、指标和失败路径是否能讲清。
\item 正在背 Java、MySQL、Redis、MQ、计网、操作系统等基础知识，但缺少项目化迁移训练。
\item 做过 RAG、Agent、LLM Chatbot 或 AI 全栈应用，但担心被问到数据来源、评估、成本和部署细节。
\item 看过大量面经，却无法判断自己真实挂点在知识、表达、项目可信度还是承压表现。
\end{{itemize}}

\section{{用户痛点分析}}

\input{{figures/pain_tag_distribution.tikz}}
\FloatBarrier

公开样本显示，用户的痛点不是“没有题”，而是训练方式无法逼近真实面试。真实面试不是静态问答，而是一个压力逐步加深的过程：从自我介绍或项目开始，抓住一个技术词、指标或项目描述，不断追问为什么、怎么验证、失败怎么办、换约束怎么办。

\subsection{{项目深挖崩盘}}
候选人经常能讲清功能，却讲不清个人贡献、技术取舍、指标、失败路径和真实修改。这直接决定首版产品不应先让用户选题库，而应先让用户粘贴项目经历。
\begin{{itemize}}
\item 典型挂点包括：项目背景过于模板化、个人贡献不清、指标缺失、压测和上线证据不足。
\item 面试官常见追问是：为什么这样设计，替代方案是什么，失败时如何定位，数据量增长后怎么办。
\item 产品含义是：项目输入必须成为训练入口，追问必须沿着用户自己的技术栈展开。
\end{{itemize}}

\subsection{{八股与项目割裂}}
Java、MySQL、Redis、MQ、计网、操作系统仍然高频出现，但它们在真实面试中通常由项目牵出。八股应该作为项目深挖的追问工具，而不是独立背诵模块。
\begin{{itemize}}
\item Redis 不是只问数据结构，而是问缓存一致性、击穿、穿透、雪崩、降级和 key 设计。
\item MySQL 不是只问索引定义，而是问慢 SQL、Explain、锁、MVCC、数据量增长后的拆分。
\item MQ 不是只问模型，而是问发送失败、消费失败、幂等、顺序性和消息堆积排查。
\end{{itemize}}

\subsection{{AI 项目可信度风险}}
RAG、Agent、LLM 应用已经成为高频项目包装方向，但面试会追到数据来源、切块、检索、工具调用、评估、部署和失败归因。首版必须保留 RAG/Agent 项目真实性拷打场景。
\begin{{itemize}}
\item RAG 会被追问数据来源、清洗、chunk 策略、embedding、rerank、评估集和坏例归因。
\item Agent 会被追问任务规划、工具调用、状态/记忆、失败重试、日志回放和权限边界。
\item 如果用户只会说“调 API”，项目很容易被判定为包装；产品需要提前暴露这种风险。
\end{{itemize}}

\subsection{{复盘不可执行}}
用户能记录面试题，却不知道自己究竟挂在项目可信度、专业深度、表达结构、工程闭环还是承压表现。因此产品反馈必须结构化。
\begin{{itemize}}
\item 只给“表达不清楚”或“基础不扎实”没有训练价值，用户需要知道下一轮该补什么。
\item 反馈维度应至少覆盖项目可信度、专业深度、表达结构、工程闭环、承压表现和下一步行动。
\item 这类复盘适合由 AI 产品承接，因为它可以在每轮回答后保留上下文并总结模式化问题。
\end{{itemize}}

\section{{岗位与项目需求验证}}

\input{{figures/jd_role_distribution.tikz}}
\FloatBarrier

{longtable(['JD 方向', '样本数'], jd_rows, 'p{0.62\\linewidth}r')}

JD 能力要求可以压缩为三类：后端工程能力、AI 应用能力、大模型/AI Infra 能力。项目样本也呈现同质化风险：后台管理、商城、秒杀、RAG、Agent、知识库问答最常见，最容易被问的是“你真正做了什么”和“怎么证明有效”。
\begin{{enumerate}}
\item 后端工程能力：接口设计、数据库、Redis、MQ、服务部署、日志、稳定性和排障。
\item AI 应用能力：RAG、Agent、Prompt、OpenAI-compatible API、服务化部署、延迟和成本控制。
\item 大模型/AI Infra 能力：Transformer、LoRA/PEFT、vLLM、KV Cache、GPU/K8s 和推理性能。
\end{{enumerate}}

\input{{figures/project_archetype_risk_matrix.tikz}}
\FloatBarrier

\section{{面试追问模式}}

真实面试问题可以抽象为追问链：项目真实性链、Redis 链、MySQL 链、MQ 链、RAG 链、Agent 链。每条链都从“你做了什么”追到“为什么、失败怎么办、怎么验证、换约束怎么办”。
\begin{{itemize}}
\item 项目真实性链：项目背景 -> 个人贡献 -> 技术取舍 -> 指标 -> 失败路径。
\item Redis 链：使用场景 -> key 设计 -> 缓存一致性 -> 击穿/穿透/雪崩 -> 降级。
\item MySQL 链：慢 SQL -> 索引 -> Explain -> 锁/MVCC -> 数据量增长后的方案。
\item MQ 链：为什么引入 -> 发送失败 -> 消费失败 -> 幂等 -> 顺序性 -> 堆积排查。
\item RAG 链：数据来源 -> 切块 -> 检索 -> rerank -> 评估 -> 坏例归因。
\item Agent 链：任务规划 -> 工具调用 -> 状态/记忆 -> 失败重试 -> 日志回放。
\end{{itemize}}

\input{{figures/questioning_category_distribution.tikz}}
\FloatBarrier

\section{{竞品与替代方案缺口}}

\input{{figures/competitor_gap_matrix.tikz}}
\FloatBarrier

通用聊天机器人能解释概念和生成题目，但不会稳定主动追问；海外 AI mock interview 偏英语和海外岗位；题库平台资料丰富但不能针对用户项目复盘；开源 AI 面试项目多数偏通用 mock 或招聘工具。本项目的差异化是中文技术实习语境下的项目驱动追问和挂点复盘。
\begin{{itemize}}
\item 通用 LLM 的问题是太听话，用户回答浅时也容易继续解释概念，而不是持续追问漏洞。
\item 题库和面经平台的问题是资料丰富但训练闭环弱，用户仍需要自己筛题、模拟和复盘。
\item 海外 mock interview 产品的问题是岗位、语言和评估语境不匹配中国本科生技术实习。
\item 开源项目的参考价值在工程形态，产品定位上仍需要重新收敛到项目深挖训练。
\end{{itemize}}

\section{{需要解决的问题与优先级}}

\input{{figures/problem_priority_matrix.tikz}}
\FloatBarrier

优先级最高的问题是：用户项目经不起连续追问、用户不知道自己回答挂在哪里、八股和专项知识无法迁移到项目场景、RAG/Agent 等 AI 项目容易被认为只是包装。
\begin{{enumerate}}
\item 用户项目经不起连续追问：这是最强痛点，也是最容易通过 AI 面试官闭环体现差异化的问题。
\item 用户不知道自己回答挂在哪里：这是复用和留存的关键，必须以结构化反馈输出。
\item 八股和专项知识无法迁移到项目场景：首版不做题库，但要把高频八股嵌入项目追问。
\item RAG/Agent 项目容易被认为只是包装：这是 AI 方向学生的显著风险，适合作为特色场景。
\end{{enumerate}}

对应的 MVP 需求是：项目经历输入、三个训练场景、每次 3--5 轮连续追问、结束后输出总评、风险点、项目可信度、专业深度、表达结构、工程闭环、承压表现和下一轮练习题。

\section{{产品取舍}}

首版应该做文字交互、项目经历输入、场景选择、连续追问和结构化挂点复盘。不做登录、数据库、语音、视频、完整简历解析、题库浏览器和复杂招聘 pipeline。
\begin{{itemize}}
\item 应该做：文字交互、项目经历/简历片段输入、场景选择、AI 面试官连续追问、结构化挂点复盘。
\item 暂不做：登录、数据库、历史记录、语音、视频、完整简历解析、题库浏览器、复杂招聘 pipeline。
\item 取舍理由：挑战时间有限，评分重点是目标用户理解和核心闭环，不是功能数量。
\end{{itemize}}

\section{{Product Memo 可复用段落}}

我们观察到，中国本科生在技术实习面试准备中并不缺题目和资料，真正缺的是低成本、高频、接近真实面试的连续追问训练。公开面经和面试官视角都显示，真实面试往往从项目经历切入，再追问技术选型、失败路径、指标验证和迁移能力。通用聊天机器人可以解释概念，却不会稳定地抓住用户回答里的漏洞并持续追问；题库平台资料丰富，但无法针对用户自己的项目做动态复盘。因此，我们把 MVP 聚焦在“项目经历驱动的 AI 模拟面试官”：用户粘贴项目经历后，AI 连续追问并在结束后输出结构化挂点复盘，帮助用户知道下一轮到底该补项目细节、专业知识、表达结构还是工程闭环。

\section{{附录：关键公开来源示例}}
\begin{{itemize}}
\item JavaGuide：\url{{https://javaguide.cn/}}
\item CS-Notes：\url{{https://github.com/CyC2018/CS-Notes}}
\item doocs/advanced-java：\url{{https://github.com/doocs/advanced-java}}
\item Doocs LeetCode：\url{{https://leetcode.doocs.org/}}
\item AgentGuide：\url{{https://github.com/adongwanai/AgentGuide}}
\item vLLM：\url{{https://github.com/vllm-project/vllm}}
\item Dify：\url{{https://github.com/langgenius/dify}}
\item RAGFlow：\url{{https://github.com/infiniflow/ragflow}}
\item interviewing.io：\url{{https://interviewing.io/}}
\item Steo AI：\url{{https://steo.ai/}}
\end{{itemize}}

\end{{document}}
"""
    (REPORT_DIR / "ai-interviewer-research-report.tex").write_text(tex, encoding="utf-8")


def write_readme() -> None:
    readme = """# Final Research Report

本目录保存 AI 模拟面试官的最终调研报告材料。

## Files

- `ai-interviewer-research-report.md`：Markdown 版本。
- `ai-interviewer-research-report.tex`：LaTeX/XeLaTeX 源文件。
- `ai-interviewer-research-report.pdf`：编译后的 PDF。
- `figures/`：SVG 图和 LaTeX/TikZ 图。
- `scripts/build_report_assets.py`：用 Python 标准库重新生成报告和图表。

## Regenerate

```bash
python3 target/research/final-report/scripts/build_report_assets.py
cd target/research/final-report
latexmk -xelatex ai-interviewer-research-report.tex
```

第三轮原始 JSON 数据在 `target/research/demand-validation-desk-research/data/`，已被 `.gitignore` 忽略，不提交到 Git。
"""
    (REPORT_DIR / "README.md").write_text(readme, encoding="utf-8")


if __name__ == "__main__":
    main()
