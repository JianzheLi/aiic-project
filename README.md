# AI Agent 产品挑战 MVP

一个用于“16 小时 AI Agent 产品挑战”的最小可用全栈聊天应用。项目提供中文友好的聊天网页、FastAPI 后端、健康检查接口，并默认通过 DeepSeek 的 OpenAI-compatible API 接入模型服务。

## 功能

- 中文聊天网页，适合快速 demo 展示。
- 后端 `POST /chat` 聊天接口。
- 后端 `GET /health` 健康检查接口。
- 支持 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`MODEL_NAME`、`SYSTEM_PROMPT` 环境变量。
- Docker Compose 一键启动，前端端口 `3000`，后端端口 `8000`。
- 浏览器只需要访问 `3000`；前端容器会把 `/api/*` 代理到后端。

## 目录结构

```text
.
├── backend/              # FastAPI 后端
├── frontend/             # Vite + React 前端
├── docker-compose.yml
├── .env.example
├── .gitignore
├── AGENTS.md
└── README.md
```

## 环境变量

复制示例文件后再填写真实配置：

```bash
cp .env.example .env
```

变量说明：

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI-compatible API Key | `sk-...` |
| `OPENAI_BASE_URL` | OpenAI-compatible API 地址，默认使用 DeepSeek | `https://api.deepseek.com` |
| `MODEL_NAME` | 模型名称 | `deepseek-v4-flash` |
| `SYSTEM_PROMPT` | 系统提示词 | `你是一个中文友好的助手...` |

不要把真实 `.env` 提交到 Git。

## 本地运行

### 后端

推荐使用 `uv` 管理 Python 依赖。若服务器没有 `uv`，可先安装：

```bash
python3 -m pip install --user uv
```

启动后端：

```bash
cd backend
uv venv
uv pip install -r requirements.txt
export OPENAI_API_KEY="你的 key"
export OPENAI_BASE_URL="https://api.deepseek.com"
export MODEL_NAME="deepseek-v4-flash"
export SYSTEM_PROMPT="你是一个中文友好的 AI Agent 产品挑战助手，回答要清晰、务实、可执行。"
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

健康检查：

```bash
curl http://localhost:8000/health
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

访问：

```text
http://localhost:3000
```

前端默认请求同源 `/api`，由前端服务代理到后端。开发模式下 Vite 会把 `/api/*` 代理到 `http://localhost:8000`。如需覆盖：

```bash
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

## Docker 部署

在项目根目录执行：

```bash
cp .env.example .env
# 编辑 .env，填入真实 OPENAI_API_KEY
docker compose up -d --build
```

如果要在界面显示当前 commit 和分钟级更新时间，推荐使用：

```bash
bash scripts/build-with-version.sh
```

查看服务状态：

```bash
docker compose ps
docker compose logs -f
```

停止服务：

```bash
docker compose down
```

## 云服务器部署

1. 确认云服务器安全组或防火墙已放行 TCP `3000` 和 `8000`。
2. 在服务器项目目录创建 `.env` 并填入真实配置。
3. 启动服务：

```bash
docker compose up -d --build
```

4. 使用公网 IP 访问：

```text
http://8.139.254.60:3000
```

5. 测试 3000 端口同源代理：

```bash
curl http://8.139.254.60:3000/api/config
```

6. 测试后端健康检查：

```bash
curl http://8.139.254.60:8000/health
```

7. 测试聊天接口。推荐走 3000 端口代理，和浏览器路径一致：

```bash
curl -X POST http://8.139.254.60:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好，请用一句话介绍这个 demo。"}]}'
```

如果 `/health` 正常但聊天失败，优先检查 `.env` 中的 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `MODEL_NAME`。DeepSeek 官方文档推荐 OpenAI-compatible `base_url` 使用 `https://api.deepseek.com`，模型可使用 `deepseek-v4-flash` 或 `deepseek-v4-pro`。

## 推送到 GitHub

初始化并提交后，添加远程仓库：

```bash
git remote add origin git@github.com:你的用户名/你的仓库名.git
git branch -M main
git push -u origin main
```

如果使用 HTTPS 远程地址：

```bash
git remote add origin https://github.com/你的用户名/你的仓库名.git
git branch -M main
git push -u origin main
```
