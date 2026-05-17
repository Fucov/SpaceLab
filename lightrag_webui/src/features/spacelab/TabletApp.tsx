/**
 * AstroAgent OS - 平板终端 (HITL 交互界面)
 *
 * 核心架构：
 * - 左侧栏（独立滚动）：会话列表 + 活跃实验追踪
 * - 右侧主区（独立滚动）：对话 + 底部输入框
 * - 会话消息通过 useConversationStore 直接订阅（避免 prop 对象引用不更新问题）
 * - LLM：优先调用 /query/stream，失败时使用本地智能回复
 * - 实验数据链接：通过 Blob URL 提供本地可下载 mock 数据
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useConversationStore } from './conversationStore'
import { useSpaceLabStore } from './store'
import { queryTextStream, getDocumentsPaginated } from '@/api/lightrag'
import MarkdownRenderer from './MarkdownRenderer'
import { ExperimentDag, ExecutionDraft } from './AgentComponents'
import { DagEditor } from './DagEditor'
import ExperimentResultViewer from './ExperimentResultViewer'
import { UploadButton } from './DocumentPanel'
import { detectSkill, parseDagStepsFromText } from './skills'
import type { Conversation, ChatMessage, HistoryExperiment } from './types'
import {
  TabletIcon, FlaskConical,
  BookOpen, X,
  Send, Lock,
  AlertTriangle, Activity,
  BotMessageSquare,
  RotateCcw,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'

// ================================================================
// 本地智能回复（LLM 服务不可用时的降级）
// ================================================================

const LOCAL_RESPONSES: Record<string, { reply: string; hasDag?: boolean; dagModuleId?: string }> = {
  default: {
    reply: '我已收到您的消息。请选择以下操作：\n\n1. **设计新实验** — 告诉我您想做的实验内容\n2. **查看历史数据** — 点击左侧历史数据卡片\n3. **查看活跃实验** — 左侧栏底部显示当前运行中的实验\n4. **修改参数** — 在执行草稿中调整参数后授权\n\n如需接入真实 LLM，请确保 LightRAG 服务在端口 9621 运行。',
  },
  combustion: {
    reply: '根据燃烧科学舱当前状态（已完成），我可以帮您设计下一个燃烧实验。\n\n**壬烷液滴微重力燃烧**是当前最成熟的燃烧研究方向。典型参数：\n- 环境压力：1 atm\n- O₂浓度：21%（可调至 50%）\n- 液滴初始直径：2.0 mm\n- 点火方式：激光触发\n\n是否需要我生成详细的实验步骤设计？',
    hasDag: true,
    dagModuleId: 'combustion',
  },
  cell: {
    reply: '关于细胞培养实验，间充质干细胞(MSC)在微重力下的分化效率通常比地面对照组高 30-70%。\n\n**关键参数参考**：\n- 培养温度：37.0 ± 0.5°C\n- CO₂浓度：5%\n- 相对湿度：≥80%\n- 诱导因子：地塞米松 + β-甘油磷酸钠\n- 培养周期：14-21天\n\n是否需要生成完整的 MSC 微重力诱导分化实验方案？',
    hasDag: true,
    dagModuleId: 'life-science',
  },
  fluid: {
    reply: '流体物理舱毛细管两相流实验的关键测量参数：\n\n| 参数 | 范围 | 精度 |\n|------|------|------|\n| 接触角 | 0-180° | ±0.5° |\n| 界面张力 | 5-72 mN/m | ±0.1 mN/m |\n| 毛细长度 | 1-10 mm | ±0.01 mm |\n\n微重力环境下毛细现象占主导，液体润湿行为与地面差异显著。\n\n是否需要生成实验步骤？',
    hasDag: true,
    dagModuleId: 'fluid-physics',
  },
  material: {
    reply: '锆基金属玻璃(BMG)在微重力下制备的优势：\n- 无沉降分层，成分更均匀\n- 临界冷却速度可降低 20-30%\n- 非晶形成能力(GFA)提升\n\n典型 Zr 基合金体系：\n- Zr₅₈Cu₂₂Fe₈Al₁₂（已验证，GFA 最佳）\n- Zr₆₅Cu₁₈Ni₁₇（商业潜力大）\n\n需要我设计具体的制备实验步骤吗？',
    hasDag: true,
    dagModuleId: 'material-exp',
  },
  observe: {
    reply: '对地观测舱高光谱成像的关键参数：\n\n- 光谱范围：400-2500 nm（VNIR + SWIR）\n- 空间分辨率：30 m（GSD）\n- 幅宽：60 km\n- 信噪比：≥200（@ 550 nm）\n\n典型应用场景：\n1. 叶绿素浓度反演（海面）\n2. 植被指数计算（陆地）\n3. 大气水汽含量（大气）\n\n当前黑潮区域扫描任务正在进行中，预计明天完成。',
  },
}

function getLocalResponse(query: string) {
  const q = query.toLowerCase()
  if (q.includes('燃烧') || q.includes('火焰') || q.includes('soot') || q.includes('combustion')) return LOCAL_RESPONSES.combustion
  if (q.includes('细胞') || q.includes('培养') || q.includes('干') || q.includes('life')) return LOCAL_RESPONSES.cell
  if (q.includes('流体') || q.includes('毛细') || q.includes('液滴') || q.includes('fluid')) return LOCAL_RESPONSES.fluid
  if (q.includes('材料') || q.includes('金属') || q.includes('玻璃') || q.includes('material')) return LOCAL_RESPONSES.material
  if (q.includes('观测') || q.includes('遥感') || q.includes('光谱') || q.includes('observe')) return LOCAL_RESPONSES.observe
  return LOCAL_RESPONSES.default
}

// ================================================================
// 会话标签（左侧栏顶部）
// ================================================================

function ConversationTabs({ onNew }: { onNew: (kind: Conversation['kind']) => void }) {
  const convs = useConversationStore((s) => s.conversations)
  const activeId = useConversationStore((s) => s.activeConvId)
  const setActive = useConversationStore((s) => s.setActiveConversation)
  const closeConv = useConversationStore((s) => s.closeConversation)

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between mb-2">
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
        return (
          <div
            key={conv.id}
            onClick={() => setActive(conv.id)}
            className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-all ${
              isActive
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
          >
            <div className={conv.kind === 'experiment' ? 'text-blue-400' : 'text-green-400'}>
              {conv.kind === 'experiment'
                ? <FlaskConical className="w-3.5 h-3.5" />
                : <BookOpen className="w-3.5 h-3.5" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                {conv.title}
              </div>
              <div className="text-[10px] text-gray-400">
                {conv.kind === 'experiment'
                  ? conv.experimentStatus === 'running' ? '● 运行中'
                  : conv.experimentStatus === 'designing' ? '○ 设计中'
                  : conv.experimentStatus === 'completed' ? '○ 已完成'
                  : conv.experimentStatus === 'failed' ? '● 失败'
                  : '○ 待执行'
                  : '知识问答'}
              </div>
            </div>
            {isLocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
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
  const setActive = useConversationStore((s) => s.setActiveConversation)
  const expConvs = convs.filter((c) => c.kind === 'experiment' && c.linkedModuleId)
  const labModules = useSpaceLabStore((s) => s.labModules)

  const statusLabel = (s?: string) => {
    switch (s) {
      case 'running': return '● 运行中'
      case 'designing': return '○ 设计中'
      case 'completed': return '○ 已完成'
      case 'failed': return '● 失败'
      case 'paused': return '● 已暂停'
      default: return '○ 待执行'
    }
  }
  const statusColor = (s?: string) => {
    switch (s) {
      case 'running': return 'text-emerald-500'
      case 'failed': return 'text-red-500'
      case 'paused': return 'text-amber-500'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 mb-2">
        <Activity className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">活跃实验</span>
        <span className="ml-auto text-[10px] text-gray-400">{expConvs.length}</span>
      </div>

      {expConvs.map((conv) => {
        const module = labModules.find((m) => m.id === conv.linkedModuleId)
        return (
          <div
            key={conv.id}
            onClick={() => setActive(conv.id)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
          >
            <span className="text-sm">{module?.icon || '🧪'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-700 truncate">{conv.title}</div>
              <div className={`text-[10px] ${statusColor(conv.experimentStatus)} font-medium`}>
                {statusLabel(conv.experimentStatus)}
              </div>
            </div>
            {conv.locked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
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
// 聊天消息
// ================================================================

function ChatMessageItem({ msg, convId, onRetry, retryCount, onDagConfirm, onDagRegenerate, onDagStartExecution }: {
  msg: ChatMessage
  convId: string
  onRetry?: () => void
  retryCount?: number
  onDagConfirm?: (plan: string) => void
  onDagRegenerate?: (prompt: string) => void
  onDagStartExecution?: (request: import('./DagEditor').DagExecutionRequest) => void
}) {
  const isUser = msg.role === 'user'
  const conv = useConversationStore((s) => s.conversations.find((c) => c.id === convId))

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

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
            <BotMessageSquare className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
          {!msg.done && (
            <span className="flex items-center gap-1 text-[9px] text-blue-400">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="ml-1">思考中</span>
            </span>
          )}
          {msg.done && onRetry && (
            <button
              onClick={onRetry}
              className="cursor-pointer flex items-center gap-1 text-[9px] text-gray-400 hover:text-blue-500 transition-colors ml-1"
              title="重新生成"
            >
              <RotateCcw className="w-3 h-3" />
              {retryCount && retryCount > 1 ? `重试 ${retryCount}` : '重试'}
            </button>
          )}
        </div>

        <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm leading-relaxed shadow-sm">
          <MarkdownRenderer content={msg.content} isStreaming={!msg.done} />
        </div>

        {/* 内嵌 DAG 编辑器（从 LLM 响应中解析的步骤） */}
        {msg.dagSteps && msg.dagSteps.length > 0 && (
          <div className="mt-2">
            <DagEditor
              initialSteps={msg.dagSteps}
              onConfirm={(_, plan) => onDagConfirm?.(plan)}
              onRegenerate={onDagRegenerate}
              onStartExecution={onDagStartExecution}
              readOnly={false}
            />
          </div>
        )}

        {conv?.draftParams && (
          <ExecutionDraft
            params={conv.draftParams}
            onParamChange={(key, val) =>
              useConversationStore.getState().updateDraftParam(convId, key, val)
            }
            onAuthorize={() => {
              const draft = conv?.draftParams
              if (!draft) return
              useSpaceLabStore.getState().addAlertLog({
                id: `a${Date.now()}`,
                timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                level: 'INFO',
                source: '指令系统',
                message: `[授权执行] ${draft.targetModuleName} - ${draft.taskName}`,
              })
              useConversationStore.getState().setExperimentStatus(convId, 'running')
              useConversationStore.getState().setDraftParams(convId, null)
            }}
            onCancel={() => useConversationStore.getState().setDraftParams(convId, null)}
          />
        )}
      </div>
    </div>
  )
}

// ================================================================
// 聊天区域（订阅 store 中的会话数据）
// ================================================================

function ChatArea() {
  const activeId = useConversationStore((s) => s.activeConvId)
  const conv = useConversationStore((s) => s.conversations.find((c) => c.id === activeId))
  const addMsg = useConversationStore((s) => s.addMessage)
  const appendMsg = useConversationStore((s) => s.appendStreamingContent)
  const updateMsg = useConversationStore((s) => s.updateStreamingMessage)
  const setSteps = useConversationStore((s) => s.setExperimentSteps)
  const labModules = useSpaceLabStore((s) => s.labModules)
  const addDocument = useSpaceLabStore((s) => s.addDocument)

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<HistoryExperiment | null>(null)
  const [retryCounts, setRetryCounts] = useState<Record<string, number> >({})
  const [showDagEditor, setShowDagEditor] = useState(false)
  const [executionPlan, setExecutionPlan] = useState<string | null>(null)
  const messages = conv?.messages ?? []
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // 挂载时从 API 加载文档列表
  useEffect(() => {
    const loadDocs = async () => {
      try {
        const res = await getDocumentsPaginated({
          page: 1, page_size: 50,
          sort_field: 'created_at', sort_direction: 'desc',
        })
        res.documents.forEach((doc) => {
          addDocument({
            id: doc.id,
            name: doc.file_path || doc.id,
            status: doc.status as 'pending' | 'processing' | 'preprocessed' | 'processed' | 'error',
            uploadTime: new Date(doc.created_at).toLocaleString('zh-CN'),
            size: doc.content_length ? `${(doc.content_length / 1024).toFixed(1)} KB` : '--',
            contentSummary: doc.content_summary,
            contentLength: doc.content_length,
            chunksCount: doc.chunks_count,
            errorMsg: doc.error_msg,
            createdAt: doc.created_at,
          })
        })
      } catch {
        // 静默失败，文档面板可以手动刷新
      }
    }
    loadDocs()
  }, [addDocument])

  const handleSubmit = useCallback(async (e?: React.FormEvent, retryQuery?: string, retryMsgId?: string) => {
    if (e) e.preventDefault()
    if (!activeId) return

    const query = retryQuery || input.trim()
    if (!query.trim() || isLoading) return

    setIsLoading(true)
    if (!retryQuery) setInput('')

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }
    addMsg(activeId, userMsg)

    // 创建 assistant 消息占位
    const assistantMsgId = retryMsgId || `msg-${Date.now()}-ai`
    if (!retryMsgId) {
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        userQuery: query,
      }
      addMsg(activeId, assistantMsg)
    } else {
      // 重试时清除旧内容
      updateMsg(activeId, assistantMsgId, '', false)
    }

    let fullContent = ''
    const retryCount = (retryCounts[assistantMsgId] || 0) + (retryQuery ? 1 : 0)

    // Skills 路由：检测 query 类型并获取对应的 system prompt
    const detectedSkill = detectSkill(query)
    const apiRequest = {
      query,
      mode: 'mix' as const,
      stream: true,
      top_k: 10,
      system_prompt: detectedSkill.systemPrompt,
    }

    try {
      await queryTextStream(
        apiRequest,
        (chunk) => {
          fullContent += chunk
          appendMsg(activeId, assistantMsgId, chunk)
        }
      )
      updateMsg(activeId, assistantMsgId, fullContent, true)

      // 尝试从响应中解析 DAG 步骤
      const dagSteps = parseDagStepsFromText(fullContent)
      if (dagSteps) {
        // 将 DAG 步骤附加到消息上
        const msg = conv?.messages.find((m) => m.id === assistantMsgId)
        if (msg) {
          useConversationStore.getState().updateMessage(activeId, assistantMsgId, { dagSteps })
        }
        setShowDagEditor(true)
      }
    } catch {
      const local = getLocalResponse(query)
      fullContent = local.reply
      appendMsg(activeId, assistantMsgId, fullContent)
      updateMsg(activeId, assistantMsgId, fullContent, true)

      if (local.hasDag && local.dagModuleId) {
        const module = labModules.find((m) => m.id === local.dagModuleId)
        if (module) setSteps(activeId, module.dagSteps)
      }
    }

    // 知识类问题关联实验舱
    if (!fullContent.includes('LightRAG 服务') && conv?.kind === 'experiment') {
      const moduleKeywords = [
        ['combustion', '燃烧'], ['life-science', '细胞'], ['fluid-physics', '流体'],
        ['material-exp', '材料'], ['bio-experiment', '生物'], ['earth-observe', '观测'],
      ]
      for (const [id, keyword] of moduleKeywords) {
        if (query.includes(keyword)) {
          const module = labModules.find((m) => m.id === id)
          if (module) {
            setSteps(activeId, module.dagSteps)
            break
          }
        }
      }
    }

    // 历史数据查询
    for (const m of labModules) {
      if (query.includes(m.name) || query.includes('历史') || query.includes('已完成')) {
        if (m.history.length > 0) {
          setSelectedHistory(m.history[0])
          break
        }
      }
    }

    if (retryQuery) {
      setRetryCounts((prev) => ({ ...prev, [assistantMsgId]: retryCount }))
    }
    setIsLoading(false)
  }, [input, isLoading, activeId, conv, addMsg, appendMsg, updateMsg, setSteps, labModules, retryCounts, setExecutionPlan])

  const handleDagConfirm = useCallback((plan: string) => {
    setExecutionPlan(plan)
  }, [setExecutionPlan])

  const handleDagRegenerate = useCallback((prompt: string) => {
    if (!activeId) return
    // 将修改后的 DAG 描述发回给 AI 重新生成实验描述
    setInput(prompt)
    inputRef.current?.focus()
  }, [activeId])

  const handleDagStartExecution = useCallback((request: import('./DagEditor').DagExecutionRequest) => {
    if (!activeId || !conv) return
    // 1. 锁定当前对话，切换为监控模式
    useConversationStore.getState().lockConversation(activeId, true)
    // 2. 获取目标舱体 ID（优先使用会话关联的舱体，否则默认使用燃烧舱）
    const targetModuleId = conv.linkedModuleId || 'combustion'
    const module = useSpaceLabStore.getState().labModules.find((m) => m.id === targetModuleId)
    // 3. 将步骤详情映射为执行步骤（添加默认状态）
    const executionSteps = request.steps.map((s) => ({
      id: s.id,
      name: s.name,
      status: 'pending' as const,
      parallelGroup: s.parallelGroup,
    }))
    // 4. 将实验步骤同步到舱体 store 并启动执行
    useSpaceLabStore.getState().executeExperiment(targetModuleId, executionSteps)
    // 5. 将步骤也同步到会话 store（供大屏 DAG 显示）
    setSteps(activeId, executionSteps)
    // 6. 添加执行告警日志
    useSpaceLabStore.getState().addAlertLog({
      id: `exec-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level: 'INFO',
      source: '指令系统',
      message: `[实验启动] ${request.title} - ${executionSteps.length} 个步骤 - 模式: ${request.execution_mode}`,
    })
    // 7. 创建新的监控查询会话（当前对话已锁定，用户可开新窗口查询状态）
    const newConv = useConversationStore.getState().createConversation('experiment', `${request.title} - 监控`)
    useConversationStore.getState().setActiveConversation(newConv.id)
    // 8. 显示成功提示
    toast.success(
      <div className="flex items-start gap-2">
        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
        <div>
          <div className="font-medium">实验已启动</div>
          <div className="text-xs opacity-80">
            {request.title} · {executionSteps.length} 个步骤 · {request.execution_mode === 'sequential' ? '串行' : request.execution_mode === 'parallel' ? '并行' : '混合'}模式
            {module ? ` · ${module.name}` : ''}
          </div>
          <div className="text-xs opacity-70 mt-0.5">
            当前会话已锁定 · 请在大屏「活跃实验」监控进度
          </div>
        </div>
      </div>,
      { duration: 5000 }
    )
  }, [activeId, conv, setSteps])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const kindLabel = conv?.kind === 'experiment' ? '描述实验内容或查看数据' : '提问太空科学知识'

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* 消息列表（独立滚动区域） */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.map((msg, idx) => {
          const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1
          const userQuery = isLastAssistant
            ? messages.slice(0, idx).reverse().find((m) => m.role === 'user')?.content
            : undefined
          return (
            <ChatMessageItem
              key={msg.id}
              msg={msg}
              convId={activeId!}
              onRetry={isLastAssistant && msg.role === 'assistant' && msg.done && userQuery
                ? () => handleSubmit(undefined, userQuery, msg.id)
                : undefined}
              retryCount={retryCounts[msg.id]}
              onDagConfirm={handleDagConfirm}
              onDagRegenerate={handleDagRegenerate}
              onDagStartExecution={handleDagStartExecution}
            />
          )
        })}

        {/* 加载指示器 */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                  <BotMessageSquare className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-blue-400 animate-pulse">AI 思考中...</span>
              </div>
              <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 shadow-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }} />
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

      {/* 输入框（固定在底部） */}
      <div className="shrink-0 border-t border-gray-200 bg-white p-3">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={kindLabel}
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
        <div className="text-[10px] text-gray-400 mt-1.5 text-center flex items-center justify-center gap-3">
          <span>Enter 发送 · Shift+Enter 换行</span>
        </div>

        {/* 设计实验快捷入口（始终可见） */}
        {!showDagEditor && !isLoading && (
          <div className="mt-1.5">
            <button
              onClick={() => setShowDagEditor(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              打开实验步骤设计器
            </button>
          </div>
        )}

        {/* 设计实验快捷入口（始终可见） */}
        {!showDagEditor && !isLoading && (
          <div className="mt-1.5">
            <button
              onClick={() => setShowDagEditor(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              打开实验步骤设计器
            </button>
          </div>
        )}

        {/* DAG 编辑器浮层 */}
        {showDagEditor && (
          <div className="mt-3 mx-4 mb-1 p-3 bg-blue-50/50 rounded-xl border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-blue-700">实验步骤设计器</span>
              </div>
              <button
                onClick={() => setShowDagEditor(false)}
                className="cursor-pointer p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <DagEditor
              onConfirm={(_steps, plan) => {
                setExecutionPlan(plan)
                setShowDagEditor(false)
              }}
              onCancel={() => setShowDagEditor(false)}
            />
          </div>
        )}

        {/* 执行计划已生成 */}
        {executionPlan && (
          <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
            <div className="text-xs font-medium text-green-700 mb-2">执行计划已生成</div>
            <div className="text-xs text-green-600 whitespace-pre-wrap">{executionPlan.slice(0, 300)}...</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ================================================================
// 主组件
// ================================================================

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
      {/* 顶部导航栏（固定不滚动） */}
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

      {/* 主内容区：左侧栏 + 聊天（各自独立滚动） */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧栏：固定宽度，独立滚动 */}
        <aside className="w-[260px] shrink-0 border-r border-gray-100 overflow-y-auto p-3 bg-gray-50/50">
          <ConversationTabs onNew={handleNew} />
          <div className="mt-4 pt-3 border-t border-gray-100">
            <ActiveExperiments />
          </div>
        </aside>

        {/* 聊天区：填满剩余空间 */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          {activeConv ? (
            <>
              {/* 会话标题栏 */}
              <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                {activeConv.kind === 'experiment'
                  ? <FlaskConical className="w-4 h-4 text-blue-400" />
                  : <BookOpen className="w-4 h-4 text-green-400" />
                }
                <span className="text-sm font-semibold text-gray-700">{activeConv.title}</span>
                {activeConv.locked && (
                  <span className="flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                    <Lock className="w-3 h-3" />
                    实验锁定
                  </span>
                )}
              </div>
              {/* 聊天内容（独立滚动） */}
              <ChatArea />
            </>
          ) : (
            /* 空状态 */
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <BotMessageSquare className="w-16 h-16 mb-4" />
              <div className="text-base font-medium text-gray-500">选择或新建一个会话</div>
              <div className="text-sm mt-1 text-gray-400">左侧栏可以创建实验会话或知识问答会话</div>
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
