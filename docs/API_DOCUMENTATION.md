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

# LLM
LLM_BINDING=openai
LLM_BINDING_HOST=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_BINDING_API_KEY=your-api-key
LLM_MODEL=qwen-turbo

# Embedding
EMBEDDING_BINDING=openai
EMBEDDING_BINDING_HOST=https://dashscope.aliyuncs.com/compatible-mode/v1
EMBEDDING_BINDING_API_KEY=your-api-key
EMBEDDING_MODEL=text-embedding-v2
EMBEDDING_DIM=1536
```

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
