# SpaceLabOS 技术白皮书

> 适用版本：LightRAG v2.x | 更新日期：2026-05-17

---

## 1. 系统架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层                              │
│  ┌───────────────────┐        ┌───────────────────────┐    │
│  │   演示大屏          │        │   平板终端              │    │
│  │   SpaceLabApp.tsx │        │   TabletApp.tsx      │    │
│  │   (指挥中心/大屏)    │        │   (移动操作/HITL)      │    │
│  └──────────┬──────────┘        └──────────┬──────────┘    │
│             │                              │                │
│             │  Zustand (useSpaceLabStore) │                │
│             │◄────────── shared ──────────►│                │
│             │                              │                │
│             │  ┌──────────────────────────┴───────────┐    │
│             └──►  conversationStore (多会话状态/Zustand)    │
│                  └──────────────────────────┬───────────┘    │
└───────────────────────────────────────────┼──────────────────┘
                                            │
┌───────────────────────────────────────────▼──────────────────┐
│              React 19 + TypeScript + Tailwind CSS            │
│              Zustand 状态管理 / Vite + Bun 构建              │
│              React Router v7 (HashRouter)                     │
└───────────────────────────────────────────┬──────────────────┘
                                            │
                          ┌─────────────────▼─────────────────┐
                          │  queryTextStream() / fetch            │
                          │  /query/stream (NDJSON)              │
                          └─────────────────┬───────────────────┘
┌──────────────────────────────────────────▼───────────────────┐
│                 LightRAG API (localhost:9621)                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ /query    │  │ /documents  │  │ /graph     │            │
│  │ /query/   │  │ /health    │  │ /auth-     │            │
│  │   stream  │  │ /track_    │  │   status   │            │
│  │  (NDJSON) │  │   status   │  │            │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────────────────────────┬───────────────────┘
                                           │
┌──────────────────────────────────────────▼───────────────────┐
│                    LightRAG Core                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 知识图谱检索  │  │  向量检索     │  │  LLM 生成     │      │
│  │ (Neo4j/JSON)│  │ (Faiss/Qdrant)│ │ (GPT/Claude) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript 5 |
| 状态管理 | Zustand 5 (with persist middleware) |
| 路由 | React Router v7 (HashRouter) |
| UI 组件 | Radix UI + Tailwind CSS 4 |
| 构建工具 | Vite 7 + Bun / npm |
| 后端框架 | FastAPI + Uvicorn |
| RAG 核心 | LightRAG Core |
| LLM 接口 | OpenAI 兼容 API |

---

## 2. 平板端核心模块

### 2.1 目录结构

```
features/spacelab/
├── SpaceLabDemo.tsx          # 入口导航页（粒子动画 + 两入口按钮）
├── SpaceLabApp.tsx           # 大屏主控（SpaceLabOS 演示大屏）
├── TabletApp.tsx             # 平板终端主界面（多会话 + 对话 + 输入）
├── DagEditor.tsx             # DAG 步骤编辑器（编辑/预览/执行确认）
├── AgentComponents.tsx       # 内联 DAG 展示 + 执行草稿面板
├── ExperimentResultViewer.tsx # 实验结果图表查看器（Recharts 多组数据）
├── MarkdownRenderer.tsx       # Markdown 渲染（思考折叠 + 数学公式）
├── DocumentPanel.tsx         # 文档上传按钮 + 管理 Modal
├── conversationStore.ts       # 多会话状态管理（Zustand + localStorage）
├── store.ts                  # 全局状态（舱体/告警/HITL 授权）
├── skills.ts                 # Skills 路由 + DAG 步骤解析
├── types.ts                  # 全部 TypeScript 类型定义
├── mockData.ts              # 6 舱模拟数据 + 告警初始日志
└── mainScreen/
    ├── LabModuleGrid.tsx    # 实验舱卡片矩阵
    ├── LabModuleDetail.tsx  # 舱体详情 + DAG SVG + 历史记录
    ├── AlertLog.tsx         # 告警日志（全部/告警/错误过滤）
    ├── ComputePanel.tsx     # 算力池 + 智能体调度指标
    └── EquipmentPanel.tsx   # 全站环境参数 + 资源仲裁流向
```

### 2.2 状态管理

#### 2.2.1 会话状态 (`conversationStore.ts`)

使用 Zustand + localStorage 持久化，管理多会话对话：

```typescript
interface Conversation {
  id: string
  title: string
  kind: 'experiment' | 'knowledge' | 'system'
  linkedModuleId?: string    // 实验会话关联的舱体 ID
  experimentStatus?: 'designing' | 'pending' | 'running' | 'completed' | 'failed'
  experimentSteps?: DagStep[]  // DAG 步骤列表
  draftParams?: ExecutionParams | null  // 执行草稿
  locked?: boolean          // 实验锁定标志
  messages: ChatMessage[]   // 消息列表
  versions: ConversationVersion[]  // 版本快照（最多保留 5 个）
  currentVersionIndex: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  done?: boolean           // 流式完成标志
  userQuery?: string       // 重试时追溯用户查询
  dagSteps?: DagStepDetail[]  // 从 LLM 响应中解析的 DAG 步骤
}
```

**核心 Actions：**

| Action | 说明 |
|--------|------|
| `createConversation(kind, title, linkedModuleId)` | 新建实验/知识会话 |
| `addMessage(convId, msg)` | 添加消息 |
| `appendStreamingContent(convId, msgId, chunk)` | 流式增量追加（核心） |
| `updateStreamingMessage(convId, msgId, content, done)` | 更新完整内容 + 完成标志 |
| `updateMessage(convId, msgId, updates)` | 部分更新消息（如注入 dagSteps） |
| `createVersion(convId, label)` | 创建版本快照 |
| `rollbackToVersion(convId, versionId)` | 回退到指定版本 |
| `setExperimentSteps(convId, steps)` | 更新会话的 DAG 步骤 |
| `setDraftParams(convId, draft)` | 设置执行草稿 |
| `lockConversation(convId, locked)` | 锁定/解锁会话 |

#### 2.2.2 全局状态 (`store.ts`)

管理舱体数据、告警、实验执行：

```typescript
interface SpaceLabState {
  labModules: LabModule[]         // 6 个实验舱状态（被大屏订阅）
  alertLogs: AlertLogEntry[]     // 告警日志（最多 200 条）
  documents: DocumentItem[]        // 文档列表
  computePool: ComputePoolMetrics  // 算力池指标
  agentMetrics: AgentMetrics       // 智能体调度指标
  arbitrationAllocations: ArbitrationAllocation[]
  currentDraft: ExecutionParams | null  // 当前执行草稿
  draftHistory: ExecutionParams[]        // 草稿历史
  activeTrackers: ActiveTaskTracker[]    // 活跃任务追踪
  emergencyMode: boolean                 // 紧急介入模式
  selectedModuleId: string | null        // 详情页选中舱体
}
```

**HITL 核心 Actions：**

| Action | 说明 |
|--------|------|
| `createExecutionDraft(draft)` | AI 解析后生成执行草稿 |
| `updateDraftParam(key, value)` | 宇航员修改参数值 |
| `authorizeDraft()` | 宇航员授权执行 |
| `emergencyStop()` | 紧急终止所有任务 |
| `executeCommand(cmd)` | 自然语言指令解析（启动/终止/查询） |
| `executeExperiment(moduleId, steps)` | 执行实验（模拟步骤推进） |

---

## 3. API 接口规范

### 3.1 接口文件

所有 API 调用定义在 `lightrag_webui/src/api/lightrag.ts`。

#### 3.1.1 RAG 查询

**POST `/query` — 非流式查询**

```typescript
// API
await queryText({ query, mode, stream: false, top_k, enable_rerank })

// 请求体
{
  "query": "微重力环境对植物生长的影响",
  "mode": "mix",           // naive | local | global | hybrid | mix | bypass
  "stream": false,
  "top_k": 40,
  "chunk_top_k": 20,
  "max_entity_tokens": 6000,
  "max_relation_tokens": 8000,
  "max_total_tokens": 30000,
  "enable_rerank": true
}

// 响应
{
  "response": "LightRAG 是...",
  "references": [
    {
      "reference_id": "1",
      "file_path": "/documents/intro.md",
      "content": ["chunk1...", "chunk2..."]  // 字符串数组，每元素=1个 chunk
    }
  ]
}
```

**POST `/query/stream` — 流式查询（平板端使用）**

```typescript
// API
await queryTextStream(
  { query, mode: 'mix', stream: true, top_k: 10 },
  (chunk) => { /* 追加 chunk */ },
  (error) => { /* 错误处理 */ }
)

// 请求体（同上，但 stream: true）
// 响应：NDJSON 格式，每行一个 JSON 对象
{"references": [...]}
{"response": "部分回答内容1"}
{"response": "部分回答内容2"}
{"response": "部分回答内容3"}
// ... 流结束时不发送特殊标记，通过 HTTP 流结束判定
```

**检索模式说明：**

| 模式 | 原理 | 适用场景 |
|------|------|----------|
| `naive` | 纯向量相似度搜索 | 简单文档问答 |
| `local` | 基于实体-关系子图检索 | 特定实体相关问题 |
| `global` | 基于社区检测+摘要检索 | 广泛知识关联 |
| `hybrid` | local + global 结果合并 | 综合查询 |
| `mix` | 知识图谱+向量联合检索（推荐配 reranker） | 复杂问答 |
| `bypass` | 跳过 RAG，直连 LLM | 无需检索的对话 |

#### 3.1.2 文档管理

**POST `/documents/text` — 插入纯文本**

```typescript
await insertText("实验数据内容...")
```

**POST `/documents/upload` — 上传文件**

```typescript
await uploadDocument(file, (percent) => console.log(`${percent}%`))
// 支持: TXT / PDF / Markdown / 代码 等 30+ 格式
// 最大文件大小: 100MB (MAX_UPLOAD_SIZE)
```

**GET `/documents` — 获取文档列表（分页）**

```typescript
await getDocumentsPaginated({
  page: 1,
  page_size: 50,
  sort_field: 'created_at',
  sort_direction: 'desc',
})
// 响应: { documents: [...], pagination: {...} }
```

**GET `/documents/track_status/{track_id}` — 查询处理进度**

```typescript
// 响应
{
  "status": "PROCESSED" | "FAILED" | "PENDING",
  "content_summary": "文档摘要...",
  "content_length": 12345,
  "error_msg": null,
  "created_at": "2026-05-17T00:00:00Z"
}
```

**DELETE `/documents` — 删除文档**

```typescript
await deleteDocuments(['doc-id-1'], deleteFile=true, deleteLLMCache=true)
```

**POST `/documents/scan` — 扫描输入目录**

```typescript
await scanNewDocuments()
// 触发 rag_storage/input 目录下新文档的处理
// 响应: { track_id: "xxx" }
```

#### 3.1.3 知识图谱

**GET `/graphs` — 获取图数据**

```typescript
await queryGraphs('微重力', maxDepth=2, maxNodes=100)
// 返回节点和边，用于知识图谱可视化
```

**GET `/graph/label/list` — 获取所有标签**

**GET `/graph/label/popular` — 获取热门标签**

**GET `/graph/entity/{name}` — 查询实体详情**

**PUT `/graph/entity` — 更新实体**

**PUT `/graph/relation` — 更新关系**

#### 3.1.4 系统状态

**GET `/health` — 健康检查**

```typescript
await checkHealth()
// 响应
{
  "status": "healthy",
  "working_directory": "./rag_storage",
  "configuration": { ... },
  "pipeline_busy": false
}
```

**GET `/documents/pipeline_status` — 管道状态**

```typescript
await getPipelineStatus()
// 响应
{
  "autoscanned": false,
  "busy": false,
  "job_name": null,
  "docs": 0, "batchs": 0
}
```

**POST `/documents/cancel_pipeline` — 取消处理中的管道**

#### 3.1.5 认证

**GET `/auth-status` — 获取认证状态**

```typescript
await getAuthStatus()
// 响应
{
  "auth_configured": false,
  "auth_mode": "disabled",
  "access_token": "guest-token",
  "core_version": "2.x.x",
  "api_version": "1.x.x"
}
```

**POST `/login` — 账户登录**

```typescript
await loginToServer('admin', 'password')
// 响应: { access_token: "jwt-token" }
```

---

## 4. DAG 工作流程

### 4.1 数据结构

#### 4.1.1 DAG 步骤（实验执行用）

```typescript
interface DagStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'error' | 'waiting_resource'
  duration?: string
  parallelGroup?: number    // 并行分组号，同号步骤并行执行
  resourceLock?: 'physical' | 'llm' | 'none'  // 资源类型
  isActive?: boolean       // 是否当前活跃步骤
}

interface DagStepDetail {
  id: string
  name: string
  description: string
  instrumentParams: InstrumentParam[]
  prerequisites: string[]
  goals: string[]
  parallelGroup: number
}
```

#### 4.1.2 执行草稿（平板端 HITL）

```typescript
interface ExecutionParams {
  id: string
  taskName: string
  targetModuleId: string
  targetModuleName: string
  device: string
  deviceParams: DeviceParam[]
  estimatedDuration: string
  priority: 'high' | 'medium' | 'low'
  rawText: string          // AI 解析的原始文本
  authorized: boolean
  authorizedAt?: string
  authorizedBy?: string
}
```

### 4.2 DAG 解析流程

```
LLM 响应文本
    │
    ▼
parseDagStepsFromText(text)  [skills.ts]
    │
    ├── 查找 [DAG_STEPS_START] 和 [DAG_STEPS_END] 标记
    ├── 清理思考标签 (<think>...</think>) 后的内容中查找
    └── 解析每行格式：
        "步骤N:名称|说明|目标1;目标2|参数:值:单位;...|前提1;...|并行组号"

    ▼
DagStepDetail[] | null
    │
    ▼
updateMessage(convId, msgId, { dagSteps })  [conversationStore.ts]
    │
    ▼
DagEditor 组件渲染  [DagEditor.tsx]
    ├── DAG 预览 SVG（横向流程图）
    ├── 步骤编辑器卡片（展开/折叠）
    ├── 预览模式 / 编辑模式切换
    ├── 重新生成描述（回调给 AI）
    └── 开始执行（触发 store.executeExperiment）
```

### 4.3 实验执行流程

```
用户点击「开始执行」
    │
    ▼
handleDagStartExecution(request: DagExecutionRequest)
    │  [TabletApp.tsx]
    ├── 1. lockConversation(activeId, true)  — 锁定当前会话
    ├── 2. executeExperiment(targetModuleId, steps)  — 更新 store
    ├── 3. setExperimentSteps(activeId, steps)  — 同步到会话
    ├── 4. addAlertLog(...)  — 记录告警
    ├── 5. createConversation(...)  — 创建监控会话
    └── 6. toast.success(...)  — 提示用户

    │
    ▼
executeExperiment(moduleId, steps)  [store.ts]
    │
    ├── 按 parallelGroup 分批
    ├── 每批内步骤并发执行（模拟 3-5 秒/步）
    ├── 定时器推进状态：pending → running → completed/error
    └── 最后更新舱体状态：running → completed/standby
```

### 4.4 双屏状态同步

```
平板端  store.executeExperiment()
    │
    ├── useSpaceLabStore.labModules[id].dagSteps 更新
    │
    └── 大屏订阅 useSpaceLabStore
            │
            ├── LabModuleGrid（阵列表）— 卡片进度条更新
            ├── LabModuleDetail（详情页）— DAG SVG 重绘
            │                                （节点颜色 + 脉冲动画切换）
            └── AlertLog — 实时日志追加
```

### 4.5 Skills 路由系统

`skills.ts` 定义了意图识别和系统提示路由：

```typescript
export interface Skill {
  id: string
  name: string
  keywords: string[]
  systemPrompt: string
}

export const SKILLS: Skill[] = [
  { id: 'experiment-design', name: '实验设计',
    keywords: ['实验', '设计', '燃烧', '细胞', '步骤', '方案', ...],
    systemPrompt: '...AI 返回 [DAG_STEPS_START]...[DAG_STEPS_END]...' },
  { id: 'knowledge-qa', name: '知识问答',
    keywords: ['什么是', '为什么', '原理', '介绍', ...] },
  { id: 'data-analysis', name: '数据分析',
    keywords: ['分析', '数据', '报告', '图表', ...] },
  { id: 'system-control', name: '系统控制',
    keywords: ['启动', '停止', '暂停', '状态', '告警', ...] },
]

export function detectSkill(query: string): Skill
// 根据关键词匹配度返回最佳 Skill
// 返回结果作为 system_prompt 传入 /query/stream
```

---

## 5. 思考折叠渲染

### 5.1 渲染流程

```
LLM 流式输出 (content 不断追加)
    │
    ▼
StreamingMarkdownRenderer(content, isStreaming=true)
    │
    ├── extractThinkingIncremental(content, prevBlocks)
    │       ├── 归一化文本 (normalizeText)
    │       ├── 查找所有<think> 和</think> 位置
    │       ├── 配对：按顺序匹配开/闭标签
    │       ├── 提取标签间内容
    │       └── 返回: { blocks, incomplete }
    │
    ├── 已完成块 → completedBlocksRef (累积追加，不丢失)
    ├── 未完成内容 → incompleteContent state (实时更新)
    │
    ▼
ThinkingFoldable 组件（可折叠面板）
    ├── 默认收起：显示「思考过程 (点击展开)」
    └── 点击展开：显示完整思考文本 (font-mono, pre-wrap)
```

### 5.2 思考标签支持

支持多种思考标签格式：

| 格式 | 示例 |
|------|------|
| 标准 XML | `<think>` ... `</think>` |
| HTML 实体 | `&lt;<think>&gt;` ... `&lt;</think>&gt;` |
| 简短变体 | `<think>` (ning 部分可选) |

### 5.3 关键设计

- **ref 累积**：`completedBlocksRef` 作为 ref 只追加不减少，避免 React 批量更新时块丢失
- **HTML 实体支持**：兼容输出 `&lt;<think>&gt;` 的 LLM
- **流结束转换**：流结束后从 ref 状态切换到 `finalBlocks` 状态，保证一致性

---

## 6. 思考标签问题排查

### 6.1 思考内容在 Markdown 正文中显示

**原因**：正则表达式无法正确匹配思考标签（`<think>` 中的 `>` 被错误转义）

**检查方法**：在浏览器开发者工具中查看原始 HTML，搜索 `<think` 或 `<think>` 字样

**解决方案**：已修复为 `<think.*?>` 非贪婪正则匹配

### 6.2 思考折叠窗口闪烁

**原因**：状态更新导致已完成的块被重置

**解决方案**：改用 `useRef` 累积已完成块，`useState` 仅追踪未完成内容

---

## 7. 快速开发参考

### 7.1 添加新的 Skill

在 `skills.ts` 的 `SKILLS` 数组中添加：

```typescript
{
  id: 'my-skill',
  name: '我的技能',
  keywords: ['关键词1', '关键词2'],
  systemPrompt: '给 LLM 的系统提示词...',
}
```

### 7.2 添加新的实验舱

在 `mockData.ts` 和 `store.ts` 的 `initialState.labModules` 中添加新舱体数据。

### 7.3 接入真实 API

将 `TabletApp.tsx` 中 `handleSubmit` 的 `queryTextStream` 调用替换为真实后端，将 `store.ts` 中 `authorizeDraft` 的状态更新替换为工控 API 调用。

### 7.4 添加新的 DAG 状态

在 `types.ts` 的 `DagStep.status` 中扩展新的状态值，并更新 `DAG_COLORS` 映射表。
