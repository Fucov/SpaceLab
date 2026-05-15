import { useState, useCallback, useRef, useEffect } from 'react'
import { useSpaceLabStore } from '../store'
import { queryTextStream } from '@/api/lightrag'
import type { QueryMode } from '@/api/lightrag'
import type { ChatMessage } from '../types'

const modes: { value: QueryMode; label: string }[] = [
  { value: 'naive', label: 'Naive' },
  { value: 'local', label: 'Local' },
  { value: 'global', label: 'Global' },
  { value: 'hybrid', label: 'Hybrid' },
]

export default function AiAssistant() {
  const chatMessages = useSpaceLabStore((s) => s.chatMessages)
  const addChatMessage = useSpaceLabStore((s) => s.addChatMessage)
  const executeCommand = useSpaceLabStore((s) => s.executeCommand)
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<QueryMode>('hybrid')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }
    addChatMessage(userMsg)

    const query = input.trim()
    setInput('')
    setIsLoading(true)

    // Check if this is a local command
    const cmdResult = executeCommand(query)
    if (cmdResult.success) {
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: cmdResult.message,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      }
      addChatMessage(assistantMsg)
      setIsLoading(false)
      return
    }

    // Otherwise, call real LightRAG API
    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now()}-ai`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }
    addChatMessage(assistantMsg)

    try {
      await queryTextStream(
        {
          query,
          mode,
          stream: true,
          top_k: 40,
          chunk_top_k: 20,
          max_entity_tokens: 6000,
          max_relation_tokens: 8000,
          max_total_tokens: 30000,
          enable_rerank: true,
        },
        (chunk) => {
          assistantMsg.content += chunk
          useSpaceLabStore.setState((state) => ({
            chatMessages: state.chatMessages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: assistantMsg.content } : m
            ),
          }))
        }
      )
    } catch {
      assistantMsg.content = '抱歉，查询出错。请检查 LightRAG 服务是否已启动。'
      useSpaceLabStore.setState((state) => ({
        chatMessages: state.chatMessages.map((m) =>
          m.id === assistantMsg.id ? { ...m, content: assistantMsg.content } : m
        ),
      }))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, mode, addChatMessage, executeCommand])

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">AI</div>
          <div>
            <div className="text-sm font-semibold text-gray-800">天宫智能助手</div>
            <div className="text-[10px] text-gray-400">基于 LightRAG 知识图谱检索</div>
          </div>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`cursor-pointer px-2.5 py-1 text-[10px] font-medium transition-colors ${
                mode === m.value ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {chatMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-gray-300">
            <div className="text-4xl mb-3">🤖</div>
            <div className="text-sm">你好，我是天宫智能助手</div>
            <div className="text-xs mt-1 text-gray-400">可以询问实验相关问题，或输入指令控制实验舱</div>
            <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
              {['启动流体实验舱', '查询所有舱体状态', '终止任务'].map((hint) => (
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
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
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
            <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2 text-sm text-gray-400">
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
          placeholder="启动流体实验舱 / 终止任务 / 询问实验参数..."
          disabled={isLoading}
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-300 focus:border-blue-400 focus:bg-white"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          发送
        </button>
      </form>
    </div>
  )
}
