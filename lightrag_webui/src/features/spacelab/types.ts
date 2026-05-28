/**
 * 天宫智能助手 - 核心类型定义
 * 定义了所有实验舱、任务、权限、仲裁等业务实体的数据结构
 */

export type LabModuleStatus = 'standby' | 'running' | 'completed' | 'error' | 'paused'

export interface LabModule {
  id: string
  name: string
  icon: string
  status: LabModuleStatus
  currentTask: string
  /** 当前正在执行的 DAG 步骤编号（1-based），用于微观追踪 */
  currentStepIndex: number
  progress: number
  eta: string
  /** 传感器实时遥测数据 */
  temperature: number
  co2: number
  humidity: number
  pressure: number
  power: number
  /** DAG 步骤树（支持并行分支拓扑） */
  dagSteps: DagStep[]
  taskQueue: TaskQueueItem[]
  history: HistoryExperiment[]
  /** 所属舱类型（用于仲裁分配计算） */
  moduleType: 'life_science' | 'fluid_physics' | 'material' | 'combustion' | 'earth_observe' | 'bio'
}

export interface DagStep {
  id: string
  name: string
  /** pending | running | completed | error | waiting_resource */
  status: 'pending' | 'running' | 'completed' | 'error' | 'waiting_resource'
  duration?: string
  /** 并行分组：同组步骤可同时执行 */
  parallelGroup?: number
  /** 该步骤依赖的资源类型：physical（机械臂/离心机等物理设备）或 llm（LLM 推理算力） */
  resourceLock?: 'physical' | 'llm' | 'none'
  /** 是否是当前活跃步骤 */
  isActive?: boolean
}

export interface TaskQueueItem {
  id: string
  name: string
  assignee: string
  scheduledTime: string
  priority: 'high' | 'medium' | 'low'
  moduleId?: string
  moduleName?: string
  source?: 'tablet' | 'demo' | 'system'
  status?: 'queued' | 'running' | 'waiting_dependency' | 'waiting_resource' | 'blocked_by_safety' | 'completed' | 'failed'
  executionMode?: 'sequential' | 'parallel' | 'hybrid'
  steps?: Array<{
    id: string
    name: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting'
    parallelGroup?: number
  }>
  createdAt?: string
  updatedAt?: string
  gateSummary?: {
    dependency: 'passed' | 'waiting' | 'blocked' | 'unchecked'
    resource: 'passed' | 'waiting' | 'blocked' | 'unchecked'
    safety: 'passed' | 'waiting' | 'blocked' | 'unchecked'
  }
  /** 该任务已解析出的参数 */
  parsedParams?: ExecutionParams
}

export type ScheduledTaskStatus =
  | 'running'
  | 'ready'
  | 'waiting_dependency'
  | 'waiting_resource'
  | 'safety_rejected'
  | 'blocked_by_safety'
  | 'completed'
  | 'failed'

export type ScheduledTaskPriority = 'high' | 'medium' | 'low'
export type GateCheckStatus = 'passed' | 'waiting' | 'rejected' | 'unchecked'

export interface GateCheckDetail {
  status: GateCheckStatus
  summary: string
}

export interface ScheduledTaskGateDetails {
  dependency: GateCheckDetail & {
    predecessors: string[]
    done: string[]
    satisfied: boolean
  }
  resource: GateCheckDetail & {
    required: string[]
    active: string[]
    conflict: boolean
  }
  safety: GateCheckDetail & {
    predicate: string
    satisfied: boolean
  }
}

export interface ScheduledTask {
  id: string
  order: number
  moduleId: string
  moduleName: string
  taskName: string
  status: ScheduledTaskStatus
  priority: ScheduledTaskPriority
  dagStage: string
  scheduleHint: string
  gates: ScheduledTaskGateDetails
}

export interface HistoryExperiment {
  id: string
  name: string
  date: string
  result: 'success' | 'failed' | 'partial'
  summary: string
  dataPoints: number
  /** 历史温度时序数据（用于折线图渲染） */
  temperatureHistory?: number[]
  /** 历史数据采集时间戳 */
  historyTimestamps?: string[]
  /** 多组实验数据（新增） */
  dataGroups?: ExperimentDataGroup[]
  /** 数据链接（新增） */
  dataUrl?: string
  /** 实验报告链接 */
  reportUrl?: string
}

/** 单组实验数据（新增） */
export interface ExperimentDataGroup {
  id: string
  label: string
  description: string
  /** 数据类型 */
  type: 'temperature' | 'pressure' | 'particle_size' | 'spectral' | 'image' | 'multi'
  data: number[]
  timestamps?: string[]
  /** 附加元数据 */
  metadata?: Record<string, string | number>
  /** 可视化颜色 */
  color?: string
}

export interface AlertLogEntry {
  id: string
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR'
  source: string
  message: string
}

/** 合并后的算力池指标 */
export interface ComputePoolMetrics {
  totalCpuCores: number
  totalGpuUnits: number
  totalRamGB: number
  networkBandwidthMbps: number
  cpuUsagePercent: number
  gpuUsagePercent: number
  ramUsagePercent: number
  networkUsagePercent: number
  cpuTemp: number
  gpuTemp: number
}

/** 智能体调度中心指标 */
export interface AgentMetrics {
  llmTokenRate: number
  concurrentTasks: number
  inferenceLatencyMs: number
  activeResourceLocks: ResourceLock[]
}

export interface ResourceLock {
  id: string
  type: 'physical' | 'llm'
  resourceName: string
  holderTask: string
  moduleName: string
}

export interface GlobalParam {
  label: string
  value: string
  unit: string
  trend: 'up' | 'down' | 'stable'
  icon: string
}

/** 公共设备状态 */
export interface Equipment {
  id: string
  name: string
  status: 'online' | 'offline' | 'warning'
  value: string
  unit: string
  icon: string
}

/** 电力分配项 */
export interface ArbitrationAllocation {
  id: string
  sourceName: string
  sourceTotal: number
  sourceUnit: string
  targets: AllocationTarget[]
}

export interface AllocationTarget {
  moduleId: string
  moduleName: string
  percentage: number
  currentValue: number
  unit: string
  color: string
}

/**
 * ============================================================
 * 多会话对话系统类型
 * ============================================================
 */

/** 对话消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  /** 流式输出时的内容是否已完成 */
  done?: boolean
  /** 该助手消息对应的用户查询内容（用于重试） */
  userQuery?: string
  /** 关联的 DAG 步骤数据（用于实验设计） */
  dagSteps?: DagStepDetail[]
  /** 对话内附件：只用于当前对话任务，不进入 RAG 知识库 */
  attachments?: ChatAttachment[]
  /** 对话内数据处理报告 */
  dataReport?: DataAnalysisReport
  /** 本轮请求检索到的共享记忆 */
  sharedMemories?: SharedMemoryDigest[]
}

export interface SharedMemoryDigest {
  id: string
  taskInstruction: string
  label: '成功' | '失败'
  summary: string
  score?: number
}

export interface ChatAttachment {
  id: string
  name: string
  size: number
  type: string
  text?: string
}

export interface DataSeriesPoint {
  x: string
  values: Record<string, number>
}

export interface DataColumnStats {
  column: string
  count: number
  mean: number
  std: number
  min: number
  q25: number
  median: number
  q75: number
  max: number
}

export interface DataAnalysisReport {
  fileName: string
  rowCount: number
  columns: string[]
  numericColumns: string[]
  operations: string[]
  summary: {
    mean: number
    max: number
    min: number
  }
  stats: DataColumnStats[]
  chart: {
    xColumn: string
    yColumns: string[]
    points: DataSeriesPoint[]
  }
}

/** 对话版本快照 */
export interface ConversationVersion {
  id: string
  label: string
  timestamp: string
  messageCount: number
  /** 版本创建时的消息内容 */
  messages: ChatMessage[]
}

/** 会话类型 */
export type ConversationKind = 'experiment' | 'knowledge' | 'system'

/** 对话会话 */
export interface Conversation {
  id: string
  title: string
  kind: ConversationKind
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
  versions: ConversationVersion[]
  currentVersionIndex: number
  /** 实验会话：关联的舱体 ID */
  linkedModuleId?: string
  /** 实验会话：当前监控状态 */
  experimentStatus?: 'designing' | 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  /** 实验会话：DAG 设计步骤 */
  experimentSteps?: DagStep[]
  /** 实验会话：草稿参数（可编辑） */
  draftParams?: ExecutionParams | null
  /** 是否已锁定（实验进行中不允许关闭） */
  locked?: boolean
}

/**
 * ============================================================
 * 文档管理类型
 * ============================================================
 */

export interface DocumentItem {
  id: string
  name: string
  status: 'pending' | 'processing' | 'preprocessed' | 'processed' | 'error'
  uploadTime: string
  size: string
  filePath?: string
  contentSummary?: string
  contentLength?: number
  chunksCount?: number
  errorMsg?: string
  createdAt?: string
}

/**
 * ============================================================
 * HITL 交互核心类型
 * ============================================================
 */

/** 执行草稿参数（AI 解析后由宇航员确认） */
export interface ExecutionParams {
  id: string
  taskName: string
  targetModuleId: string
  targetModuleName: string
  device: string
  deviceParams: DeviceParam[]
  estimatedDuration: string
  priority: 'high' | 'medium' | 'low'
  rawText: string
  authorized: boolean
  authorizedAt?: string
  authorizedBy?: string
}

export interface DeviceParam {
  key: string
  value: string | number
  unit: string
  editable: boolean
}

/** 活跃任务执行追踪项 */
export interface ActiveTaskTracker {
  id: string
  moduleId: string
  moduleName: string
  icon: string
  currentStep: string
  currentStepIndex: number
  totalSteps: number
  status: 'running' | 'blocked' | 'error'
  blockedReason?: string
}

/** DAG 实验步骤详情（用于编辑器） */
export interface DagStepDetail {
  id: string
  name: string
  description: string
  instrumentParams: InstrumentParam[]
  prerequisites: string[]
  goals: string[]
  parallelGroup: number
}

export interface InstrumentParam {
  key: string
  name?: string
  value: string | number
  unit?: string
  min?: number
  max?: number
  step?: number
  editable?: boolean
}
