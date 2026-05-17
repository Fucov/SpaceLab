# SpaceLabOS Requirements

本文档是项目依赖与运行环境的唯一人工维护入口。Python 依赖以根目录 `pyproject.toml` 为准，前端依赖以 `lightrag_webui/package.json` 为准；旧的 `requirements-offline*.txt` 已合并到本文档，不再单独维护。

## 运行环境

| 组件 | 要求 | 说明 |
|------|------|------|
| Windows PowerShell | 5.1+ 或 PowerShell 7+ | 推荐 PowerShell 7 |
| Python | 3.10+ | 后端与 LightRAG Core |
| Node.js | 18+ | WebUI 开发服务器与构建 |
| Bun | 可选，推荐 | WebUI 测试与更快安装；没有 Bun 时脚本回退到 npm |
| Git | 推荐 | 开发、版本管理 |

## Python 依赖分层

推荐使用 editable install：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -e ".[api]"
```

常用 extras：

| Extra | 安装命令 | 用途 |
|------|----------|------|
| `api` | `python -m pip install -e ".[api]"` | FastAPI 服务、文档上传、基础 WebUI 后端 |
| `offline-storage` | `python -m pip install -e ".[offline-storage]"` | Redis、Neo4j、Milvus、MongoDB、PostgreSQL/pgvector、Qdrant、OpenSearch 等存储后端 |
| `offline-llm` | `python -m pip install -e ".[offline-llm]"` | OpenAI、Anthropic、Ollama、ZhipuAI、Bedrock、VoyageAI、LlamaIndex、Gemini 等 LLM/Embedding 客户端 |
| `offline` | `python -m pip install -e ".[offline]"` | `api + offline-storage + offline-llm` 的完整离线部署集合 |
| `docling` | `python -m pip install -e ".[docling]"` | 高级文档解析引擎 |
| `test` | `python -m pip install -e ".[test]"` | pytest、ruff、pre-commit |
| `evaluation` | `python -m pip install -e ".[evaluation]"` | RAGAS 评估 |
| `observability` | `python -m pip install -e ".[observability]"` | Langfuse 观测 |

完整离线下载示例：

```powershell
python -m pip download -d .\packages -e ".[offline]"
python -m pip install --no-index --find-links .\packages -e ".[offline]"
```

## WebUI 依赖

```powershell
cd lightrag_webui
bun install --frozen-lockfile
```

没有 Bun 时可用 npm：

```powershell
cd lightrag_webui
npm install
```

常用命令：

| 命令 | 说明 |
|------|------|
| `npm run dev` / `bun run dev` | 启动 Vite 开发服务器 |
| `npm run build` / `bun run build` | 构建 WebUI 到 `lightrag/api/webui` |
| `bun test` | 前端测试，需要 Bun |

## 配置文件

运行前建议准备根目录 `.env`。如果没有 `.env`，服务会给出警告并继续启动，但 LLM、Embedding 或外部存储可能不可用。

最低限度需要确认：

```env
PORT=9621
LLM_BINDING=openai
LLM_BINDING_HOST=https://example.com/v1
LLM_BINDING_API_KEY=your-key
LLM_MODEL=your-model

EMBEDDING_BINDING=openai
EMBEDDING_BINDING_HOST=https://example.com/v1
EMBEDDING_BINDING_API_KEY=your-key
EMBEDDING_MODEL=your-embedding-model
EMBEDDING_DIM=1024
```

更换 Embedding 模型或维度后，需要清空对应工作目录中的旧索引数据再重新导入文档。

## PowerShell 启停

从仓库根目录运行：

```powershell
.\scripts\start-spacelab.ps1
```

首次或依赖缺失时可显式安装缺失依赖：

```powershell
.\scripts\start-spacelab.ps1 -InstallMissing
```

停止服务：

```powershell
.\scripts\stop-spacelab.ps1
```

启动脚本会检查：

- Python/虚拟环境是否可用
- 后端关键模块是否可导入
- Node.js 是否可用
- Bun 或 npm 是否可用
- WebUI 依赖是否存在
- API 端口 `9621` 与 WebUI 端口 `5173` 是否已被占用

默认访问地址：

| 页面 | 地址 |
|------|------|
| 入口导航 | http://localhost:5173/webui/#/spacelab |
| 演示大屏 | http://localhost:5173/webui/#/spacelab/main |
| 平板终端 | http://localhost:5173/webui/#/spacelab/tablet |
| API 文档 | http://localhost:9621/docs |
