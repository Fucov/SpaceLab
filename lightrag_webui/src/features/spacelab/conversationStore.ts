/**
 * AstroAgent OS - 多会话对话系统状态管理
 *
 * 核心设计：
 * - 每个会话(Conversation)有独立的聊天记录和版本快照
 * - 实验会话(experiment)关联特定舱体，有 DAG 步骤和执行参数
 * - 知识会话(knowledge)用于通用问答
 * - 支持版本快照和回退
 * - LLM 流式输出通过 updateStreamingMessage 增量更新
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Conversation,
  ConversationVersion,
  ChatMessage,
  ExecutionParams,
  DagStep,
} from './types'

// ================================================================
// 初始会话
// ================================================================

function makeId(prefix = 'c') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function makeVersion(msgs: ChatMessage[]): ConversationVersion {
  return {
    id: makeId('v'),
    label: `版本 ${msgs.length}`,
    timestamp: new Date().toLocaleString('zh-CN'),
    messageCount: msgs.length,
    messages: JSON.parse(JSON.stringify(msgs)),
  }
}

const initialConversations: Conversation[] = [
  {
    id: 'conv-initial',
    title: '微重力燃烧实验设计',
    kind: 'experiment',
    createdAt: '2026-05-15 09:00',
    updatedAt: '2026-05-16 20:00',
    messages: [
      {
        id: 'msg-0',
        role: 'assistant',
        content: '您好，我是天宫智能助手。我注意到您打开了"微重力燃烧实验设计"会话。请告诉我您想进行什么实验？\n\n我可以帮助您：\n- 设计新的实验方案（我会检索相关知识库并设计步骤）\n- 查询已完成实验的原始数据\n- 调整正在运行的实验参数\n- 分析实验异常原因',
        timestamp: '09:00',
        done: true,
      },
    ],
    versions: [],
    currentVersionIndex: 0,
    linkedModuleId: 'combustion',
    experimentStatus: 'running',
    experimentSteps: [
      { id: 's1', name: '气氛配制', status: 'completed', duration: '25min', parallelGroup: 0 },
      { id: 's2', name: '点火触发', status: 'completed', duration: '5min', parallelGroup: 0 },
      { id: 's3', name: '高速记录', status: 'completed', duration: '90min', parallelGroup: 1 },
      { id: 's4', name: '数据分析', status: 'completed', duration: '60min', parallelGroup: 1 },
    ],
    draftParams: null,
    locked: true,
  },
  {
    id: 'conv-knowledge',
    title: '太空科学知识问答',
    kind: 'knowledge',
    createdAt: '2026-05-15 10:00',
    updatedAt: '2026-05-16 19:30',
    messages: [
      {
        id: 'msg-k0',
        role: 'assistant',
        content: '欢迎使用天宫科学知识问答助手。我可以回答关于：\n- 微重力物理与生命科学\n- 空间材料加工\n- 燃烧科学基础\n- 遥感与地球观测\n- 天宫空间站设备操作\n\n请直接提问，我会结合知识库为您解答。',
        timestamp: '10:00',
        done: true,
      },
    ],
    versions: [],
    currentVersionIndex: 0,
    locked: false,
  },
]

// ================================================================
// State & Actions
// ================================================================

interface ConversationState {
  conversations: Conversation[]
  activeConvId: string | null

  // 会话管理
  createConversation: (kind: Conversation['kind'], title?: string, linkedModuleId?: string) => Conversation
  closeConversation: (id: string) => void
  setActiveConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void

  // 消息管理
  addMessage: (convId: string, msg: ChatMessage) => void
  updateStreamingMessage: (convId: string, msgId: string, content: string, done?: boolean) => void
  updateMessage: (convId: string, msgId: string, updates: Partial<ChatMessage>) => void
  appendStreamingContent: (convId: string, msgId: string, chunk: string) => void
  clearMessages: (convId: string) => void

  // 版本管理
  createVersion: (convId: string, label?: string) => void
  rollbackToVersion: (convId: string, versionId: string) => void
  listVersions: (convId: string) => ConversationVersion[]

  // 实验会话特有
  setExperimentSteps: (convId: string, steps: DagStep[]) => void
  setExperimentStatus: (convId: string, status: Conversation['experimentStatus']) => void
  updateExperimentSession: (
    convId: string,
    updates: Pick<Conversation, 'title' | 'linkedModuleId' | 'experimentStatus' | 'experimentSteps' | 'locked'>
  ) => void
  setDraftParams: (convId: string, draft: ExecutionParams | null) => void
  updateDraftParam: (convId: string, paramKey: string, value: string | number) => void
  lockConversation: (convId: string, locked: boolean) => void

  // Helpers
  getActiveConversation: () => Conversation | undefined
}

const MAX_VERSION_HISTORY = 5 // Keep only last 5 versions per conversation to limit storage size

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      conversations: initialConversations,
      activeConvId: 'conv-initial',

      // ---- 会话管理 ----

      createConversation: (kind, title, linkedModuleId) => {
    const conv: Conversation = {
      id: makeId('conv'),
      title: title || (kind === 'experiment' ? '新实验设计' : '新知识问答'),
      kind,
      createdAt: new Date().toLocaleString('zh-CN'),
      updatedAt: new Date().toLocaleString('zh-CN'),
      messages: [
        {
          id: makeId('msg'),
          role: 'assistant',
          content: kind === 'experiment'
            ? '好的，我来帮您设计实验方案。请描述您想做的实验内容，包括实验目的和主要参数。'
            : '好的，我来回答您的问题。请描述您想了解的内容。',
          timestamp: now(),
          done: true,
        },
      ],
      versions: [],
      currentVersionIndex: 0,
      linkedModuleId,
      experimentStatus: 'designing',
      locked: kind === 'experiment' ? false : false,
    }
    set((state) => ({
      conversations: [conv, ...state.conversations],
      activeConvId: conv.id,
    }))
    return conv
  },

  closeConversation: (id) => {
    const conv = get().conversations.find((c) => c.id === id)
    if (conv?.locked) return // 不允许关闭锁定的会话
    set((state) => {
      const remaining = state.conversations.filter((c) => c.id !== id)
      return {
        conversations: remaining,
        activeConvId: state.activeConvId === id
          ? (remaining[0]?.id ?? null)
          : state.activeConvId,
      }
    })
  },

  setActiveConversation: (id) => set({ activeConvId: id }),

  updateConversationTitle: (id, title) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    })),

  // ---- 消息管理 ----

  addMessage: (convId, msg) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, msg], updatedAt: new Date().toLocaleString('zh-CN') }
          : c
      ),
    })),

  updateStreamingMessage: (convId, msgId, content, done = false) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, content, done } : m
              ),
            }
          : c
      ),
    })),

  updateMessage: (convId, msgId, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, ...updates } : m
              ),
            }
          : c
      ),
    })),

  appendStreamingContent: (convId, msgId, chunk) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, content: m.content + chunk } : m
              ),
            }
          : c
      ),
    })),

  clearMessages: (convId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, messages: [] } : c
      ),
    })),

  // ---- 版本管理 ----

  createVersion: (convId, label) =>
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== convId) return c
        const ver = makeVersion(c.messages)
        if (label) ver.label = label
        const versions = [...c.versions, ver].slice(-MAX_VERSION_HISTORY)
        return { ...c, versions, currentVersionIndex: versions.length - 1 }
      }),
    })),

  rollbackToVersion: (convId, versionId) =>
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== convId) return c
        const idx = c.versions.findIndex((v) => v.id === versionId)
        if (idx === -1) return c
        const msgs = JSON.parse(JSON.stringify(c.versions[idx].messages)) as ChatMessage[]
        return {
          ...c,
          messages: msgs,
          currentVersionIndex: idx,
        }
      }),
    })),

  listVersions: (convId) => {
    const c = get().conversations.find((x) => x.id === convId)
    return c?.versions ?? []
  },

  // ---- 实验会话特有 ----

  setExperimentSteps: (convId, steps) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, experimentSteps: steps } : c
      ),
    })),

  setExperimentStatus: (convId, status) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, experimentStatus: status } : c
      ),
    })),

  updateExperimentSession: (convId, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId
          ? { ...c, ...updates, kind: 'experiment' as const, updatedAt: new Date().toLocaleString('zh-CN') }
          : c
      ),
    })),

  setDraftParams: (convId, draft) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, draftParams: draft } : c
      ),
    })),

  updateDraftParam: (convId, paramKey, value) =>
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== convId || !c.draftParams) return c
        return {
          ...c,
          draftParams: {
            ...c.draftParams,
            deviceParams: c.draftParams.deviceParams.map((p) =>
              p.key === paramKey ? { ...p, value } : p
            ),
          },
        }
      }),
    })),

  lockConversation: (convId, locked) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, locked } : c
      ),
    })),

  getActiveConversation: () => {
    const state = get()
    return state.conversations.find((c) => c.id === state.activeConvId)
  },
    }),
    {
      name: 'spacelab-conversations',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Limit version history to avoid localStorage quota issues
      partialize: (state) => ({
        ...state,
        conversations: state.conversations.map((c) => ({
          ...c,
          versions: c.versions.slice(-MAX_VERSION_HISTORY),
        })),
      }),
    }
  )
)
