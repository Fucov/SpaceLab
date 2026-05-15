# AstroAgent OS (太空实验智能体操作系统) - SpaceLab 模块

## 概述

SpaceLab 是 LightRAG WebUI 中嵌入的 **AstroAgent OS** 双屏演示系统，包含：
- **大屏主控** (`SpaceLabApp`)：高信息密度监控界面
- **平板终端** (`TabletApp`)：HITL (Human-in-the-Loop) 人工介入交互界面

---

## 文件结构

```
features/spacelab/
├── SpaceLabDemo.tsx     # 入口页面：星空粒子背景 + 导航按钮
├── SpaceLabApp.tsx      # 大屏主控：三栏布局（算力+阵列表/详情+仲裁）
├── TabletApp.tsx        # 平板终端：任务追踪+执行草稿箱+AI助手（内联所有子组件）
├── DocumentUpload.tsx   # 平板文档上传组件（调用 POST /documents/upload）
├── README.md            # 本文档
├── types.ts            # 核心 TypeScript 类型定义（DAG/草稿/指标等）
├── store.ts            # Zustand 全局状态管理（含 HITL 授权流程）
├── mockData.ts         # 模拟数据（6个实验舱+告警+指标）
└── mainScreen/
    ├── ComputePanel.tsx       # 大屏左侧：核心算力池 + 智能体调度中心
    ├── AlertLog.tsx          # 大屏左侧下：监控日志（全部/告警过滤）
    ├── LabModuleGrid.tsx     # 大屏中央：实验舱阵列矩阵（grid-cols-2 高密度卡片）
    ├── LabModuleDetail.tsx   # 大屏中央详情：DAG SVG + 历史折线图 + 任务队列
    └── EquipmentPanel.tsx    # 大屏右侧：全站环境 + 全局资源仲裁流向图
```

---

## 核心类型 (`types.ts`)

### 实验舱与 DAG

```typescript
interface DagStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'error' | 'waiting_resource'
  duration?: string
  /** 并行分组：同组步骤可同时执行，组成非线性拓扑 */
  parallelGroup?: number
  /** 资源锁类型：physical=物理设备（如机械臂），llm=LLM推理算力 */
  resourceLock?: 'physical' | 'llm' | 'none'
  isActive?: boolean
}

interface LabModule {
  id: string
  dagSteps: DagStep[]      // 支持并行分支的 DAG 步骤树
  currentStepIndex: number // 当前活跃步骤索引
  temperature: number
  power: number
  // ...
}
```

### HITL 执行草稿

```typescript
interface ExecutionParams {
  id: string
  taskName: string
  targetModuleId: string
  device: string
  deviceParams: DeviceParam[]
  estimatedDuration: string
  priority: 'high' | 'medium' | 'low'
  rawText: string          // AI 解析的原始文本
  authorized: boolean      // 宇航员是否已授权
  authorizedAt?: string
  authorizedBy?: string
}
```

---

## 状态管理 (`store.ts`)

使用 **Zustand** 管理所有状态。核心设计：**平板表单修改 -> Zustand 同步 -> 大屏 DAG 自动响应**。

### 关键状态

```typescript
interface SpaceLabState {
  labModules: LabModule[]         // 核心数据源（被大屏 DAG 订阅）
  computePool: ComputePoolMetrics  // 算力池指标
  agentMetrics: AgentMetrics       // 智能体调度指标
  arbitrationAllocations: ArbitrationAllocation[]  // 全局仲裁分配
  currentDraft: ExecutionParams | null  // 当前执行草稿（平板核心）
  draftHistory: ExecutionParams[]  // 草稿历史
  activeTrackers: ActiveTaskTracker[]  // 活跃任务追踪
  emergencyMode: boolean          // 紧急介入模式
  selectedModuleId: string | null  // 详情页选中
}
```

### 核心 Actions

| Action | 说明 |
|--------|------|
| `createExecutionDraft(draft)` | AI 解析后生成执行草稿，显示在平板草稿箱 |
| `updateDraftParam(key, value)` | 宇航员修改参数值 -> 同步 currentDraft |
| `authorizeDraft()` | 宇航员授权 -> 更新草稿状态 + 更新对应舱体 DAG |
| `emergencyStop()` | 紧急终止所有任务 |
| `executeCommand(cmd)` | 自然语言指令解析（启动/终止/查询） |

---

## HITL 交互流程（核心机制）

```
宇航员语音/文字输入
        ↓
AI 解析参数（parseAndDraft）
        ↓
createExecutionDraft() → currentDraft = newDraft
        ↓
平板"执行草稿箱"显示（参数表单 + 原始解析文本）
        ↓
宇航员修改参数（updateDraftParam）→ currentDraft 实时更新
        ↓
宇航员点击"授权执行"（authorizeDraft）
        ├→ 草稿标记 authorized=true
        ├→ 添加告警日志
        └→ labModules[id].dagSteps 更新（大屏订阅感知）
                ↓
        大屏 DAG SVG 重新渲染（新步骤追加，动画高亮）
```

---

## API 接口（如何接入真实数据）

所有 API 接口定义在 `lightrag_webui/src/api/lightrag.ts`。

### 1. 文档上传与索引（RAG 核心）

```typescript
// 上传单个文件（支持 TXT/PDF/MD）
import { uploadDocument } from '@/api/lightrag'
await uploadDocument(file, (percent) => console.log(`${percent}%`))

// 批量上传
import { batchUploadDocuments } from '@/api/lightrag'
await batchUploadDocuments(files, (filename, percent) => {
  console.log(`${filename}: ${percent}%`)
})

// 扫描新文档（自动发现 input 目录）
import { scanNewDocuments } from '@/api/lightrag'
const { track_id } = await scanNewDocuments()

// 获取文档列表
import { getDocuments } from '@/api/lightrag'
const { statuses } = await getDocuments()
// statuses: { pending, processing, preprocessed, processed, failed }

// 插入纯文本
import { insertText, insertTexts } from '@/api/lightrag'
await insertText("实验数据内容...")

// 删除文档
import { deleteDocuments } from '@/api/lightrag'
await deleteDocuments(['doc-id-1', 'doc-id-2'], deleteFile=true, deleteLLMCache=true)
```

### 2. RAG 查询

```typescript
import { queryText, queryTextStream } from '@/api/lightrag'

// 同步查询
const { response } = await queryText({
  query: "微重力环境对植物生长的影响",
  mode: "hybrid",           // naive | local | global | hybrid | mix | bypass
  top_k: 40,
  chunk_top_k: 20,
  enable_rerank: true,
})

// 流式查询（推荐）
await queryTextStream(
  {
    query: "蛋白质结晶的最佳温度条件",
    mode: "mix",
    stream: true,
  },
  (chunk) => { /* 追加 chunk 到输出 */ },
  (error) => { /* 处理错误 */ }
)
```

**检索模式说明**：
- `naive`：纯向量搜索
- `local`：基于实体上下文的局部检索
- `global`：基于社区摘要的全局检索
- `hybrid`：local + global 组合
- `mix`：知识图谱 + 向量联合检索（推荐搭配 reranker）
- `bypass`：跳过 RAG，直接 LLM 生成

### 3. 知识图谱

```typescript
// 按标签查询子图
import { queryGraphs } from '@/api/lightrag'
const graph = await queryGraphs('微重力', maxDepth=2, maxNodes=100)

// 获取所有标签
import { getGraphLabels } from '@/api/lightrag'
const labels = await getGraphLabels()

// 搜索标签
import { searchLabels } from '@/api/lightrag'
const results = await searchLabels('燃烧', limit=10)

// 获取流行标签
import { getPopularLabels } from '@/api/lightrag'
const popular = await getPopularLabels(20)
```

### 4. 图谱编辑

```typescript
import { updateEntity, updateRelation, checkEntityNameExists } from '@/api/lightrag'

// 更新实体属性
await updateEntity('蛋白质A', { description: '新描述' }, allowRename=true, allowMerge=true)

// 更新关系
await updateRelation('蛋白质A', '基因X', { weight: 0.85 })

// 检查实体是否存在
const exists = await checkEntityNameExists('某个实体名')
```

### 5. 系统状态

```typescript
import { checkHealth, getPipelineStatus, cancelPipeline } from '@/api/lightrag'

// 健康检查
const health = await checkHealth()
// health: { status, working_directory, configuration, pipeline_busy, ... }

// 获取管道状态
const pipeline = await getPipelineStatus()
// pipeline: { autoscanned, busy, job_name, docs, batchs, ... }

// 取消正在进行的管道
await cancelPipeline()
```

### 6. 认证

```typescript
import { loginToServer, getAuthStatus } from '@/api/lightrag'

// 登录
const { access_token } = await loginToServer('username', 'password')

// 获取认证状态
const auth = await getAuthStatus()
```

---

## 接入真实数据的改造指南

### 步骤 1：替换模拟数据源

在 `store.ts` 的 `initialState` 中，将 `mockData.ts` 的静态数据替换为 API 调用：

```typescript
// store.ts
import { checkHealth, getDocuments } from '@/api/lightrag'

// 初始化时从 API 拉取真实数据
async function fetchInitialData() {
  const [health, docs] = await Promise.all([
    checkHealth(),
    getDocuments()
  ])
  return { health, docs }
}
```

### 步骤 2：改造舱体数据（示例）

真实场景中，每个"实验舱"对应一个真实的设备或系统。改造方向：

```typescript
// 将 labModules 中的静态数据替换为 API 调用结果
const moduleMap = {
  'life-science': '/api/life-science/status',    // 设备传感器接口
  'fluid-physics': '/api/fluid-physics/status',
  // ...
}

async function syncModuleData(moduleId: string) {
  const res = await fetch(moduleMap[moduleId])
  const data = await res.json()
  // 更新 store: useSpaceLabStore.getState().labModules.map(...)
}
```

### 步骤 3：改造 AI 助手（接入真实 LLM）

在 `TabletApp.tsx` 的 `handleSubmit` 中，将 `parseAndDraft` 替换为真正的 RAG 查询：

```typescript
// TabletApp.tsx - handleSubmit 中的改造
const result = await queryTextStream(
  {
    query: userMessage,
    mode: 'hybrid',
    stream: true,
    top_k: 5,
  },
  (chunk) => { /* 流式追加到 AI 消息 */ },
  (error) => { /* 错误处理 */ }
)
```

### 步骤 4：改造执行授权（接入真实工控系统）

`authorizeDraft()` 目前只更新前端状态。真实场景中需要调用工控 API：

```typescript
// store.ts - authorizeDraft 改造
authorizeDraft: () => {
  const draft = get().currentDraft
  if (!draft) return { success: false, message: '无执行草稿' }

  // 调用真实工控接口
  fetch('/api/device/execute', {
    method: 'POST',
    body: JSON.stringify({
      device: draft.device,
      params: draft.deviceParams,
      moduleId: draft.targetModuleId,
    })
  })

  // 同时更新前端状态
  // ...
}
```

### 步骤 5：实时数据推送

使用 WebSocket 或轮询获取传感器实时数据：

```typescript
// 使用 WebSocket 推送（推荐）
const ws = new WebSocket('ws://localhost:9621/ws/telemetry')
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // 更新 store 中的传感器数据
  useSpaceLabStore.setState((state) => ({
    labModules: state.labModules.map((m) =>
      m.id === data.moduleId ? { ...m, temperature: data.temperature } : m
    )
  }))
}
```

---

## 样式规范

| 元素 | 大屏 | 平板 |
|------|------|------|
| 主标题 | 14px bold | 16px bold |
| 副标题 | 12px semibold | 14px semibold |
| 正文 | 12px | 14px |
| 辅助文字 | 11px | 12px |
| 标签/徽章 | 11px medium | 12px medium |
| 背景色 | `#050B14` | `#f8fafc` |
| 强调色 | `cyan-400` | `blue-600` |

---

## 已知限制

1. **DAG 图**：当前为预计算的层次布局，复杂拓扑（如环形依赖）暂不支持
2. **历史图表**：使用 Canvas 手动绑定，暂不支持交互（如缩放、拖拽）
3. **平板 RAG 上传**：当前 DocumentImport 组件已内联但使用 API 桩，需要 `/documents/upload` 后端支持
