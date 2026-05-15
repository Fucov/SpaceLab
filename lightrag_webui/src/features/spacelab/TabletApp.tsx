/**
 * 平板终端 - AstroAgent OS HITL 交互界面
 *
 * 重构说明：
 * 左侧：活跃任务执行追踪器（实时高亮当前步骤，是否有异常阻塞）
 * 右侧上方：执行草稿箱（Execution Draft）- AI 解析参数后，宇航员确认的表单面板
 * 右侧下方：AI 助手聊天框
 *
 * 核心交互流程：
 * 1. 宇航员通过语音/文字发送实验指令
 * 2. AI 解析参数，生成 ExecutionParams -> createExecutionDraft()
 * 3. 右侧上方面板弹出"执行草稿箱"，显示待确认参数
 * 4. 宇航员可修改表单参数，确认无误后点击"授权执行 (Authorize & Execute)"
 * 5. authorizeDraft() 将草稿标记为 authorized=true，更新大屏 DAG
 * 6. 大屏订阅 labModules[].dagSteps，自动响应
 *
 * 紧急介入：
 * 红色"紧急介入/终止"按钮 -> emergencyStop() -> 所有舱体 standby
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSpaceLabStore } from './store'
import type { ActiveTaskTracker, ExecutionParams } from './types'
import {
  TabletIcon, ShieldCheck, AlertOctagon,
  Activity, CheckCircle2, XCircle, Loader2, Send, ChevronRight,
  Cpu, BotMessageSquare, Lock
} from 'lucide-react'

// ============================================================
// 子组件 1：活跃任务执行追踪器（左侧栏）
// ============================================================
function ActiveTaskTracker() {
  const trackers = useSpaceLabStore((s) => s.activeTrackers)

  const statusIcon = (status: ActiveTaskTracker['status']) => {
    switch (status) {
      case 'running': return <Activity className="w-3 h-3 text-emerald-500" />
      case 'blocked': return <Lock className="w-3 h-3 text-amber-500" />
      case 'error': return <XCircle className="w-3 h-3 text-red-500" />
    }
  }

  const statusLabel = (status: ActiveTaskTracker['status']) => {
    switch (status) {
      case 'running': return '运行中'
      case 'blocked': return '已阻塞'
      case 'error': return '异常'
    }
  }

  const statusColor = (status: ActiveTaskTracker['status']) => {
    switch (status) {
      case 'running': return 'border-l-emerald-500 bg-emerald-50'
      case 'blocked': return 'border-l-amber-500 bg-amber-50'
      case 'error': return 'border-l-red-500 bg-red-50'
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-gray-600 tracking-wider flex items-center gap-1.5">
        <Activity className="w-4 h-4" />
        活跃任务追踪
        <span className="ml-auto text-[10px] text-gray-400 font-normal">
          {trackers.filter((t) => t.status === 'running').length} 运行
        </span>
      </h3>

      {trackers.map((tracker) => (
        <div
            key={tracker.id}
            className={`rounded-lg border border-l-4 border-gray-200 bg-white p-3 transition-all ${statusColor(tracker.status)}`}
          >
            {/* 舱体标识 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{tracker.icon}</span>
                <div>
                  <div className="text-xs font-semibold text-gray-800">{tracker.moduleName}</div>
                  <div className="text-[10px] text-gray-400">任务: {tracker.currentStep}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-medium">
                {statusIcon(tracker.status)}
                <span className={
                  tracker.status === 'running' ? 'text-emerald-600'
                    : tracker.status === 'blocked' ? 'text-amber-600'
                    : 'text-red-600'
                }>
                  {statusLabel(tracker.status)}
                </span>
              </div>
            </div>

            {/* 步骤进度条 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-gray-400">
                <span>步骤进度</span>
                <span>{tracker.currentStepIndex + 1} / {tracker.totalSteps}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    tracker.status === 'error' ? 'bg-red-400'
                      : tracker.status === 'blocked' ? 'bg-amber-400'
                      : 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                  }`}
                  style={{ width: `${((tracker.currentStepIndex + 1) / tracker.totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* 阻塞原因 */}
            {tracker.status === 'blocked' && tracker.blockedReason && (
              <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] text-amber-700 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 flex-shrink-0" />
                {tracker.blockedReason}
              </div>
            )}

            {/* 异常说明 */}
            {tracker.status === 'error' && (
              <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-[9px] text-red-600 flex items-center gap-1">
                <XCircle className="w-2.5 h-2.5 flex-shrink-0" />
                {tracker.blockedReason ?? '任务执行异常，请人工介入'}
              </div>
            )}
          </div>
      ))}
    </div>
  )
}

// ============================================================
// 子组件 2：执行草稿箱（核心 HITL 机制）
// ============================================================
function ExecutionDraft() {
  const currentDraft = useSpaceLabStore((s) => s.currentDraft)
  const updateDraftParam = useSpaceLabStore((s) => s.updateDraftParam)
  const authorizeDraft = useSpaceLabStore((s) => s.authorizeDraft)
  const clearDraft = useSpaceLabStore((s) => s.clearDraft)
  const emergencyStop = useSpaceLabStore((s) => s.emergencyStop)
  const emergencyMode = useSpaceLabStore((s) => s.emergencyMode)
  const draftHistory = useSpaceLabStore((s) => s.draftHistory)

  const [authorizing, setAuthorizing] = useState(false)
  const [authResult, setAuthResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleAuthorize = useCallback(() => {
    setAuthorizing(true)
    setAuthResult(null)
    setTimeout(() => {
      const result = authorizeDraft()
      setAuthResult(result)
      setAuthorizing(false)
      if (result.success) {
        setTimeout(() => setAuthResult(null), 3000)
      }
    }, 800)  // 模拟授权延迟
  }, [authorizeDraft])

  // 紧急介入按钮
  const handleEmergency = () => {
    if (confirm('确定要紧急终止所有运行中的任务吗？')) {
      emergencyStop()
    }
  }

  if (!currentDraft) {
    // 空状态：显示最近已授权的历史草稿
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
            <ShieldCheck className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-700">执行草稿箱</div>
            <div className="text-[10px] text-gray-400">暂无待执行草稿</div>
          </div>
        </div>

        {/* 最近的已授权草稿 */}
        {draftHistory.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-gray-400 font-medium">最近已授权</div>
            {draftHistory.slice(0, 3).map((draft) => (
              <div key={draft.id} className="flex items-center gap-2 rounded border border-gray-100 bg-gray-50 px-2.5 py-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-700 truncate">{draft.taskName}</div>
                  <div className="text-[9px] text-gray-400">{draft.targetModuleName}</div>
                </div>
                <div className="text-[9px] text-gray-400">{draft.authorizedAt}</div>
              </div>
            ))}
          </div>
        )}

        {/* 提示文字 */}
        <div className="mt-3 rounded border border-dashed border-gray-200 bg-gray-50 p-2 text-center">
          <div className="text-[10px] text-gray-400 leading-relaxed">
            在下方对话框中输入实验指令，AI 将解析参数并生成执行草稿
            <br />
            <span className="text-blue-500">例如："启动离心机实验，转速5000，时间10分钟"</span>
          </div>
        </div>
      </div>
    )
  }

  // 草稿表单
  return (
    <div className={`rounded-lg border bg-white p-3 ${currentDraft.authorized ? 'border-emerald-300' : 'border-blue-300'}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full ${currentDraft.authorized ? 'bg-emerald-100' : 'bg-blue-100'}`}>
            {currentDraft.authorized
              ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              : <ShieldCheck className="w-4 h-4 text-blue-600" />
            }
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-700">执行草稿箱</div>
            <div className="text-[10px] text-gray-400">
              {currentDraft.authorized ? '已授权执行' : '待确认 · 未执行'}
            </div>
          </div>
        </div>
        {!currentDraft.authorized && (
          <button
            onClick={clearDraft}
            className="cursor-pointer text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            取消
          </button>
        )}
      </div>

      {/* 任务基本信息 */}
      <div className="rounded border border-gray-100 bg-gray-50 p-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">{currentDraft.targetModuleName}</span>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-sm font-medium text-gray-800">{currentDraft.taskName}</span>
        </div>
        <div className="text-[9px] text-gray-400 mt-1">
          设备：{currentDraft.device} · 预计时长：{currentDraft.estimatedDuration}
        </div>
        {/* 优先级标签 */}
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
            currentDraft.priority === 'high' ? 'bg-red-100 text-red-600'
              : currentDraft.priority === 'medium' ? 'bg-amber-100 text-amber-600'
              : 'bg-blue-100 text-blue-600'
          }`}>
            {currentDraft.priority === 'high' ? '高优先级' : currentDraft.priority === 'medium' ? '中优先级' : '低优先级'}
          </span>
        </div>
      </div>

      {/* 参数复核面板 */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          <Cpu className="w-3 h-3" />
          参数复核（可修改）
        </div>
        {currentDraft.deviceParams.map((param) => (
          <div key={param.key} className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-20 flex-shrink-0">{param.key}</label>
            <div className="flex-1 flex items-center gap-1">
              {param.editable ? (
                <input
                  type="number"
                  value={param.value}
                  onChange={(e) => updateDraftParam(param.key, parseFloat(e.target.value) || 0)}
                  className="flex-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-sm font-mono text-gray-800 outline-none focus:border-blue-400 focus:bg-white transition-colors"
                />
              ) : (
                <div className="flex-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-sm font-mono text-gray-500">
                  {param.value}
                </div>
              )}
              <span className="text-[10px] text-gray-400 w-8">{param.unit}</span>
            </div>
            {!param.editable && (
              <span className="text-[8px] text-gray-400">锁定</span>
            )}
          </div>
        ))}
      </div>

      {/* AI 原始解析 */}
      <div className="rounded border border-dashed border-gray-200 bg-gray-50 p-2 mb-3">
        <div className="text-[9px] text-gray-400 mb-1">AI 原始解析</div>
        <div className="text-[10px] text-gray-500 leading-relaxed italic">
          "{currentDraft.rawText}"
        </div>
      </div>

      {/* 授权执行结果 */}
      {authResult && (
        <div className={`rounded border px-3 py-2 mb-3 text-xs flex items-center gap-2 ${
          authResult.success
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {authResult.success
            ? <CheckCircle2 className="w-4 h-4" />
            : <XCircle className="w-4 h-4" />
          }
          {authResult.message}
        </div>
      )}

      {/* 紧急介入 + 授权执行 按钮 */}
      <div className="flex gap-2">
        {/* 紧急介入按钮 */}
        <button
          onClick={handleEmergency}
          disabled={emergencyMode}
          className="cursor-pointer flex items-center gap-1.5 rounded border-2 border-red-300 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 transition-all hover:bg-red-100 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AlertOctagon className="w-4 h-4" />
          紧急介入
        </button>

        {/* 授权执行按钮（仅未授权时显示） */}
        {!currentDraft.authorized && (
          <button
            onClick={handleAuthorize}
            disabled={authorizing}
            className="flex-1 flex items-center justify-center gap-2 rounded border-2 border-emerald-500 bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
          >
            {authorizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                授权中...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                授权执行
              </>
            )}
          </button>
        )}

        {currentDraft.authorized && (
          <div className="flex-1 flex items-center justify-center gap-2 rounded border-2 border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            已授权执行
          </div>
        )}
      </div>

      <div className="text-[9px] text-gray-400 text-center mt-2">
        参数确认无误后，点击上方"授权执行"按钮下发任务
      </div>
    </div>
  )
}

// ============================================================
// 子组件 3：AI 助手（聊天 + 命令解析）
// ============================================================
function AiAssistant() {
  const chatMessages = useSpaceLabStore((s) => s.chatMessages)
  const addChatMessage = useSpaceLabStore((s) => s.addChatMessage)
  const createExecutionDraft = useSpaceLabStore((s) => s.createExecutionDraft)
  const executeCommand = useSpaceLabStore((s) => s.executeCommand)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  /** 模拟 AI 从文本中提取执行参数并生成草稿 */
  const parseAndDraft = useCallback((text: string): ExecutionParams | null => {
    const lower = text.toLowerCase()

    if (lower.includes('离心') || lower.includes('分离')) {
      const rpm = parseInt(text.match(/(\d+)\s*转/)?.[1] ?? '3000')
      const min = parseInt(text.match(/(\d+)\s*分/)?.[1] ?? '10')
      const temp = parseInt(text.match(/(\d+)\s*度/)?.[1] ?? '4')
      return {
        id: `draft-${Date.now()}`,
        taskName: '离心分离实验',
        targetModuleId: 'life-science',
        targetModuleName: '生命科学舱',
        device: '离心机',
        deviceParams: [
          { key: '转速', value: rpm, unit: 'rpm', editable: true },
          { key: '时间', value: min, unit: 'min', editable: true },
          { key: '温度', value: temp, unit: '°C', editable: true },
        ],
        estimatedDuration: `${min + 5}min`,
        priority: text.includes('紧急') || text.includes('高优') ? 'high' : 'medium',
        rawText: text,
        authorized: false,
      }
    }

    if (lower.includes('培养') || lower.includes('细胞')) {
      const deg = parseInt(text.match(/(\d+)\s*度/)?.[1] ?? '37')
      const hr = parseInt(text.match(/(\d+)\s*小时|(\d+)\s*h/)?.[1] ?? '48')
      return {
        id: `draft-${Date.now()}`,
        taskName: '细胞培养实验',
        targetModuleId: 'life-science',
        targetModuleName: '生命科学舱',
        device: '培养箱',
        deviceParams: [
          { key: '温度', value: deg, unit: '°C', editable: true },
          { key: '时长', value: hr, unit: 'h', editable: true },
          { key: 'CO₂', value: 5, unit: '%', editable: false },
        ],
        estimatedDuration: `${hr}h`,
        priority: 'high',
        rawText: text,
        authorized: false,
      }
    }

    if (lower.includes('燃烧')) {
      const deg = parseInt(text.match(/(\d+)\s*度/)?.[1] ?? '500')
      const sec = parseInt(text.match(/(\d+)\s*秒/)?.[1] ?? '30')
      return {
        id: `draft-${Date.now()}`,
        taskName: '微重力燃烧实验',
        targetModuleId: 'combustion',
        targetModuleName: '燃烧科学舱',
        device: '燃烧舱',
        deviceParams: [
          { key: '点火温度', value: deg, unit: '°C', editable: true },
          { key: '燃烧时长', value: sec, unit: 's', editable: true },
          { key: 'O₂浓度', value: 21, unit: '%', editable: false },
        ],
        estimatedDuration: '5min',
        priority: 'high',
        rawText: text,
        authorized: false,
      }
    }

    if (lower.includes('液滴') || lower.includes('流体')) {
      return {
        id: `draft-${Date.now()}`,
        taskName: '液滴生成实验',
        targetModuleId: 'fluid-physics',
        targetModuleName: '流体物理舱',
        device: '注射泵',
        deviceParams: [
          { key: '流速', value: 0.5, unit: 'mL/min', editable: true },
          { key: '液滴直径', value: 2.0, unit: 'mm', editable: true },
        ],
        estimatedDuration: '20min',
        priority: 'medium',
        rawText: text,
        authorized: false,
      }
    }

    return null
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }
    addChatMessage(userMsg)
    const query = input.trim()
    setInput('')
    setIsLoading(true)

    // 1. 尝试从命令中解析执行参数
    const draft = parseAndDraft(query)
    if (draft) {
      createExecutionDraft(draft)
      const aiResponse = `已解析您的指令，生成执行草稿：

📋 **${draft.taskName}**
🏠 目标舱体：${draft.targetModuleName}
⚙️ 设备：${draft.device}

参数明细：
${draft.deviceParams.map((p: { key: string; value: string | number; unit: string; editable: boolean }) => `• ${p.key}：${p.value} ${p.unit}${p.editable ? '' : ' [锁定]'}`).join('\n')}

⏱ 预计时长：${draft.estimatedDuration}

请在上方 **执行草稿箱** 中确认参数，无误后点击 **授权执行**。`
      const assistantMsg = { id: `msg-${Date.now()}-ai`, role: 'assistant' as const, content: aiResponse, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
      addChatMessage(assistantMsg)
      setIsLoading(false)
      return
    }

    // 2. 尝试执行本地命令
    const cmdResult = executeCommand(query)
    if (cmdResult.success) {
      const assistantMsg = { id: `msg-${Date.now()}-ai`, role: 'assistant' as const, content: cmdResult.message, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
      addChatMessage(assistantMsg)
      setIsLoading(false)
      return
    }

    // 3. 通用知识问答（模拟）
    await new Promise((r) => setTimeout(r, 800))
    const assistantMsg = { id: `msg-${Date.now()}-ai`, role: 'assistant' as const, content: `我已收到您的查询："${query}"

对于实验相关问题，我可以帮您：
• 启动 / 终止实验舱任务
• 查询当前舱体运行状态
• 解析实验参数并生成执行草稿

请尝试：启动生命科学舱 / 离心机实验，转速3000，时间5分钟`, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
    addChatMessage(assistantMsg)
    setIsLoading(false)
  }, [input, isLoading, addChatMessage, createExecutionDraft, executeCommand, parseAndDraft])

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white h-full">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
          <BotMessageSquare className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-800">天宫智能助手</div>
          <div className="text-[10px] text-gray-400">支持实验指令 · 参数解析 · 执行授权</div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] text-gray-400">在线</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 py-8">
            <BotMessageSquare className="w-10 h-10 mb-3 text-gray-300" />
            <div className="text-sm font-medium text-gray-500">天宫智能助手</div>
            <div className="text-xs mt-1 text-gray-400 text-center max-w-xs leading-relaxed">
              可发送实验指令，我会解析参数并生成执行草稿供您确认
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5 justify-center max-w-xs">
              {[
                '离心机实验，转速5000，时间10分钟',
                '启动生命科学舱',
                '查询所有舱体状态',
              ].map((hint) => (
                <button
                  key={hint}
                  onClick={() => setInput(hint)}
                  className="cursor-pointer rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className={`text-[9px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}
        {isLoading && chatMessages[chatMessages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2.5 text-sm text-gray-400">
              <span className="flex gap-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-gray-100 px-3 py-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="发送实验指令，如：离心机实验..."
          disabled={isLoading}
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-300 focus:border-blue-400 focus:bg-white"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Send className="w-3.5 h-3.5" />
          发送
        </button>
      </form>
    </div>
  )
}

// ============================================================
// 主组件：平板终端布局
// ============================================================
export default function TabletApp() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f8fafc]">
      {/* 顶部导航栏 */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <TabletIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">天宫平板终端 · HITL 交互模式</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>双屏联动 · 已同步</span>
        </div>
      </header>

      {/* 主内容区：左侧任务追踪 + 右侧执行草稿 + AI助手 */}
      <div className="flex flex-1 min-h-0 gap-3 p-3 overflow-hidden">
        {/* 左侧 - 活跃任务追踪器 */}
        <div className="w-[28%] min-w-[200px] flex flex-col gap-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <ActiveTaskTracker />
        </div>

        {/* 右侧 - 执行草稿箱 + AI助手 */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">
          {/* 上：执行草稿箱 */}
          <div className="flex-shrink-0 overflow-y-auto max-h-[42%] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <ExecutionDraft />
          </div>

          {/* 下：AI助手聊天 */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <AiAssistant />
          </div>
        </div>
      </div>
    </div>
  )
}
