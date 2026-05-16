# SpaceLabOS API 接口文档

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户界面层                                  │
│  ┌─────────────────┐              ┌─────────────────┐           │
│  │   平板终端        │              │   电脑大屏        │           │
│  │  TabletApp.tsx  │              │  SpaceLabApp.tsx │           │
│  └────────┬────────┘              └────────┬────────┘           │
│           │                                  │                   │
│           └──────────────┬───────────────────┘                   │
│                          │                                       │
│                   ┌──────▼──────┐                                │
│                   │  AiAssistant │                                │
│                   │   .tsx      │                                │
│                   └──────┬──────┘                                │
│                          │                                       │
│                   ┌──────▼──────┐                                │
│                   │  queryText  │                                │
│                   │   Stream()  │                                │
│                   └──────┬──────┘                                │
└──────────────────────────┼───────────────────────────────────────┘
                           │ axios/fetch
┌──────────────────────────▼───────────────────────────────────────┐
│                      Vite 开发服务器 (localhost:5173)              │
│                   ┌─────────────────────┐                        │
│                   │      代理规则        │                        │
│                   │ /query → :9621      │                        │
│                   │ /auth-status → :9621│                        │
│                   └─────────────────────┘                        │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                    LightRAG API (localhost:9621)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ /query       │  │ /query/stream│  │ /auth-status  │           │
│  │  (非流式)     │  │  (流式)      │  │  (认证)       │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└──────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                    LightRAG Core                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ 知识图谱检索   │  │ 向量检索      │  │ LLM 生成      │           │
│  │ (Graph)      │  │ (Vector)     │  │ (GPT-4o等)   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

## 核心接口

### 1. 认证接口

**GET /auth-status**
- 说明：获取认证状态
- 返回：guest token（认证禁用时）

### 2. 查询接口

**POST /query**
- 说明：非流式查询
- 请求体：
```json
{
  "query": "问题内容",
  "mode": "hybrid|local|global|mix|naive|bypass",
  "stream": false,
  "top_k": 40,
  "chunk_top_k": 20,
  "max_entity_tokens": 6000,
  "max_relation_tokens": 8000,
  "max_total_tokens": 30000,
  "enable_rerank": true
}
```

**POST /query/stream**
- 说明：流式查询（推荐）
- 返回：NDJSON 格式
```json
{"references": [...]}
{"response": "内容片段1"}
{"response": "内容片段2"}
```

### 3. 文档管理接口

**POST /documents/text** - 插入文本
**POST /documents/upload** - 上传文件
**GET /documents** - 获取文档列表
**DELETE /documents** - 清空文档

### 4. 图数据接口

**GET /graph/label/list** - 获取标签列表
**GET /graphs** - 获取图数据
**GET /graph/label/popular** - 获取热门标签

## 查询模式说明

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| naive | 纯向量搜索 | 简单文档检索 |
| local | 实体+关系检索 | 特定实体相关问题 |
| global | 社区+摘要检索 | 广泛知识关联 |
| hybrid | 本地+全局组合 | 综合查询 |
| mix | 图+向量融合 | **推荐模式** |
| bypass | 直连LLM | 无需检索 |

## 环境配置

服务通过 `.env` 文件配置：

```bash
# Server
HOST=0.0.0.0
PORT=9621

# LLM (示例：SiliconFlow 或其他 OpenAI 兼容服务)
LLM_BINDING=openai
LLM_BINDING_HOST=https://llm.actscal.org/v1
LLM_BINDING_API_KEY=your-api-key
LLM_MODEL=lab-chat

# Embedding (SiliconFlow 示例)
# IMPORTANT: Embedding API Key 必须有效，否则文档无法索引！
EMBEDDING_BINDING=openai
EMBEDDING_BINDING_HOST=https://api.siliconflow.cn/v1
EMBEDDING_BINDING_API_KEY=your-embedding-api-key
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIM=1024
EMBEDDING_SEND_DIM=false
```

> **注意**：更换 Embedding 模型后必须清空 `rag_storage/` 目录重新索引。

## 启动流程

```bash
# 1. 启动 API 服务器 (9621)
cd /root/LightRAG
source .venv/bin/activate
python -c "from lightrag.api.lightrag_server import main; main()"

# 2. 启动 WebUI 开发服务器 (5173)
cd lightrag_webui
npm run dev
```

## 访问地址

| 服务 | 地址 |
|------|------|
| API 服务器 | http://localhost:9621 |
| API 文档 | http://localhost:9621/docs |
| WebUI 开发服务器 | http://localhost:5173/webui |
| 入口导航 | http://localhost:5173/webui/#/spacelab |
| 电脑大屏 | http://localhost:5173/webui/#/spacelab/main |
| 平板终端 | http://localhost:5173/webui/#/spacelab/tablet |

## 故障排查

### 症状：返回 "No relevant context found for the query."

这是最常见的 RAG 检索失败症状。**大多数情况下，这不是 LightRAG 代码问题，而是配置或数据问题。**

#### 排查步骤

**1. 检查服务器日志**

```bash
tail -100 lightrag.log
```

**关键错误标识：**

| 日志关键词 | 含义 |
|-----------|------|
| `401 - Api key is invalid` | Embedding 或 LLM API Key 无效 |
| `Failed to batch pre-compute embeddings` | Embedding 服务调用失败 |
| `Loaded graph... 0 nodes, 0 edges` | 知识图谱为空（未索引文档） |
| `full_docs with 0 records` | 文档未索引 |

**2. 确认存储文件正常**

```bash
ls -la rag_storage/
```

正常情况下文件应该有数 KB。如果都是 2 字节的空文件，说明文档从未被成功索引。

**3. 测试 API Key 有效性**

Embedding API Key 测试：
```bash
curl -X POST "https://api.siliconflow.cn/v1/embeddings" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"BAAI/bge-m3","input":"test","dimensions":1024}'
```

**4. 确认文档处理状态**

访问 `GET /documents/pipeline_status` 查看处理队列状态。文档状态应为 `PROCESSED`。

#### 常见根因

| 根因 | 表现 | 解决 |
|------|------|------|
| **Embedding API Key 失效** | 日志出现 `401 - Api key is invalid` | 更新 `.env` 中的 `EMBEDDING_BINDING_API_KEY` |
| **文档未上传/索引** | `full_docs with 0 records` | 通过 API 上传文档或点击扫描按钮 |
| **文档处理失败** | Pipeline 状态为 FAILED | 检查日志具体错误，修复后重新处理 |
| **Embedding 模型不一致** | 索引和查询用不同模型 | 确认 `.env` 配置正确，切换模型需清空数据 |

### 症状：文档上传后状态为 FAILED

查看 `/documents/track_status/{track_id}` 获取详细错误信息。常见原因：
- 文件格式不支持
- 文件过大（超过 `MAX_UPLOAD_SIZE`）
- LLM/Embedding 服务不可用

### 症状：API 返回 500 错误

检查 `lightrag.log` 中的完整错误堆栈。常见原因：
- LLM/Embedding 服务超时
- 存储目录权限问题
- 数据库连接失败
