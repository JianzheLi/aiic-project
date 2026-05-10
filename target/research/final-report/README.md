# Final Research Report

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
