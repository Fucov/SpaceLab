/**
 * 天宫智能助手 - Zustand 状态管理
 *
 * 核心设计原则：平板端的执行草稿状态变化后，通过 Zustand 同步到全局状态，
 * 大屏侧的 DAG 图通过订阅 labModules 中对应舱体的 dagSteps 变化来响应。
 * 整个数据流：平板表单修改 -> executionDraft 更新 -> store.setState() ->
 * 大屏 subscribed labModules DAG -> DAG SVG 重新渲染
 */

import { create } from 'zustand'
import type {
  LabModule,
  AlertLogEntry,
  DocumentItem,
  ChatMessage,
  ExecutionParams,
  ComputePoolMetrics,
  AgentMetrics,
  ArbitrationAllocation,
  ActiveTaskTracker,
  GlobalParam,
  ScheduledTask,
  TaskQueueItem,
} from './types'
import {
  labModules as initialLabModules,
  alertLogs as initialAlertLogs,
  computePoolMetrics as initialComputePool,
  agentMetrics as initialAgentMetrics,
  arbitrationAllocations as initialArbitration,
  activeTaskTrackers as initialTrackers,
  globalParams as initialGlobalParams,
  scheduledTasks as initialScheduledTasks,
} from './mockData'
// 文档数据从 API 加载，不再使用 mock 数据
// import { documents as initialDocuments } from './mockData'

interface SpaceLabState {
  // ========== 核心业务数据 ==========
  labModules: LabModule[]
  alertLogs: AlertLogEntry[]
  documents: DocumentItem[]
  chatMessages: ChatMessage[]
  globalParams: GlobalParam[]
  scheduledTasks: ScheduledTask[]

  // ========== 选中和视图状态 ==========
  selectedModuleId: string | null
  selectedHistoryId: string | null  // 用于详情页历史记录展开

  // ========== 大屏新增指标 ==========
  computePool: ComputePoolMetrics
  agentMetrics: AgentMetrics
  arbitrationAllocations: ArbitrationAllocation[]

  // ========== 平板 HITL 核心状态 ==========
  /** 当前执行草稿（AI 解析参数后，宇航员确认的表单） */
  currentDraft: ExecutionParams | null
  /** 执行草稿列表（可切换查看历史草稿） */
  draftHistory: ExecutionParams[]
  /** 活跃任务追踪器（实时高亮当前执行到哪一步） */
  activeTrackers: ActiveTaskTracker[]
  /** 紧急介入模式（暂停所有执行） */
  emergencyMode: boolean

  // ========== Actions ==========
  selectModule: (id: string | null) => void
  selectHistory: (id: string | null) => void
  addAlertLog: (log: AlertLogEntry) => void
  updateModuleStatus: (id: string, status: LabModule['status'], progress?: number) => void
  addChatMessage: (msg: ChatMessage) => void
  updateChatMessage: (id: string, content: string) => void
  addDocument: (doc: DocumentItem) => void
  removeDocument: (id: string) => void
  updateDocumentStatus: (id: string, status: DocumentItem['status']) => void

  /**
   * HITL 核心操作：从 AI 消息中提取参数，生成执行草稿
   * 平板端 AI 解析后调用此方法，生成草稿供宇航员复核
   * 状态流：AI解析 -> currentDraft = newDraft -> 平板表单显示 -> 宇航员修改参数
   */
  createExecutionDraft: (draft: ExecutionParams) => void

  /**
   * HITL 核心操作：更新执行草稿中的参数值
   * 平板表单修改时调用，更新 currentDraft.deviceParams
   * 状态流：宇航员修改表单 -> updateDraftParam -> currentDraft 更新 -> 大屏订阅感知
   */
  updateDraftParam: (paramKey: string, newValue: string | number) => void

  /**
   * HITL 核心操作：授权执行
   * 宇航员确认参数无误后点击"授权执行"按钮
   * 状态流：宇航员点授权 -> authorizeDraft -> currentDraft.authorized=true
   *      -> executeCommand 发送到 store -> labModules DAG 更新 -> 大屏 DAG 响应
   */
  authorizeDraft: () => { success: boolean; message: string }

  /**
   * 紧急介入：立即终止所有运行中的任务
   * 状态流：紧急按钮 -> emergencyStop -> emergencyMode=true
   *      -> 所有 labModules 状态设为 standby -> 大屏全部响应
   */
  emergencyStop: () => void

  /**
   * 清除当前草稿（取消执行）
   */
  clearDraft: () => void

  /**
   * 跨屏命令执行（由平板草稿授权触发，更新大屏舱体状态）
   * 也处理自然语言指令解析
   */
  executeCommand: (command: string) => { success: boolean; message: string }

  /**
   * 执行实验流程（从 DAG 编辑器触发）
   * 模拟实验步骤执行，每个步骤依次推进状态，完成后生成结果
   */
  enqueueModuleTask: (moduleId: string, task: TaskQueueItem) => void
  updateModuleTask: (moduleId: string, taskId: string, patch: Partial<TaskQueueItem>) => void
  addGlobalScheduledTask: (task: ScheduledTask) => void
  executeExperiment: (moduleId: string, steps: import('./types').DagStep[], meta?: {
    title?: string
    source?: 'tablet' | 'demo' | 'system'
    executionMode?: 'sequential' | 'parallel' | 'hybrid'
    priority?: 'high' | 'medium' | 'low'
    eventId?: string
    rawRequest?: unknown
  }) => void

  /**
   * 演示跨屏同步：大屏收到平板提交事件后，注入总任务队列和提示日志。
   */
  receiveDemoExperimentTask: (input: {
    eventId: string
    moduleId: string
    moduleName: string
    title: string
    steps: import('./types').DagStep[]
    executionMode: string
    gateSummary?: string
  }) => void

  /**
   * 推进一帧演示遥测，让大屏指标按运行负载合理波动
   */
  tickTelemetry: () => void
}

// ============================================================
// Zustand Store
// ============================================================

let logCounter = 100

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const driftToward = (current: number, target: number, step: number, jitter: number) => {
  const direction = (target - current) * step
  return current + direction + (Math.random() - 0.5) * jitter
}
const numericParam = (value: string) => Number.parseFloat(value) || 0
const trendOf = (next: number, prev: number): GlobalParam['trend'] => {
  const diff = next - prev
  if (Math.abs(diff) < 0.05) return 'stable'
  return diff > 0 ? 'up' : 'down'
}

function toTs(date = new Date()) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

export const useSpaceLabStore = create<SpaceLabState>((set, get) => ({
  // ========== 初始状态 ==========
  labModules: initialLabModules,
  alertLogs: initialAlertLogs,
  documents: [] as DocumentItem[],
  chatMessages: [],
  globalParams: initialGlobalParams,
  scheduledTasks: initialScheduledTasks,
  selectedModuleId: null,
  selectedHistoryId: null,
  computePool: initialComputePool,
  agentMetrics: initialAgentMetrics,
  arbitrationAllocations: initialArbitration,
  currentDraft: null,
  draftHistory: [],
  activeTrackers: initialTrackers,
  emergencyMode: false,

  // ========== 基础 Actions ==========
  selectModule: (id) => set({ selectedModuleId: id }),
  selectHistory: (id) => set({ selectedHistoryId: id }),

  addAlertLog: (log) =>
    set((state) => ({
      alertLogs: [log, ...state.alertLogs].slice(0, 200),  // 增加容量
    })),

  updateModuleStatus: (id, status, progress) =>
    set((state) => ({
      labModules: state.labModules.map((m) =>
        m.id === id
          ? {
              ...m,
              status,
              progress: progress ?? m.progress,
              currentTask: status === 'standby' ? '待分配' : m.currentTask,
              eta: status === 'standby' ? '--' : status === 'completed' ? '已完成' : m.eta,
            }
          : m
      ),
    })),

  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, msg],
    })),

  updateChatMessage: (id, content) =>
    set((state) => ({
      chatMessages: state.chatMessages.map((m) =>
        m.id === id ? { ...m, content } : m
      ),
    })),

  addDocument: (doc) =>
    set((state) => {
      const existing = state.documents.find((d) => d.id === doc.id)
      if (existing) {
        return {
          documents: state.documents.map((d) => d.id === doc.id ? { ...d, ...doc } : d),
        }
      }
      return { documents: [doc, ...state.documents] }
    }),

  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    })),

  updateDocumentStatus: (id, status) =>
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, status } : d)),
    })),

  // ========== HITL 执行草稿 Actions ==========
  createExecutionDraft: (draft) =>
    set((state) => ({
      currentDraft: draft,
      draftHistory: [draft, ...state.draftHistory].slice(0, 10),
    })),

  updateDraftParam: (paramKey, newValue) =>
    set((state) => {
      if (!state.currentDraft) return state
      return {
        currentDraft: {
          ...state.currentDraft,
          deviceParams: state.currentDraft.deviceParams.map((p) =>
            p.key === paramKey ? { ...p, value: newValue } : p
          ),
        },
      }
    }),

  authorizeDraft: () => {
    const state = get()
    const draft = state.currentDraft
    if (!draft) return { success: false, message: '无执行草稿' }

    const now = new Date()
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

    // 1. 标记草稿为已授权
    const authorizedDraft: ExecutionParams = {
      ...draft,
      authorized: true,
      authorizedAt: ts,
      authorizedBy: '宇航员A',
    }

    // 2. 添加告警日志
    get().addAlertLog({
      id: `a${++logCounter}`,
      timestamp: ts,
      level: 'INFO',
      source: '指令系统',
      message: `[授权执行] ${draft.targetModuleName} - ${draft.taskName} 已授权`,
    })

    // 3. 更新舱体 DAG 状态（模拟：向 DAG 中追加一个新步骤）
    set((prev) => ({
      currentDraft: null,
      draftHistory: [authorizedDraft, ...prev.draftHistory],
      labModules: prev.labModules.map((m) => {
        if (m.id !== draft.targetModuleId) return m
        // 在 DAG 中追加一个步骤（代表执行的任务）
        const newStep = {
          id: `exec-${Date.now()}`,
          name: draft.taskName,
          status: 'running' as const,
          duration: '进行中',
          parallelGroup: Math.max(...m.dagSteps.map((s) => s.parallelGroup ?? 0), -1) + 1,
          isActive: true,
          resourceLock: 'physical' as const,
        }
        // 取消之前步骤的 active 标记
        const updatedSteps = m.dagSteps.map((s) => ({ ...s, isActive: false }))
        return {
          ...m,
          status: 'running' as const,
          dagSteps: [...updatedSteps, newStep],
          currentTask: draft.taskName,
        }
      }),
    }))

    return {
      success: true,
      message: `已授权执行：${draft.taskName}（${draft.targetModuleName}）`,
    }
  },

  emergencyStop: () => {
    const now = new Date()
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

    get().addAlertLog({
      id: `a${++logCounter}`,
      timestamp: ts,
      level: 'ERROR',
      source: '紧急指令',
      message: '紧急介入：所有运行中任务已强制终止',
    })

    set((state) => ({
      emergencyMode: true,
      currentDraft: null,
      labModules: state.labModules.map((m) => ({
        ...m,
        status: 'standby' as const,
        progress: 0,
        dagSteps: m.dagSteps.map((s) => ({ ...s, status: 'pending' as const, isActive: false })),
      })),
    }))

    // 3秒后解除紧急模式
    setTimeout(() => set({ emergencyMode: false }), 3000)
  },

  clearDraft: () => set({ currentDraft: null }),

  // ========== 跨屏命令执行 ==========
  executeCommand: (command) => {
    const state = get()
    const cmd = command.toLowerCase()
    const now = new Date()
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

    // 舱名映射
    const moduleMap: Record<string, string> = {
      '流体': 'fluid-physics', '生命': 'life-science', '材料': 'material-exp',
      '燃烧': 'combustion', '对地': 'earth-observe', '生物': 'bio-experiment',
      '流体物理': 'fluid-physics', '生命科学': 'life-science', '材料实验': 'material-exp',
      '燃烧科学': 'combustion', '对地观测': 'earth-observe', '生物技术': 'bio-experiment',
    }

    let targetModuleId: string | null = null
    for (const [key, id] of Object.entries(moduleMap)) {
      if (cmd.includes(key)) {
        targetModuleId = id
        break
      }
    }

    // 启动命令
    if (cmd.includes('启动') && targetModuleId) {
      const mod = state.labModules.find((m) => m.id === targetModuleId)
      if (mod) {
        get().updateModuleStatus(targetModuleId, 'running', 0)
        get().addAlertLog({ id: `a${++logCounter}`, timestamp: ts, level: 'INFO', source: '指令系统', message: `收到指令：启动${mod.name}，参数已下发` })
        get().addAlertLog({ id: `a${++logCounter}`, timestamp: ts, level: 'INFO', source: mod.name, message: `${mod.name}状态切换：待机 → 运行中` })
        return { success: true, message: `已启动${mod.name}，预计完成时间将在任务初始化后更新` }
      }
    }

    // 终止命令
    if (cmd.includes('终止') || cmd.includes('停止')) {
      if (targetModuleId) {
        const mod = state.labModules.find((m) => m.id === targetModuleId)
        if (mod) {
          get().updateModuleStatus(targetModuleId, 'standby')
          get().addAlertLog({ id: `a${++logCounter}`, timestamp: ts, level: 'WARN', source: '指令系统', message: `收到指令：终止${mod.name}当前任务` })
          return { success: true, message: `已终止${mod.name}的当前任务，舱体已切换至待机状态` }
        }
      }
      state.labModules.filter((m) => m.status === 'running').forEach((m) => get().updateModuleStatus(m.id, 'standby'))
      get().addAlertLog({ id: `a${++logCounter}`, timestamp: ts, level: 'WARN', source: '指令系统', message: '收到紧急指令：终止所有运行中实验' })
      return { success: true, message: '已终止所有运行中的实验，所有舱体已切换至待机状态' }
    }

    // 查询命令
    if (cmd.includes('状态') || cmd.includes('查询')) {
      const running = state.labModules.filter((m) => m.status === 'running')
      const summary = running.map((m) => `${m.name}(${m.progress}%)`).join('、')
      return { success: true, message: `当前运行中的舱体：${summary || '无'}。共${state.labModules.length}个实验舱，${running.length}个运行中。` }
    }

    return { success: false, message: '' }
  },

  enqueueModuleTask: (moduleId, task) =>
    set((state) => ({
      labModules: state.labModules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              taskQueue: [
                task,
                ...module.taskQueue.filter((item) => item.id !== task.id),
              ].slice(0, 10),
            }
          : module
      ),
    })),

  updateModuleTask: (moduleId, taskId, patch) =>
    set((state) => ({
      labModules: state.labModules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              taskQueue: module.taskQueue.map((task) =>
                task.id === taskId ? { ...task, ...patch } : task
              ),
            }
          : module
      ),
    })),

  addGlobalScheduledTask: (task) =>
    set((state) => ({
      scheduledTasks: [
        task,
        ...state.scheduledTasks.filter((item) => item.id !== task.id),
      ].map((item, index) => ({ ...item, order: index + 1 })),
    })),

  tickTelemetry: () => {
    set((state) => {
      const runningModules = state.labModules.filter((m) => m.status === 'running')
      const activeCount = runningModules.length
      const completedCount = state.labModules.filter((m) => m.status === 'completed').length
      const loadFactor = clamp(activeCount / Math.max(1, state.labModules.length), 0, 1)

      const cpuTarget = 34 + loadFactor * 38 + completedCount * 1.5
      const gpuTarget = 38 + loadFactor * 42 + (runningModules.some((m) => m.id === 'earth-observe') ? 8 : 0)
      const ramTarget = 46 + loadFactor * 24
      const networkTarget = 22 + loadFactor * 32 + (runningModules.some((m) => m.id === 'earth-observe') ? 18 : 0)

      const cpuUsagePercent = Math.round(clamp(driftToward(state.computePool.cpuUsagePercent, cpuTarget, 0.28, 4), 24, 92))
      const gpuUsagePercent = Math.round(clamp(driftToward(state.computePool.gpuUsagePercent, gpuTarget, 0.24, 5), 18, 96))
      const ramUsagePercent = Math.round(clamp(driftToward(state.computePool.ramUsagePercent, ramTarget, 0.18, 2.5), 38, 84))
      const networkUsagePercent = Math.round(clamp(driftToward(state.computePool.networkUsagePercent, networkTarget, 0.24, 5), 12, 88))
      const cpuTemp = Math.round(clamp(driftToward(state.computePool.cpuTemp, 38 + cpuUsagePercent * 0.32, 0.18, 1.5), 38, 78))
      const gpuTemp = Math.round(clamp(driftToward(state.computePool.gpuTemp, 42 + gpuUsagePercent * 0.38, 0.16, 1.8), 42, 84))

      const concurrentTasks = Math.round(clamp(3 + activeCount * 1.5 + Math.random() * 2, 2, 12))
      const llmTokenRate = Math.round(clamp(
        driftToward(state.agentMetrics.llmTokenRate, 9500 + gpuUsagePercent * 95 + concurrentTasks * 520, 0.3, 700),
        7600,
        24500
      ))
      const inferenceLatencyMs = Math.round(clamp(
        driftToward(state.agentMetrics.inferenceLatencyMs, 155 + concurrentTasks * 9 + cpuUsagePercent * 0.65, 0.22, 16),
        145,
        360
      ))

      const tempPrev = numericParam(state.globalParams.find((p) => p.label === '舱内温度')?.value ?? '21.8')
      const humidityPrev = numericParam(state.globalParams.find((p) => p.label === '相对湿度')?.value ?? '48.2')
      const pressurePrev = numericParam(state.globalParams.find((p) => p.label === '总气压')?.value ?? '101.2')
      const noisePrev = numericParam(state.globalParams.find((p) => p.label === '背景噪声')?.value ?? '52.1')
      const tempNext = clamp(driftToward(tempPrev, 21.6 + loadFactor * 1.2, 0.16, 0.08), 20.8, 23.6)
      const humidityNext = clamp(driftToward(humidityPrev, 47.5 + loadFactor * 2.2, 0.14, 0.12), 44, 53)
      const pressureNext = clamp(driftToward(pressurePrev, 101.3, 0.12, 0.04), 100.9, 101.7)
      const noiseNext = clamp(driftToward(noisePrev, 50.5 + activeCount * 0.9, 0.18, 0.35), 48, 58)

      const globalParams = state.globalParams.map((param) => {
        const nextByLabel: Record<string, number> = {
          舱内温度: tempNext,
          相对湿度: humidityNext,
          总气压: pressureNext,
          背景噪声: noiseNext,
        }
        const next = nextByLabel[param.label]
        if (next === undefined) return param
        const decimals = param.label === '背景噪声' ? 0 : 1
        return {
          ...param,
          value: next.toFixed(decimals),
          trend: trendOf(next, numericParam(param.value)),
        }
      })

      const moduleLoadKw = state.arbitrationAllocations[0]?.targets.map((target) => {
        const module = state.labModules.find((m) => m.id === target.moduleId)
        const base = target.moduleId === 'combustion' ? 0.8 : target.moduleId === 'earth-observe' ? 1.5 : 1.2
        const runningBoost = module?.status === 'running' ? 1.15 + (module.progress / 100) * 0.35 : 0
        const warningBoost = module?.status === 'error' ? 0.25 : 0
        return { ...target, currentValue: Number((base + runningBoost + warningBoost).toFixed(2)) }
      }) ?? []
      const totalPower = Number(moduleLoadKw.reduce((sum, t) => sum + t.currentValue, 0).toFixed(2))
      const arbitrationAllocations = state.arbitrationAllocations.map((alloc, index) => {
        if (index !== 0 || totalPower <= 0) return alloc
        return {
          ...alloc,
          sourceTotal: totalPower,
          targets: moduleLoadKw.map((target) => ({
            ...target,
            percentage: Math.round((target.currentValue / totalPower) * 100),
          })),
        }
      })

      return {
        computePool: {
          ...state.computePool,
          cpuUsagePercent,
          gpuUsagePercent,
          ramUsagePercent,
          networkUsagePercent,
          cpuTemp,
          gpuTemp,
        },
        agentMetrics: {
          ...state.agentMetrics,
          llmTokenRate,
          concurrentTasks,
          inferenceLatencyMs,
        },
        globalParams,
        arbitrationAllocations,
      }
    })
  },

  executeExperiment: (moduleId, steps, meta = {}) => {
    const state = get()
    const mod = state.labModules.find((m) => m.id === moduleId)
    if (!mod || steps.length === 0) return

    const now = new Date()
    const ts = toTs(now)

    // 本次显式 DAG 设计应替换舱体当前流程，避免旧 mock 步骤和新步骤混在一起。
    const allSteps = steps.map((s) => ({ ...s, status: 'pending' as const, isActive: false }))
    const totalSteps = allSteps.length
    const taskTitle = meta.title || allSteps[0]?.name || '未命名实验'
    const taskId = meta.eventId ? `tablet-task-${meta.eventId}` : `tablet-task-${Date.now()}`
    const priority = meta.priority || 'medium'
    const executionMode = meta.executionMode || 'sequential'
    const source = meta.source || 'tablet'
    const moduleTask: TaskQueueItem = {
      id: taskId,
      name: taskTitle,
      assignee: source === 'tablet' ? '平板终端' : '系统调度',
      scheduledTime: ts,
      priority,
      moduleId,
      moduleName: mod.name,
      source,
      status: 'running',
      executionMode,
      steps: allSteps.map((step, index) => ({
        id: step.id,
        name: step.name,
        status: index === 0 ? 'running' : 'pending',
        parallelGroup: step.parallelGroup,
      })),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      gateSummary: {
        dependency: 'passed',
        resource: 'passed',
        safety: 'passed',
      },
    }
    const scheduledTask: ScheduledTask = {
      id: taskId,
      order: Math.max(0, ...state.scheduledTasks.map((task) => task.order)) + 1,
      moduleId,
      moduleName: mod.name,
      taskName: taskTitle,
      status: 'running',
      priority,
      dagStage: allSteps[0]?.name || taskTitle,
      scheduleHint: `${source === 'tablet' ? '来自平板端的新实验任务' : '系统实验任务'}，${allSteps.length} 个步骤，执行模式：${executionMode}`,
      gates: {
        dependency: {
          status: 'passed',
          summary: '实验 DAG 已确认',
          predecessors: [],
          done: [],
          satisfied: true,
        },
        resource: {
          status: 'passed',
          summary: '目标舱室资源已接纳',
          required: [mod.name],
          active: [mod.name],
          conflict: false,
        },
        safety: {
          status: 'passed',
          summary: '安全门通过',
          predicate: 'tablet_confirmed=true',
          satisfied: true,
        },
      },
    }

    get().addAlertLog({
      id: `a${++logCounter}`,
      timestamp: ts,
      level: 'INFO',
      source: '实验执行器',
      message: `实验开始：${mod.name} - ${taskTitle}，共${totalSteps}个步骤`,
    })

    set((prev) => ({
      scheduledTasks: [
        scheduledTask,
        ...prev.scheduledTasks.filter((task) => task.id !== taskId),
      ].map((task, index) => ({ ...task, order: index + 1 })),
      labModules: prev.labModules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              status: 'running',
              dagSteps: allSteps,
              currentTask: taskTitle,
              currentStepIndex: 1,
              progress: 0,
              taskQueue: [
                moduleTask,
                ...m.taskQueue.filter((task) => task.id !== taskId),
              ].slice(0, 10),
            }
          : m
      ),
    }))

    // 按 parallelGroup 分批执行
    const groups = new Map<number, typeof allSteps>()
    for (const s of allSteps) {
      const g = s.parallelGroup ?? 0
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g)!.push(s)
    }

    const sortedGroups = [...groups.entries()].sort((a, b) => a[0] - b[0])

    let stepIndex = 0

    // 执行一批步骤
    const runGroup = (groupIdx: number, groupSteps: typeof allSteps) => {
      // 模拟步骤执行
      for (const step of groupSteps) {
        const duration = 3000 + Math.random() * 2000
        const stepDuration = Math.round(duration / 1000)

        set((prev) => ({
          scheduledTasks: prev.scheduledTasks.map((task) =>
            task.id === taskId
              ? { ...task, status: 'running', dagStage: step.name }
              : task
          ),
          labModules: prev.labModules.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  dagSteps: m.dagSteps.map((s) =>
                    s.id === step.id ? { ...s, status: 'running', isActive: true } : s
                  ),
                  currentTask: step.name,
                  taskQueue: m.taskQueue.map((task) =>
                    task.id === taskId
                      ? {
                          ...task,
                          status: 'running',
                          updatedAt: new Date().toISOString(),
                          steps: task.steps?.map((taskStep) =>
                            taskStep.id === step.id ? { ...taskStep, status: 'running' } : taskStep
                          ),
                        }
                      : task
                  ),
                }
              : m
          ),
        }))

        const innerStep = step
        const innerDuration = duration
        const innerIndex = stepIndex
        setTimeout(() => {
          const success = Math.random() > 0.05 // 95% 成功率
          const finalStatus = success ? 'completed' : 'error'
          const nowInner = new Date()
          const tsInner = toTs(nowInner)

          set((prev) => ({
            labModules: prev.labModules.map((m) =>
              m.id === moduleId
                ? {
                    ...m,
                    dagSteps: m.dagSteps.map((s) =>
                      s.id === innerStep.id
                        ? { ...s, status: finalStatus, duration: `${stepDuration}s`, isActive: false }
                        : s
                    ),
                    taskQueue: m.taskQueue.map((task) =>
                      task.id === taskId
                        ? {
                            ...task,
                            updatedAt: nowInner.toISOString(),
                            steps: task.steps?.map((taskStep) =>
                              taskStep.id === innerStep.id
                                ? { ...taskStep, status: success ? 'completed' : 'failed' }
                                : taskStep
                            ),
                          }
                        : task
                    ),
                    progress: Math.round(((innerIndex + 1) / totalSteps) * 100),
                  }
                : m
            ),
          }))

          get().addAlertLog({
            id: `a${++logCounter}`,
            timestamp: tsInner,
            level: success ? 'INFO' : 'ERROR',
            source: mod.name,
            message: `步骤[${innerStep.name}]${success ? '已完成' : '失败'}`,
          })

          const isLastStep = groupIdx === sortedGroups.length - 1 && groupSteps.indexOf(innerStep) === groupSteps.length - 1

          if (isLastStep) {
            const finalModule = get().labModules.find((m) => m.id === moduleId)
            const hasError = finalModule?.dagSteps.some((s) => s.status === 'error')
            const nowFinal = new Date()
            const tsFinal = toTs(nowFinal)

            set((prev) => ({
              scheduledTasks: prev.scheduledTasks.map((task) =>
                task.id === taskId
                  ? { ...task, status: hasError ? 'failed' : 'completed', dagStage: hasError ? '执行异常' : '全部完成' }
                  : task
              ),
              labModules: prev.labModules.map((m) =>
                m.id === moduleId
                  ? {
                      ...m,
                      status: hasError ? 'standby' : 'completed',
                      progress: hasError ? 0 : 100,
                      currentTask: hasError ? '执行异常' : '已完成',
                      taskQueue: m.taskQueue.map((task) =>
                        task.id === taskId
                          ? {
                              ...task,
                              status: hasError ? 'failed' : 'completed',
                              updatedAt: nowFinal.toISOString(),
                            }
                          : task
                      ),
                    }
                  : m
              ),
            }))

            get().addAlertLog({
              id: `a${++logCounter}`,
              timestamp: tsFinal,
              level: hasError ? 'WARN' : 'INFO',
              source: '实验执行器',
              message: `实验${hasError ? '部分失败' : '全部完成'}：${mod.name}`,
            })
          }
        }, innerDuration)
        stepIndex++
      }
    }

    // 顺序执行每批，等待上一批完成后开始下一批
    let delay = 0
    for (const [groupIdx, groupSteps] of sortedGroups) {
      const capturedGroupIdx = groupIdx
      const capturedGroupSteps = groupSteps
      setTimeout(() => {
        runGroup(capturedGroupIdx, capturedGroupSteps)
      }, delay)
      // 每批间隔 = 批次中最长步骤的估计时间 + 批次间隔
      delay += 6000
    }
  },

  receiveDemoExperimentTask: ({ eventId, moduleId, moduleName, title, steps, executionMode, gateSummary }) => {
    const now = new Date()
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    const firstStep = steps[0]?.name || title
    const order = Math.max(0, ...get().scheduledTasks.map((task) => task.order)) + 1

    get().addAlertLog({
      id: `demo-${eventId}`,
      timestamp: ts,
      level: 'INFO',
      source: '平板终端',
      message: `来自平板端的新实验任务：${moduleName} - ${title}`,
    })

    set((state) => ({
      scheduledTasks: [
        {
          id: `demo-task-${eventId}`,
          order,
          moduleId,
          moduleName,
          taskName: title,
          status: 'running' as const,
          priority: 'high' as const,
          dagStage: firstStep,
          scheduleHint: `来自平板端的新实验任务，${steps.length} 个步骤，执行模式：${executionMode}${gateSummary ? `；${gateSummary}` : ''}`,
          gates: {
            dependency: {
              status: 'passed' as const,
              summary: '平板端已确认实验 DAG',
              predecessors: [],
              done: [],
              satisfied: true,
            },
            resource: {
              status: 'passed' as const,
              summary: '演示总线已接纳任务',
              required: [moduleName],
              active: [moduleName],
              conflict: false,
            },
            safety: {
              status: 'passed' as const,
              summary: gateSummary || '演示安全门通过',
              predicate: gateSummary || 'tablet_confirmed=true',
              satisfied: true,
            },
          },
        },
        ...state.scheduledTasks,
      ].map((task, index) => ({ ...task, order: index + 1 })),
      labModules: state.labModules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              taskQueue: [
                {
                  id: `demo-module-task-${eventId}`,
                  name: title,
                  assignee: '平板终端',
                  scheduledTime: ts,
                  priority: 'high' as const,
                },
                ...module.taskQueue,
              ].slice(0, 8),
            }
          : module
      ),
    }))
  },
}))
