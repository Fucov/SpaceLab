/**
 * AstroAgent OS - 核心类型定义
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
  /** 该任务已解析出的参数 */
  parsedParams?: ExecutionParams
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
  llmTokenRate: number        // token/s 消耗速率
  concurrentTasks: number     // 当前并发任务数
  inferenceLatencyMs: number // 推理延迟 ms
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

/** 全局资源仲裁分配项 */
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

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface DocumentItem {
  id: string
  name: string
  status: 'processing' | 'processed' | 'error'
  uploadTime: string
  size: string
}

/**
 * ============================================================
 * HITL 交互核心类型
 * ============================================================
 */

/** 执行草稿参数（AI 解析后由宇航员确认） */
export interface ExecutionParams {
  id: string
  /** 任务名称 */
  taskName: string
  /** 目标舱体 ID */
  targetModuleId: string
  /** 目标舱体名称 */
  targetModuleName: string
  /** 设备类型 */
  device: string
  /** 设备参数列表 */
  deviceParams: DeviceParam[]
  /** 预计执行时长 */
  estimatedDuration: string
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** AI 解析原始文本 */
  rawText: string
  /** 是否已授权执行 */
  authorized: boolean
  /** 授权时间 */
  authorizedAt?: string
  /** 授权人 */
  authorizedBy?: string
}

export interface DeviceParam {
  key: string          // 参数名，如 "转速"
  value: string | number
  unit: string         // 如 "rpm", "min", "°C"
  editable: boolean    // 是否允许宇航员修改
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
