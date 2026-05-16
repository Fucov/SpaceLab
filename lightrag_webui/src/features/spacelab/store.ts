/**
 * AstroAgent OS - Zustand 状态管理
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
} from './types'
import {
  labModules as initialLabModules,
  alertLogs as initialAlertLogs,
  documents as initialDocuments,
  computePoolMetrics as initialComputePool,
  agentMetrics as initialAgentMetrics,
  arbitrationAllocations as initialArbitration,
  activeTaskTrackers as initialTrackers,
  globalParams as initialGlobalParams,
} from './mockData'

interface SpaceLabState {
  // ========== 核心业务数据 ==========
  labModules: LabModule[]
  alertLogs: AlertLogEntry[]
  documents: DocumentItem[]
  chatMessages: ChatMessage[]
  globalParams: GlobalParam[]

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
}

// ============================================================
// Zustand Store
// ============================================================

let logCounter = 100

export const useSpaceLabStore = create<SpaceLabState>((set, get) => ({
  // ========== 初始状态 ==========
  labModules: initialLabModules,
  alertLogs: initialAlertLogs,
  documents: initialDocuments,
  chatMessages: [],
  globalParams: initialGlobalParams,
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
    set((state) => ({
      documents: [doc, ...state.documents],
    })),

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
}))
