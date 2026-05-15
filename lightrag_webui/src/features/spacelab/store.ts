import { create } from 'zustand'
import type { LabModule, AlertLogEntry, ComputeNode, GlobalParam, Equipment, DocumentItem, ChatMessage } from './types'
import {
  labModules as initialLabModules,
  alertLogs as initialAlertLogs,
  computeNodes as initialComputeNodes,
  globalParams as initialGlobalParams,
  equipment as initialEquipment,
  documents as initialDocuments,
} from './mockData'

interface SpaceLabState {
  labModules: LabModule[]
  alertLogs: AlertLogEntry[]
  computeNodes: ComputeNode[]
  globalParams: GlobalParam[]
  equipment: Equipment[]
  documents: DocumentItem[]
  chatMessages: ChatMessage[]
  selectedModuleId: string | null

  // Actions
  selectModule: (id: string | null) => void
  addAlertLog: (log: AlertLogEntry) => void
  updateModuleStatus: (id: string, status: LabModule['status'], progress?: number) => void
  addChatMessage: (msg: ChatMessage) => void
  addDocument: (doc: DocumentItem) => void
  updateDocumentStatus: (id: string, status: DocumentItem['status']) => void

  // Cross-screen command
  executeCommand: (command: string) => { success: boolean; message: string }
}

let logCounter = 100

export const useSpaceLabStore = create<SpaceLabState>((set, get) => ({
  labModules: initialLabModules,
  alertLogs: initialAlertLogs,
  computeNodes: initialComputeNodes,
  globalParams: initialGlobalParams,
  equipment: initialEquipment,
  documents: initialDocuments,
  chatMessages: [],
  selectedModuleId: null,

  selectModule: (id) => set({ selectedModuleId: id }),

  addAlertLog: (log) =>
    set((state) => ({
      alertLogs: [log, ...state.alertLogs].slice(0, 100),
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

  addDocument: (doc) =>
    set((state) => ({
      documents: [doc, ...state.documents],
    })),

  updateDocumentStatus: (id, status) =>
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, status } : d)),
    })),

  executeCommand: (command) => {
    const state = get()
    const cmd = command.toLowerCase()
    const now = new Date()
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

    // Match module names
    const moduleMap: Record<string, string> = {
      '流体': 'fluid-physics',
      '生命': 'life-science',
      '材料': 'material-exp',
      '燃烧': 'combustion',
      '对地': 'earth-observe',
      '生物': 'bio-experiment',
      '流体物理': 'fluid-physics',
      '生命科学': 'life-science',
      '材料实验': 'material-exp',
      '燃烧科学': 'combustion',
      '对地观测': 'earth-observe',
      '生物技术': 'bio-experiment',
    }

    let targetModuleId: string | null = null
    for (const [key, id] of Object.entries(moduleMap)) {
      if (cmd.includes(key)) {
        targetModuleId = id
        break
      }
    }

    if (cmd.includes('启动') && targetModuleId) {
      const mod = state.labModules.find((m) => m.id === targetModuleId)
      if (mod) {
        get().updateModuleStatus(targetModuleId, 'running', 0)
        get().addAlertLog({
          id: `a${++logCounter}`,
          timestamp: ts,
          level: 'INFO',
          source: '指令系统',
          message: `收到指令：启动${mod.name}，参数已下发`,
        })
        get().addAlertLog({
          id: `a${++logCounter}`,
          timestamp: ts,
          level: 'INFO',
          source: mod.name,
          message: `${mod.name}状态切换：待机 → 运行中`,
        })
        return { success: true, message: `已启动${mod.name}，预计完成时间将在任务初始化后更新` }
      }
    }

    if (cmd.includes('终止') || cmd.includes('停止')) {
      if (targetModuleId) {
        const mod = state.labModules.find((m) => m.id === targetModuleId)
        if (mod) {
          get().updateModuleStatus(targetModuleId, 'standby')
          get().addAlertLog({
            id: `a${++logCounter}`,
            timestamp: ts,
            level: 'WARN',
            source: '指令系统',
            message: `收到指令：终止${mod.name}当前任务`,
          })
          return { success: true, message: `已终止${mod.name}的当前任务，舱体已切换至待机状态` }
        }
      }
      // Terminate all
      state.labModules.filter((m) => m.status === 'running').forEach((m) => {
        get().updateModuleStatus(m.id, 'standby')
      })
      get().addAlertLog({
        id: `a${++logCounter}`,
        timestamp: ts,
        level: 'WARN',
        source: '指令系统',
        message: '收到紧急指令：终止所有运行中实验',
      })
      return { success: true, message: '已终止所有运行中的实验，所有舱体已切换至待机状态' }
    }

    if (cmd.includes('状态') || cmd.includes('查询')) {
      const running = state.labModules.filter((m) => m.status === 'running')
      const summary = running.map((m) => `${m.name}(${m.progress}%)`).join('、')
      return {
        success: true,
        message: `当前运行中的舱体：${summary || '无'}。共${state.labModules.length}个实验舱，${running.length}个运行中。`,
      }
    }

    return { success: false, message: '' }
  },
}))
