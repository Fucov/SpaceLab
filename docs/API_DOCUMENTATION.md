# API 文档说明

> **重要更新**：平板端 API 接口和工作流程已移至 **SPACELAB_TECHNICAL_WHITEPAPER.md**，本文件仅保留 FastAPI 原生接口参考。

---

## 快速参考

详细的平板端 API 调用说明（含 TypeScript 示例代码）请参阅：

- [SPACELAB_TECHNICAL_WHITEPAPER.md](./SPACELAB_TECHNICAL_WHITEPAPER.md) — 第 3 节「API 接口规范」

---

## FastAPI 原生端点

当 API 服务器运行时，可通过 Swagger UI 访问完整端点文档：

- **Swagger UI**: http://localhost:9621/docs
- **ReDoc**: http://localhost:9621/redoc

### 核心端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/query` | POST | 非流式 RAG 查询 |
| `/query/stream` | POST | 流式 RAG 查询（NDJSON） |
| `/documents/text` | POST | 插入纯文本 |
| `/documents/upload` | POST | 上传文件 |
| `/documents` | GET | 获取文档列表 |
| `/documents` | DELETE | 删除文档 |
| `/documents/scan` | POST | 扫描输入目录 |
| `/documents/pipeline_status` | GET | 获取管道状态 |
| `/documents/track_status/{track_id}` | GET | 查询处理进度 |
| `/graphs` | GET | 获取图数据 |
| `/graph/label/list` | GET | 获取标签列表 |
| `/graph/label/popular` | GET | 获取热门标签 |
| `/health` | GET | 健康检查 |
| `/auth-status` | GET | 获取认证状态 |
| `/login` | POST | 账户登录 |

### 查询模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `naive` | 纯向量搜索 | 简单文档检索 |
| `local` | 实体+关系检索 | 特定实体相关问题 |
| `global` | 社区+摘要检索 | 广泛知识关联 |
| `hybrid` | local+global 组合 | 综合查询 |
| `mix` | 图+向量融合 | **推荐模式（配 reranker）** |
| `bypass` | 直连 LLM | 无需检索 |

### 环境配置

所有配置通过 `.env` 文件管理（见 `env.example`）。详细配置说明请参阅 [SPACELAB_TECHNICAL_WHITEPAPER.md](./SPACELAB_TECHNICAL_WHITEPAPER.md) 第 3 节。
