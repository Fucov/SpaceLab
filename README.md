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

- 🧬 生命科学舱 — 微重力生物实验、拟南芥生长研究
- 🌊 流体物理舱 — 毛细管现象、表面张力测定
- 🔬 材料实验舱 — 钛合金凝固、玻璃微球制备
- 🔥 燃烧科学舱 — 微重力火焰传播研究
- 🌍 对地观测舱 — 高光谱遥感、大气成分探测
- 🧫 生物技术舱 — 蛋白质电泳、DNA 提取

每个舱体显示：温度 / CO₂ / 湿度 / 气压 / 任务进度 / ETA / DAG 步骤

### 智能助手对话

基于 LightRAG 的自然语言问答系统，支持：

- **多模式检索**：naive / local / global / hybrid / mix / bypass
- **流式响应**：实时逐字输出
- **本地指令**：语音/文字控制实验舱（启动/终止/查询状态）
- **知识问答**：基于已导入文档的专业问答

### 知识图谱可视化

交互式图谱展示，支持：

- 节点类型过滤（实体 / 关系）
- 标签搜索与热门标签
- 社区聚类可视化
- 节点详情查看

### 文档管理系统

- PDF / TXT / Markdown / 代码等 30+ 格式支持
- 批量上传与自动索引
- 处理状态追踪
- 向量化检索

### 告警与设备监控

- 实时告警日志（INFO / WARN / ERROR 分级）
- 计算节点资源监控（CPU / GPU / 内存 / 温度）
- 公共设备状态面板
- 全局环境参数（舱温 / 湿度 / 气压 / 噪声）

## 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                        用户界面层                              │
│  ┌─────────────────────┐      ┌─────────────────────┐       │
│  │     演示大屏          │      │     平板终端          │       │
│  │  SpaceLabApp.tsx    │      │  TabletApp.tsx      │       │
│  │  (指挥中心 / 大屏)    │      │  (移动操作 / 平板)    │       │
│  └──────────┬──────────┘      └──────────┬──────────┘       │
└──────────────┼──────────────────────────────┼──────────────────┘
               │                              │
┌──────────────▼──────────────────────────────▼──────────────────┐
│                     React 19 + TypeScript                      │
│                  Zustand 状态管理 / Tailwind CSS               │
└──────────────┬──────────────────────────────┬──────────────────┘
               │                              │
               │  ┌────────────────────────┐  │
               └──►   AiAssistant 组件     ◄──┘
               │    queryTextStream()     │
               │    /query/stream (NDJSON)│
               └────────────┬─────────────┘
┌───────────────────────────▼───────────────────────────────────┐
│                 LightRAG API (localhost:9621)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /query       │  │ /query/stream│  │ /documents    │      │
│  │ /graph       │  │ /health      │  │ /auth-status  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                      LightRAG Core                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 知识图谱检索   │  │ 向量检索      │  │ LLM 生成      │      │
│  │ (Neo4j/JSON) │  │ (Faiss/Qdrant)│  │ (GPT/Claude) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
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
├── lightrag_webui/src/features/spacelab/
│   ├── SpaceLabDemo.tsx      # 入口导航页（粒子动画）
│   ├── SpaceLabApp.tsx       # 演示大屏主界面
│   ├── TabletApp.tsx         # 平板终端主界面
│   ├── mainScreen/
│   │   ├── LabModuleGrid.tsx     # 实验舱网格视图
│   │   ├── LabModuleDetail.tsx   # 舱体详情面板
│   │   ├── AlertLog.tsx          # 告警日志
│   │   ├── ComputePanel.tsx      # 计算节点监控
│   │   ├── EquipmentPanel.tsx    # 设备状态
│   │   └── GlobalParams.tsx      # 全局环境参数
│   └── tabletScreen/
│       ├── AiAssistant.tsx        # AI 对话助手 ⭐
│       ├── KnowledgeGraph.tsx     # 知识图谱可视化
│       ├── DocumentImport.tsx     # 文档上传
│       ├── LabModuleInfo.tsx      # 舱体信息
│       └── MacroData.tsx          # 宏观数据
├── lightrag/api/
│   └── routers/
│       ├── query_routes.py        # 查询接口 (/query, /query/stream)
│       ├── document_routes.py     # 文档接口
│       └── graph_routes.py        # 图数据接口
├── docs/
│   └── API_DOCUMENTATION.md   # API 接口文档
├── start_spacelab.sh         # 一键启动脚本
└── stop_spacelab.sh          # 停止脚本
```

## AI 助手使用指南

### 本地指令（无需 LLM）

| 指令 | 功能 |
|------|------|
| 启动[舱名] | 启动指定实验舱 |
| 终止[舱名] | 停止指定实验舱 |
| 终止任务 | 停止所有运行中的实验 |
| 查询状态 | 查看所有舱体状态 |

示例：`启动流体物理舱` → 模拟启动流体舱并显示 ETA

### 知识问答

基于已导入的文档进行 RAG 检索问答：

1. 先通过文档管理界面上传相关资料
2. 切换检索模式（mix 模式推荐）
3. 输入问题

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
# Server
HOST=0.0.0.0
PORT=9621

# LLM Configuration (示例：阿里云通义千问 / SiliconFlow 等 OpenAI 兼容服务)
LLM_BINDING=openai
LLM_BINDING_HOST=https://llm.actscal.org/v1
LLM_BINDING_API_KEY=your-api-key
LLM_MODEL=lab-chat

# Embedding Configuration (SiliconFlow 示例)
# IMPORTANT: Embedding API Key 必须有效，否则文档无法索引！
# 配置错误的表现：日志中出现 "401 - Api key is invalid"
# 测试 API Key 有效性：
# curl -X POST "https://api.siliconflow.cn/v1/embeddings" \
#   -H "Authorization: Bearer YOUR_API_KEY" \
#   -H "Content-Type: application/json" \
#   -d '{"model":"BAAI/bge-m3","input":"test","dimensions":1024}'
EMBEDDING_BINDING=openai
EMBEDDING_BINDING_HOST=https://api.siliconflow.cn/v1
EMBEDDING_BINDING_API_KEY=your-embedding-api-key
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIM=1024
EMBEDDING_SEND_DIM=false

# Optional: Reranker
# RERANK_BINDING=cohere
# RERANK_MODEL=bge-reranker-v2-m3
```

> **注意**：更换 Embedding 模型后必须清空 `rag_storage/` 目录重新索引。

详细配置请参考 `env.example` 文件。

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

## License

本项目继承 LightRAG 许可证。

## 故障排查指南

### 症状：返回 "No relevant context found for the query."

这是最常见的 RAG 检索失败症状。**大多数情况下，这不是 LightRAG 代码问题，而是配置或数据问题。** 请按以下顺序排查：

#### 第一步：检查服务器日志

```bash
tail -100 lightrag.log
```

**关键错误标识：**

| 日志关键词 | 含义 | 解决方案 |
|-----------|------|----------|
| `401 - Api key is invalid` | **Embedding API Key 无效** | 更新 `.env` 中的 `EMBEDDING_BINDING_API_KEY` |
| `401 - Api key is invalid` | **LLM API Key 无效** | 更新 `.env` 中的 `LLM_BINDING_API_KEY` |
| `Failed to batch pre-compute embeddings` | Embedding 服务调用失败 | 检查 Embedding 服务是否可用 |
| `Connection refused` | 服务地址错误或未启动 | 确认 `EMBEDDING_BINDING_HOST` 地址正确 |
| `Loaded graph... 0 nodes, 0 edges` | **知识图谱为空** | 先上传文档并确认处理成功 |
| `full_docs with 0 records` | **文档未索引** | 先上传并处理文档 |

#### 第二步：确认文档已正确索引

RAG 必须先处理文档才能检索。检查存储目录：

```bash
# 查看存储文件大小（正常应该有数 KB）
ls -la rag_storage/

# 正常文件示例（不是空的）：
# - kv_store_full_docs.json        应有数 KB（包含文档内容）
# - kv_store_doc_status.json      应有数 KB（包含处理状态）
# - vdb_chunks.json               应有数 KB（包含 chunk 向量）
# - vdb_entities.json              应有数 KB（包含实体向量）
# - vdb_relationships.json         应有数 KB（包含关系向量）
# - graph_chunk_entity_relation.graphml  应有数 KB（包含图数据）

# 如果这些文件只有 2 字节（内容为 {}），说明文档从未被成功索引
```

**常见原因：**
1. Embedding API Key 无效 → 文档处理失败
2. 文档处理过程中出错 → 检查日志中的 Pipeline 相关错误
3. 服务器重启导致后台处理中断 → 重新点击"扫描"按钮

#### 第三步：测试 API Key 是否有效

**测试 LLM API：**
```bash
curl -X POST "https://llm.actscal.org/v1/chat/completions" \
  -H "Authorization: Bearer sk-oDTMuzKIOhXSIlQxYhTI4A" \
  -H "Content-Type: application/json" \
  -d '{"model":"lab-chat","messages":[{"role":"user","content":"hello"}],"max_tokens":10}'
```

**测试 Embedding API（SiliconFlow）：**
```bash
curl -X POST "https://api.siliconflow.cn/v1/embeddings" \
  -H "Authorization: Bearer sk-zbichgykjbgncimarxzsqkzpsvxogmyglrrrp" \
  -H "Content-Type: application/json" \
  -d '{"model":"BAAI/bge-m3","input":"test","dimensions":1024}'
```

如果返回 401/403 错误，说明 API Key 已失效，需要到对应平台重新获取。

#### 第四步：确认 Embedding 配置与文档处理一致

**重要：** Embedding 模型必须在文档索引前确定，索引和查询必须使用相同的 Embedding 模型和维度。

```bash
# 查看当前 Embedding 配置
grep -E "EMBEDDING_" .env

# 常见配置（SiliconFlow）：
EMBEDDING_BINDING=openai
EMBEDDING_BINDING_HOST=https://api.siliconflow.cn/v1
EMBEDDING_BINDING_API_KEY=your-valid-key
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIM=1024
EMBEDDING_SEND_DIM=false
```

#### 第五步：检查文档处理状态

访问 API 文档页面 (`http://localhost:9621/docs`)，使用以下接口：

1. **GET /documents/pipeline_status** - 查看处理队列状态
2. **POST /documents/scan** - 重新扫描并处理输入目录中的文档
3. **GET /documents** - 查看所有文档的处理状态

文档状态应为 `PROCESSED`，不是 `FAILED` 或 `PENDING`。

### 症状：服务器返回 500 错误

检查 `lightrag.log` 中的具体错误信息，常见原因：
- LLM/Embedding 服务不可达
- 超时配置过短
- 存储目录权限问题

### 症状：上传文档后处理状态一直为 PENDING

可能原因：
1. 后台处理被中断 → 重新点击"扫描"按钮
2. 文档太大 → 分成小文件上传
3. 并发数配置过低 → 增加 `MAX_PARALLEL_INSERT`
