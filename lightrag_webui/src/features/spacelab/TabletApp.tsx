/**
 * AstroAgent OS - 平板终端 (HITL 交互界面)
 *
 * 核心架构：
 * - 左侧栏：会话列表（实验会话 + 知识问答）+ 新建会话按钮
 * - 右侧主区：聊天 + 嵌入的执行草稿（可折叠）+ 底部输入框
 * - 实验会话：嵌入 DAG 步骤可视化 + 草稿参数表（可折叠）
 * - 支持流式 LLM 输出 + 多会话切换 + 版本回退
 *
 * 交互流程：
 * 1. 用户发送消息 -> 判断类型（实验设计 / 知识问答）
 * 2. LLM 流式输出 -> 实时追加到消息
 * 3. 实验会话自动嵌入 DAG 步骤和执行草稿
 * 4. 用户可折叠/展开草稿，修改参数，授权执行
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useConversationStore } from './conversationStore'
import { useSpaceLabStore } from './store'
import { queryTextStream } from '@/api/lightrag'
import MarkdownRenderer from './MarkdownRenderer'
import { ExperimentDag, ExecutionDraft } from './AgentComponents'
import ExperimentResultViewer from './ExperimentResultViewer'
import { UploadButton } from './DocumentPanel'
import type { Conversation, ChatMessage, HistoryExperiment } from './types'
import {
  TabletIcon, FlaskConical,
  BookOpen, X, ChevronDown, ChevronUp, History,
  Send, Lock, RotateCcw,
  AlertTriangle, Activity, Cpu,
} from 'lucide-react'

// ================================================================
// 会话标签（左侧栏顶部）
// ================================================================

function ConversationTabs({ onNew }: { onNew: (kind: Conversation['kind']) => void }) {
  const convs = useConversationStore((s) => s.conversations)
  const activeId = useConversationStore((s) => s.activeConvId)
  const setActive = useConversationStore((s) => s.setActiveConversation)
  const closeConv = useConversationStore((s) => s.closeConversation)

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">会话</span>
        <div className="flex gap-1">
          <button
            onClick={() => onNew('experiment')}
            title="新实验会话"
            className="cursor-pointer p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNew('knowledge')}
            title="新知识问答会话"
            className="cursor-pointer p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {convs.map((conv) => {
        const isActive = conv.id === activeId
        const isLocked = conv.locked
        const icon = conv.kind === 'experiment' ? (
          <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
        ) : (
          <BookOpen className="w-3.5 h-3.5 text-green-400" />
        )
        return (
          <div
            key={conv.id}
            className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-all ${
              isActive
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
            onClick={() => setActive(conv.id)}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                {conv.title}
              </div>
              <div className="text-[10px] text-gray-400">
                {conv.kind === 'experiment'
                  ? (conv.experimentStatus === 'running' ? '运行中' : conv.experimentStatus === 'designing' ? '设计阶段' : conv.experimentStatus)
                  : '知识问答'}
              </div>
            </div>
            {isLocked && (
              <Lock className="w-3 h-3 text-amber-400 shrink-0" />
            )}
            {!isLocked && (
              <button
                onClick={(e) => { e.stopPropagation(); closeConv(conv.id) }}
                className="cursor-pointer p-0.5 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ================================================================
// 活跃实验追踪（左侧栏底部）
// ================================================================

function ActiveExperiments() {
  const convs = useConversationStore((s) => s.conversations)
  const expConvs = convs.filter((c) => c.kind === 'experiment' && c.linkedModuleId)
  const labModules = useSpaceLabStore((s) => s.labModules)

  return (
    <div className="flex flex-col gap-0.5 mt-4">
      <div className="flex items-center gap-1 mb-1">
        <Activity className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">活跃实验</span>
        <span className="ml-auto text-[10px] text-gray-400">{expConvs.length}</span>
      </div>

      {expConvs.map((conv) => {
        const module = labModules.find((m) => m.id === conv.linkedModuleId)
        const statusColor =
          conv.experimentStatus === 'running' ? 'text-emerald-500'
          : conv.experimentStatus === 'failed' ? 'text-red-500'
          : conv.experimentStatus === 'paused' ? 'text-amber-500'
          : 'text-gray-400'

        return (
          <div key={conv.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            onClick={() => useConversationStore.getState().setActiveConversation(conv.id)}>
            <span className="text-sm">{module?.icon || '🧪'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-700 truncate">{conv.title}</div>
              <div className={`text-[10px] ${statusColor} font-medium`}>
                {conv.experimentStatus === 'running' ? '● 运行中'
                  : conv.experimentStatus === 'failed' ? '● 异常'
                  : conv.experimentStatus === 'paused' ? '● 已暂停'
                  : conv.experimentStatus === 'designing' ? '○ 设计中'
                  : '○ 已完成'}
              </div>
            </div>
            {conv.locked && <Lock className="w-3 h-3 text-amber-400" />}
          </div>
        )
      })}

      {expConvs.length === 0 && (
        <div className="text-[10px] text-gray-400 px-2.5 py-1">暂无活跃实验</div>
      )}
    </div>
  )
}

// ================================================================
// 版本管理器（对话内可折叠）
// ================================================================

function VersionManager({ conv }: { conv: Conversation }) {
  const [expanded, setExpanded] = useState(false)
  const rollback = useConversationStore((s) => s.rollbackToVersion)
  const createVersion = useConversationStore((s) => s.createVersion)
  const convs = useConversationStore((s) => s.conversations)
  const currentConv = convs.find((c) => c.id === conv.id) || conv

  if (currentConv.versions.length === 0) return null

  return (
    <div className="my-2 rounded-lg border border-gray-100 bg-gray-50 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <History className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500 font-medium">
          版本历史 ({currentConv.versions.length})
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />}
      </button>
      {expanded && (
        <div className="px-3 pb-2 space-y-1.5 border-t border-gray-100">
          {currentConv.versions.map((ver) => (
            <div key={ver.id} className="flex items-center gap-2 py-1">
              <span className="text-[10px] text-gray-400 font-mono w-12">{ver.label}</span>
              <span className="text-[10px] text-gray-400 flex-1">{ver.timestamp}</span>
              <span className="text-[10px] text-gray-400">{ver.messageCount}条消息</span>
              <button
                onClick={() => rollback(conv.id, ver.id)}
                className="cursor-pointer flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                回退
              </button>
            </div>
          ))}
          <button
            onClick={() => createVersion(conv.id, `快照-${currentConv.versions.length + 1}`)}
            className="cursor-pointer text-[10px] text-blue-400 hover:text-blue-600 transition-colors mt-1"
          >
            + 创建新版本快照
          </button>
        </div>
      )}
    </div>
  )
}

// ================================================================
// 聊天消息
// ================================================================

function ChatMessageItem({
  msg,
  conv,
}: {
  msg: ChatMessage
  conv: Conversation
}) {
  const isUser = msg.role === 'user'

  // 实验会话：解析消息中的步骤和草稿
  const hasDag = conv.kind === 'experiment' && conv.experimentSteps && conv.experimentSteps.length > 0
  const hasDraft = conv.kind === 'experiment' && conv.draftParams

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-blue-600 text-white px-4 py-2.5 text-sm leading-relaxed shadow-sm">
          <div className="whitespace-pre-wrap">{msg.content}</div>
          <div className="text-[10px] text-blue-200 mt-1 text-right">{msg.timestamp}</div>
        </div>
      </div>
    )
  }

  // 助手消息
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        {/* 头像 */}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
            <BotMessageSquare className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
          {!msg.done && (
            <span className="text-[9px] text-blue-400 animate-pulse">生成中...</span>
          )}
        </div>

        {/* 消息内容 */}
        <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm leading-relaxed shadow-sm">
          <MarkdownRenderer content={msg.content} />
        </div>

        {/* 嵌入：实验 DAG */}
        {hasDag && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="text-[10px] text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
              实验步骤
            </div>
            <ExperimentDag steps={conv.experimentSteps!} compact />
          </div>
        )}

        {/* 嵌入：执行草稿 */}
        {hasDraft && conv.draftParams && (
          <ExecutionDraft
            params={conv.draftParams}
            onParamChange={(key, val) =>
              useConversationStore.getState().updateDraftParam(conv.id, key, val)
            }
            onAuthorize={() => {
              // 授权执行：更新 store 和大屏
              const draft = conv.draftParams
              if (!draft) return
              useSpaceLabStore.getState().addAlertLog({
                id: `a${Date.now()}`,
                timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                level: 'INFO',
                source: '指令系统',
                message: `[授权执行] ${draft.targetModuleName} - ${draft.taskName}`,
              })
              useConversationStore.getState().setExperimentStatus(conv.id, 'running')
              useConversationStore.getState().setDraftParams(conv.id, null)
            }}
            onCancel={() =>
              useConversationStore.getState().setDraftParams(conv.id, null)
            }
          />
        )}

        {/* 版本管理器 */}
        <VersionManager conv={conv} />
      </div>
    </div>
  )
}

// ================================================================
// 聊天区域
// ================================================================

function ChatArea({ conv }: { conv: Conversation }) {
  const addMsg = useConversationStore((s) => s.addMessage)
  const appendMsg = useConversationStore((s) => s.appendStreamingContent)
  const createVersion = useConversationStore((s) => s.createVersion)
  const setSteps = useConversationStore((s) => s.setExperimentSteps)
  const labModules = useSpaceLabStore((s) => s.labModules)

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<HistoryExperiment | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 自动滚动
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv.messages])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }
    addMsg(conv.id, userMsg)
    const query = input.trim()
    setInput('')
    setIsLoading(true)

    // 创建版本快照（在发送前）
    createVersion(conv.id, `发送前快照`)

    // 构建 assistant 消息
    const assistantMsgId = `msg-${Date.now()}-ai`
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }
    addMsg(conv.id, assistantMsg)
    let fullContent = ''

    try {
      await queryTextStream(
        {
          query: query,
          mode: 'mix',
          stream: true,
          top_k: 10,
        },
        (chunk) => {
          fullContent += chunk
          appendMsg(conv.id, assistantMsgId, chunk)
        }
      )
    } catch (err) {
      // 流式失败，降级为模拟
      fullContent = `**查询失败**：无法连接到 LightRAG 服务。\n\n请检查：\n1. 服务是否在端口 9621 启动\n2. 网络连接是否正常\n3. `.env` 中 LLM_API_KEY 是否有效\n\n当前配置：\n- LLM Binding: openai @ https://llm.actscal.org/v1\n- Embedding: BAAI/bge-m3 @ SiliconFlow`
      appendMsg(conv.id, assistantMsgId, fullContent)
    }

    // 实验会话：尝试解析实验意图并更新 DAG
    if (conv.kind === 'experiment' || query.includes('实验') || query.includes('启动') || query.includes('燃烧') || query.includes('细胞')) {
      // 模拟解析：找到相关舱体
      const relevantModule = labModules.find((m) =>
        query.includes('燃烧') ? m.id === 'combustion'
        : query.includes('细胞') || query.includes('生命') ? m.id === 'life-science'
        : query.includes('流体') ? m.id === 'fluid-physics'
        : query.includes('材料') ? m.id === 'material-exp'
        : query.includes('观测') ? m.id === 'earth-observe'
        : query.includes('生物') ? m.id === 'bio-experiment'
        : m
      )

      if (relevantModule) {
        // 更新 DAG 步骤（模拟 AI 设计的步骤）
        const steps = relevantModule.dagSteps.map((s) => ({
          ...s,
          isActive: s.status === 'running',
        }))
        setSteps(conv.id, steps)
      }
    }

    // 如果用户提到查看历史数据
    if (query.includes('历史') || query.includes('已完成') || query.includes('数据')) {
      // 找到相关舱体最近的历史
      const module = labModules.find((m) =>
        query.includes('燃烧') ? m.id === 'combustion'
        : query.includes('细胞') ? m.id === 'life-science'
        : query.includes('材料') ? m.id === 'material-exp'
        : query.includes('流体') ? m.id === 'fluid-physics'
        : null
      )
      if (module && module.history.length > 0) {
        setSelectedHistory(module.history[0])
      }
    }

    setIsLoading(false)
  }, [input, isLoading, conv, addMsg, appendMsg, createVersion, setSteps, labModules])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {conv.kind === 'experiment' && conv.linkedModuleId && (() => {
          const module = labModules.find((m) => m.id === conv.linkedModuleId)
          return module ? (
            <div className="mb-4">
              {/* 关联舱体信息 */}
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 mb-3">
                <span className="text-2xl">{module.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-800">{module.name}</div>
                  <div className="text-xs text-gray-500">{module.currentTask}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold ${
                    module.status === 'running' ? 'text-emerald-500'
                    : module.status === 'completed' ? 'text-blue-500'
                    : module.status === 'error' ? 'text-red-500'
                    : 'text-gray-400'
                  }`}>
                    {module.status === 'running' ? '运行中'
                      : module.status === 'completed' ? '已完成'
                      : module.status === 'error' ? '异常'
                      : module.status}
                  </div>
                  <div className="text-xs text-gray-400">{module.progress}%</div>
                </div>
              </div>

              {/* 历史实验数据（可点击） */}
              {module.history.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">已完成实验数据</div>
                  <div className="space-y-1.5">
                    {module.history.map((exp) => {
                      const resultColor = exp.result === 'success' ? 'text-green-600 bg-green-50 border-green-200'
                        : exp.result === 'partial' ? 'text-amber-600 bg-amber-50 border-amber-200'
                        : 'text-red-600 bg-red-50 border-red-200'
                      return (
                        <button
                          key={exp.id}
                          onClick={() => setSelectedHistory(exp)}
                          className="cursor-pointer w-full flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2.5 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
                        >
                          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-700 truncate">{exp.name}</div>
                            <div className="text-[10px] text-gray-400">{exp.date} · {exp.dataPoints.toLocaleString()} 数据点</div>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${resultColor} shrink-0`}>
                            {exp.result === 'success' ? '成功' : exp.result === 'partial' ? '部分' : '失败'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null
        })()}

        {conv.messages.map((msg) => (
          <ChatMessageItem key={msg.id} msg={msg} conv={conv} />
        ))}

        {isLoading && conv.messages[conv.messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                  <BotMessageSquare className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-blue-400 animate-pulse">AI 正在思考...</span>
              </div>
              <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 shadow-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 历史数据查看器 */}
      {selectedHistory && (
        <ExperimentResultViewer
          experiment={selectedHistory}
          onClose={() => setSelectedHistory(null)}
        />
      )}

      {/* 输入框 */}
      <div className="shrink-0 border-t border-gray-200 bg-white p-3">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={conv.kind === 'experiment'
              ? '描述您想做的实验，或询问已完成实验的数据...'
              : '提问太空科学知识...'}
            disabled={isLoading}
            rows={1}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-100 resize-none transition-all disabled:opacity-50"
            style={{ minHeight: 44, maxHeight: 120 }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="text-[10px] text-gray-400 mt-1.5 text-center">
          Enter 发送 · Shift+Enter 换行 · 知识库检索：{conv.kind === 'experiment' ? '实验方案 + 历史数据' : '通用科学知识'}
        </div>
      </div>
    </div>
  )
}

// ================================================================
// 主组件
// ================================================================

function FileText({ className }: { className?: string }) {
  return <span className={`inline-flex items-center ${className || ''}`}>📄</span>
}

export default function TabletApp() {
  const convs = useConversationStore((s) => s.conversations)
  const activeId = useConversationStore((s) => s.activeConvId)
  const createConv = useConversationStore((s) => s.createConversation)
  const emergencyStop = useSpaceLabStore((s) => s.emergencyStop)
  const emergencyMode = useSpaceLabStore((s) => s.emergencyMode)

  const activeConv = convs.find((c) => c.id === activeId)

  const handleNew = useCallback((kind: Conversation['kind']) => {
    createConv(kind)
  }, [createConv])

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white">
      {/* 顶部导航栏 */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <TabletIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">天宫智能助手</span>
        </div>
        <div className="flex items-center gap-3">
          <UploadButton />
          <button
            onClick={emergencyStop}
            disabled={emergencyMode}
            className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors disabled:opacity-40"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            紧急终止
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            在线
          </div>
        </div>
      </header>

      {/* 主内容：左侧栏 + 聊天 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧栏 */}
        <aside className="w-[260px] shrink-0 border-r border-gray-100 bg-gray-50/50 p-3 overflow-y-auto">
          <ConversationTabs onNew={handleNew} />
          <ActiveExperiments />
        </aside>

        {/* 聊天区 */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          {activeConv ? (
            <>
              {/* 会话标题栏 */}
              <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                {activeConv.kind === 'experiment' ? (
                  <FlaskConical className="w-4 h-4 text-blue-400" />
                ) : (
                  <BookOpen className="w-4 h-4 text-green-400" />
                )}
                <span className="text-sm font-semibold text-gray-700">{activeConv.title}</span>
                {activeConv.locked && (
                  <span className="flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                    <Lock className="w-3 h-3" />
                    实验锁定
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{activeConv.messages.length} 条消息</span>
                </div>
              </div>
              <ChatArea key={activeConv.id} conv={activeConv} />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
              <BotMessageSquare className="w-16 h-16 mb-4" />
              <div className="text-base font-medium text-gray-500">选择或新建一个会话</div>
              <div className="text-sm mt-1">左侧栏可以创建实验会话或知识问答会话</div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleNew('experiment')}
                  className="cursor-pointer flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <FlaskConical className="w-4 h-4" />
                  新建实验会话
                </button>
                <button
                  onClick={() => handleNew('knowledge')}
                  className="cursor-pointer flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-600 hover:bg-green-100 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  新建知识会话
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
