# SpaceLabOS

太空实验室智能操作系统 — 基于 LightRAG 知识图谱检索增强生成框架的双屏联动交互演示系统。

## 功能概览

### 双屏联动架构

| 界面 | 地址 | 适用场景 | 核心功能 |
|------|------|----------|----------|
| 演示大屏 | `/spacelab/main` | 指挥中心、监控室 | 全局监控、告警管理、详情查看 |
| 平板终端 | `/spacelab/tablet` | 现场操作、移动巡检 | AI 对话、文档管理、知识图谱 |

### 六大实验舱监控

实时监控空间站六大实验舱的运行状态，支持 DAG 流程可视化：

- 生命科学舱 — 微重力生物实验、拟南芥生长研究
- 流体物理舱 — 毛细管现象、表面张力测定
- 材料实验舱 — 钛合金凝固、玻璃微球制备
- 燃烧科学舱 — 微重力火焰传播研究
- 对地观测舱 — 高光谱遥感、大气成分探测
- 生物技术舱 — 蛋白质电泳、DNA 提取

每个舱体显示：温度 / CO₂ / 湿度 / 气压 / 任务进度 / ETA / DAG 步骤

### 智能助手对话

基于 LightRAG 的自然语言问答系统，支持：

- **多模式检索**：naive / local / global / hybrid / mix / bypass
- **流式响应**：实时逐字输出
- **思考折叠**：LLM 思考过程可展开/收起
- **本地指令**：文字控制实验舱（启动/终止/查询状态）
- **知识问答**：基于已导入文档的专业问答

### 知识图谱可视化

交互式图谱展示，支持节点类型过滤、标签搜索与热门标签、社区聚类可视化。

### 文档管理

PDF / TXT / Markdown / 代码等 30+ 格式支持，批量上传与自动索引，处理状态追踪，向量化检索。

### 告警与设备监控

实时告警日志（INFO / WARN / ERROR 分级），计算节点资源监控（CPU / GPU / 内存 / 温度），公共设备状态面板，全局环境参数。

## 系统架构

```
┌────────────────────────────────────────────────────────────┐
│                        用户界面层                              │
│  ┌──────────────────┐        ┌──────────────────────┐      │
│  │   演示大屏        │        │   平板终端              │      │
│  │  SpaceLabApp    │        │  TabletApp          │      │
│  │  SpaceLabDemo   │        │  (HITL 智能助手)    │      │
│  └────────┬────────┘        └──────────┬──────────┘      │
│             │                              │                 │
│             │  Zustand (useSpaceLabStore) │                 │
│             │◄─────── shared state ───────►│                 │
│             │                              │                 │
└─────────────┼──────────────────────────────┼─────────────────┘
               │                              │
┌──────────────▼──────────────────────────────▼─────────────────┐
│              React 19 + TypeScript + Tailwind CSS              │
│              Zustand 状态管理 / Vite + Bun 构建               │
│              React Router v7 (HashRouter)                      │
└─────────────────────────────┬──────────────────────────────────┘
                              │ queryTextStream() / fetch
┌─────────────────────────────▼──────────────────────────────────┐
│                  LightRAG API (localhost:9621)                   │
│  /query  /query/stream(NDJSON)  /documents  /graph  /health  │
└─────────────────────────────┬──────────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│                     LightRAG Core                               │
│  知识图谱检索 (Neo4j/JSON)  向量检索 (Faiss/Qdrant)  LLM   │
└───────────────────────────────────────────────────────────────┘
```

## 快速启动

### 环境要求

- Node.js 18+ (推荐 Bun)
- Python 3.10+
- LightRAG 依赖的 LLM 服务（如 OpenAI、Ollama 等）

### 安装步骤

```bash
# 1. 安装 Python 依赖
cd /root/LightRAG
source .venv/bin/activate

# 2. 配置环境变量
cp env.example .env
# 编辑 .env，配置 LLM 和 Embedding 服务

# 3. 安装前端依赖
cd lightrag_webui
bun install --frozen-lockfile

# 4. 启动服务
cd /root/LightRAG
bash start_spacelab.sh
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 入口导航 | http://localhost:5173/webui/#/spacelab |
| 演示大屏 | http://localhost:5173/webui/#/spacelab/main |
| 平板终端 | http://localhost:5173/webui/#/spacelab/tablet |
| API 文档 | http://localhost:9621/docs |

## 项目结构

```
LightRAG/
├── lightrag/                       # LightRAG 核心 Python 包
│   └── api/
│       └── routers/              # FastAPI 路由
├── lightrag_webui/
│   └── src/features/spacelab/   # SpaceLabOS 双屏系统
│       ├── SpaceLabDemo.tsx      # 入口导航页（粒子动画）
│       ├── SpaceLabApp.tsx       # 大屏主控（指挥中心）
│       ├── TabletApp.tsx         # 平板终端（多会话 + HITL）
│       ├── DagEditor.tsx         # DAG 步骤编辑器
│       ├── MarkdownRenderer.tsx  # Markdown + 思考折叠渲染
│       ├── AgentComponents.tsx    # 实验 DAG + 执行草稿面板
│       ├── ExperimentResultViewer.tsx  # 实验结果图表
│       ├── conversationStore.ts   # 多会话状态（Zustand + localStorage）
│       ├── store.ts              # 全局状态（舱体/告警/HITL 授权）
│       ├── skills.ts             # Skills 路由 + DAG 步骤解析
│       ├── types.ts              # TypeScript 类型定义
│       └── mainScreen/          # 大屏子组件
│           ├── LabModuleGrid.tsx      # 实验舱卡片矩阵
│           ├── LabModuleDetail.tsx   # 舱体详情 + DAG SVG
│           ├── AlertLog.tsx          # 告警日志
│           ├── ComputePanel.tsx      # 算力池监控
│           └── EquipmentPanel.tsx    # 设备状态
├── docs/                          # 文档
│   ├── README.md                      # 文档总览
│   ├── SPACELAB_USER_MANUAL.md       # 双屏使用手册
│   ├── SPACELAB_TECHNICAL_WHITEPAPER.md  # 技术白皮书
│   └── API_DOCUMENTATION.md          # API 端点参考
├── env.example                   # 环境变量模板
└── CLAUDE.md                     # AI 开发指南
```

## AI 助手使用指南

### 本地指令（无需 LLM）

| 指令 | 功能 |
|------|------|
| `启动[舱名]` | 启动指定实验舱 |
| `终止[舱名]` | 停止指定实验舱 |
| `终止任务` | 停止所有运行中的实验 |
| `查询状态` | 查看所有舱体状态 |

### 检索模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| naive | 纯向量搜索 | 简单文档检索 |
| local | 实体+关系检索 | 特定实体相关问题 |
| global | 社区+摘要检索 | 广泛知识关联 |
| hybrid | 本地+全局组合 | 综合查询 |
| **mix** | 图+向量融合 | **推荐模式** |
| bypass | 直连 LLM | 无需检索 |

## 环境变量配置

```bash
# 服务
PORT=9621

# LLM（示例：SiliconFlow OpenAI 兼容服务）
LLM_BINDING=openai
LLM_BINDING_HOST=https://llm.actscal.org/v1
LLM_BINDING_API_KEY=your-api-key
LLM_MODEL=lab-chat

# Embedding
EMBEDDING_BINDING=openai
EMBEDDING_BINDING_HOST=https://api.siliconflow.cn/v1
EMBEDDING_BINDING_API_KEY=your-embedding-key
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIM=1024

# Reranker（可选，推荐）
# RERANK_BINDING=cohere
# RERANK_MODEL=BAAI/bge-reranker-v2-m3
```

> **注意**：更换 Embedding 模型后必须清空 `rag_storage/` 目录重新索引。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |
| 构建工具 | Vite + Bun |
| 后端框架 | FastAPI + Uvicorn |
| RAG 核心 | LightRAG |
| LLM | OpenAI / 通义千问 / Ollama 等 |

## 文档体系

详细文档位于 `docs/` 目录：

| 文档 | 说明 |
|------|------|
| [docs/SPACELAB_USER_MANUAL.md](docs/SPACELAB_USER_MANUAL.md) | 双屏使用手册（面向用户） |
| [docs/SPACELAB_TECHNICAL_WHITEPAPER.md](docs/SPACELAB_TECHNICAL_WHITEPAPER.md) | 技术白皮书（面向开发者） |
| [docs/README.md](docs/README.md) | 文档总览 + .env 与 config.ini 说明 |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | API 端点快速参考 |

## 故障排查

### 症状：返回 "No relevant context found"

最常见原因：**不是 LightRAG 代码问题，而是配置或数据问题**。

| 日志关键词 | 含义 | 解决方案 |
|-----------|------|----------|
| `401 - Api key is invalid` | Embedding API Key 无效 | 更新 `.env` 中的 `EMBEDDING_BINDING_API_KEY` |
| `401 - Api key is invalid` | LLM API Key 无效 | 更新 `.env` 中的 `LLM_BINDING_API_KEY` |
| `Loaded graph... 0 nodes, 0 edges` | 知识图谱为空 | 先上传文档并确认处理成功 |
| `full_docs with 0 records` | 文档未索引 | 先上传并处理文档 |

完整故障排查见 [docs/SPACELAB_USER_MANUAL.md](docs/SPACELAB_USER_MANUAL.md) 第 5 节。

### 症状：服务器返回 500 错误

检查 `lightrag.log` 中的具体错误信息，常见原因：

- LLM/Embedding 服务不可达
- 超时配置过短
- 存储目录权限问题

## License

本项目继承 LightRAG 许可证。
