# 验证清单

## 自动化

- [x] 后端 pytest：`cd backend && python3 -m pytest -q`，37 passed。
- [x] 前端构建：`cd frontend && npm run build`，构建通过。
- [x] 前端 E2E：`cd frontend && npm run test:e2e`，9 passed。
- [x] LaTeX 编译：`product-memo.pdf`、`demo-slides.pdf`、`fake-agent-resume.pdf` 均由 XeLaTeX 生成。
- [x] Product Memo 为 2 页 PDF；Demo Beamer 为 11 页路演版 PDF。

## 本地接口

- [x] `curl http://localhost:8000/health`
- [x] `curl http://localhost:3000/api/config`
- [x] `POST /api/resume/extract` 能解析 TXT/DOCX/PDF 文本简历，并对扫描 PDF 尝试 OCR。
- [x] 文字型 PDF 优先走 PyMuPDF/pypdf 文本层解析，不触发 OCR。
- [x] `fake-agent-resume.pdf` 走文本层解析，`extraction_method="text"`、`ocr_used=false`、解析出 1614 字。
- [x] 前端 `PDF 样例简历` 按钮会请求 `/samples/fake-agent-resume.pdf` 并复用上传解析链路。
- [x] `POST /api/resume/extract` 文件上限默认 25MB，可通过 `RESUME_MAX_BYTES` 配置。
- [x] `POST /api/interview/message` 能返回第一轮问题、资料依据、问题标签和风险假设。

## 公网 Demo

- [x] `http://8.139.254.60:3000/` 可访问。
- [x] `http://8.139.254.60:3000/api/config` 可访问且不泄露 key。
- [x] `http://8.139.254.60:3000/api/health` 返回 ok。
- [x] `http://localhost:8000/health` 在服务器本机返回 ok。
- [ ] `http://8.139.254.60:8000/health` 公网直连超时；当前公网 Demo 验收以 `3000` 和 `/api/*` 同源代理为准。
- [x] Docker 后端镜像内 `tesseract --list-langs` 包含 `chi_sim`、`eng`、`osd`。
- [x] 公网 `/api/resume/extract` 对扫描 PDF 触发 `extraction_method="ocr"`、`ocr_used=true`。
- [x] 真实 `deepseek-v4-pro` 公网调用能基于简历追问 RAG/PDF/chunk 等技术细节。
- [x] 公网 `/api/interview/message` 返回 `source_cards`、`question_tags`、`resume_evidence`、`risk_hypothesis`。
- [x] 公网浏览器 smoke：样例简历、RAG 场景、后端场景、场景切回会话恢复均通过；无 console error。
- [x] 公网浏览器 smoke：RAG/后端场景均能显示“本轮追问依据”。
- [x] 服务器 `/root/.ssh/authorized_keys` 已追加挑战说明中的两个 `ssh-ed25519` 公钥，权限保持 `700/600`。

## 主动尝试的 Bug 场景

- [x] 未上传或粘贴简历点击开始。
- [x] 上传不支持的文件类型。
- [x] 扫描型/无文本 PDF 走本地 OCR；OCR 失败时返回清晰错误。
- [x] 泛泛面试问题会触发 critic 重写。
- [x] 过度强要精确数字或同时追多个子任务的问题会触发 critic 重写。
- [x] 前端能展示本轮追问依据。
- [x] 训练场景切换时各自对话独立保留。
- [x] 替换简历后清空所有场景会话。
- [x] 模型 API 错误时显示中文错误。
- [x] 快速重复点击开始、发送、结束。
- [x] Enter 发送，Shift+Enter 换行。
- [x] 移动端视口不出现明显遮挡或按钮文字溢出。
