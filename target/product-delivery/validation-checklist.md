# 验证清单

## 自动化

- [x] 后端 pytest：`.deps/backend-venv/bin/python -m pytest backend/tests -q`，21 passed。
- [x] 前端构建：`cd frontend && npm run build`，构建通过。
- [x] 前端 E2E：`cd frontend && npm run test:e2e`，6 passed。

## 本地接口

- [x] `curl http://localhost:8000/health`
- [x] `curl http://localhost:3000/api/config`
- [x] `POST /api/resume/extract` 能解析 TXT/DOCX/PDF 文本简历。
- [x] `POST /api/interview/message` 能返回第一轮问题。

## 公网 Demo

- [x] `http://8.139.254.60:3000/` 可访问。
- [x] `http://8.139.254.60:3000/api/config` 可访问且不泄露 key。
- [x] `http://8.139.254.60:3000/api/health` 返回 ok。
- [x] `http://localhost:8000/health` 在服务器本机返回 ok。
- [ ] `http://8.139.254.60:8000/health` 公网直连超时；当前公网 Demo 验收以 `3000` 和 `/api/*` 同源代理为准。
- [x] 真实 `deepseek-v4-pro` 公网调用能基于简历追问 RAG/PDF/chunk 等技术细节。
- [x] 公网浏览器 smoke：样例简历、RAG 场景、后端场景、场景切回会话恢复均通过；无 console error。

## 主动尝试的 Bug 场景

- [x] 未上传或粘贴简历点击开始。
- [x] 上传不支持的文件类型。
- [x] 扫描型/无文本 PDF 返回清晰错误。
- [x] 训练场景切换时各自对话独立保留。
- [x] 替换简历后清空所有场景会话。
- [x] 模型 API 错误时显示中文错误。
- [x] 快速重复点击开始、发送、结束。
- [x] Enter 发送，Shift+Enter 换行。
- [x] 移动端视口不出现明显遮挡或按钮文字溢出。
