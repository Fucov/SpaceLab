/**
 * AstroAgent OS - 流式感知 Markdown 渲染器
 *
 * 核心能力：
 * - 流式期间实时检测 <think> 块，增量渲染折叠面板
 * - 流式完成后替换为最终渲染结果
 * - 支持思维过程折叠、数学公式、代码高亮
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { Prism as PrismLight } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Components } from 'react-markdown'
import { ExternalLink, ChevronDown, Brain } from 'lucide-react'
import katex from 'katex'

// ================================================================
// 思考块检测（流式友好）
// ================================================================

interface ThinkingBlock {
  id: number
  content: string
  complete: boolean
}

// 归一化文本
function normalizeText(text: string): string {
  return text
    .replace(/[\u202F\u00A0\u200B\u3000\u200A\u205F]/g, ' ')
    .replace(/[\u2000-\u200A]/g, ' ')
}

// 思考标签：直接使用字面量字符
const THINK_OPEN_TAGS_LIST = ['<think>', '&lt;<think>&gt;', '&lt;<think>&gt;']
const THINK_CLOSE_TAGS_LIST = ['</think>', '&lt;</think>&gt;', '&lt;</think>&gt;']

// 用于从渲染文本中移除思考标签的正则（匹配开始和结束标签）
const THINK_TAG_REGEX = /<think.*?>/gi
// 支持 HTML 实体编码版本（某些 LLM 输出 &lt;think&gt;）
const THINK_TAG_HTML_ENTITY_REGEX = /&lt;think.*?&gt;/gi

/**
 * 从累积文本中提取所有思考块（流式增量模式）
 * 返回已完成的块列表 + 当前未完成的块内容（如果有）
 */
function extractThinkingIncremental(
  text: string,
  prevBlocks: ThinkingBlock[]
): { blocks: ThinkingBlock[]; incomplete: string | null } {
  const normalized = normalizeText(text)

  // 收集所有开始/结束标签位置
  const opens: { pos: number; tag: string }[] = []
  for (const tag of THINK_OPEN_TAGS_LIST) {
    let pos = 0
    while ((pos = normalized.indexOf(tag, pos)) !== -1) {
      opens.push({ pos, tag })
      pos += tag.length
    }
  }

  const closes: { pos: number; tag: string }[] = []
  for (const tag of THINK_CLOSE_TAGS_LIST) {
    let pos = 0
    while ((pos = normalized.indexOf(tag, pos)) !== -1) {
      closes.push({ pos, tag })
      pos += tag.length
    }
  }

  const completeBlocks: ThinkingBlock[] = []
  let incompleteContent: string | null = null

  if (opens.length === 0 && closes.length === 0) {
    // 无标签时返回已有完整块
    return {
      blocks: prevBlocks.filter((b) => b.complete),
      incomplete: null,
    }
  }

  // 从已完成的块中继承 ID
  const prevIds = new Set(prevBlocks.filter((b) => b.complete).map((b) => b.id))

  // 配对：按出现顺序匹配开始和结束标签
  let openIdx = 0
  let closeIdx = 0
  let blockIdCounter = Date.now()

  while (openIdx < opens.length && closeIdx < closes.length) {
    const open = opens[openIdx]
    const close = closes[closeIdx]

    if (close.pos < open.pos) {
      // 孤立的闭合标签在第一个开始之前，忽略
      closeIdx++
      continue
    }

    // 提取标签之间的内容
    const content = normalized
      .slice(open.pos + open.tag.length, close.pos)
      .replace(/[\n\r]+/g, ' ')
      .trim()

    if (content) {
      const id = blockIdCounter++
      completeBlocks.push({ id, content, complete: true })
    }

    openIdx++
    closeIdx++
  }

  // 如果有未配对的开始标签，说明最后一块还在生成中
  if (openIdx < opens.length) {
    const lastOpen = opens[opens.length - 1]
    const lastClose = closes.length > closeIdx ? closes[closes.length - 1].pos : -1

    if (lastClose < lastOpen.pos || closes.length === 0) {
      // 真正的未完成块
      incompleteContent = normalized
        .slice(lastOpen.pos + lastOpen.tag.length)
        .replace(/[\n\r]+/g, ' ')
        .trim()
    }
  }

  return {
    blocks: [...prevBlocks.filter((b) => b.complete), ...completeBlocks],
    incomplete: incompleteContent,
  }
}

// ================================================================
// 思考折叠面板
// ================================================================

function ThinkingFoldable({
  content,
  defaultExpanded = false,
}: {
  content: string
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (!content.trim()) return null

  return (
    <div className="my-2 rounded-lg border border-blue-200 bg-blue-50/30 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-100/40 transition-colors text-left"
        aria-expanded={expanded}
      >
        <Brain className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-xs font-medium text-blue-600">
          思考过程 {expanded ? '(点击收起)' : '(点击展开)'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-blue-400 ml-auto shrink-0 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-blue-100">
          <div className="pt-2 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-mono">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}

// ================================================================
// 数学公式预处理
// ================================================================

function preprocessMathBlocks(text: string): string {
  return text.replace(/```math\s*\n([\s\S]*?)```/g, (_, mathContent) => {
    const trimmed = mathContent.trim()
    return `$$\n${trimmed}\n$$`
  })
}

// ================================================================
// Markdown 组件
// ================================================================

const codeStyle = {
  margin: 0,
  borderRadius: 0,
  fontSize: '11px',
  background: '#1e1e1e',
}

const CodeBlock: Components['code'] = ({ className, children }) => {
  const match = /language-(\w+)/.exec(className || '')
  const isInline = !match
  const language = match ? match[1] : undefined

  // Handle math blocks: render with KaTeX
  if (language === 'math') {
    const mathContent = String(children).trim()
    const isBlock = !isInline
    try {
      const html = katex.renderToString(mathContent, {
        displayMode: isBlock,
        throwOnError: false,
        errorColor: '#dc2626',
        trust: true,
        strict: false,
      })
      return (
        <span
          className={isBlock ? 'katex-display-wrapper my-4 overflow-x-auto' : 'katex-inline-wrapper'}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    } catch {
      return (
        <code className={isBlock ? 'katex-error' : ''}>
          {children}
        </code>
      )
    }
  }

  if (isInline) {
    return (
      <code
        className="px-1 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[11px] border border-gray-200"
      >
        {children}
      </code>
    )
  }
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 my-2 text-xs">
      <div className="bg-gray-800 px-3 py-1.5 text-gray-400 text-[10px] font-mono border-b border-gray-700">
        {match[1]}
      </div>
      <PrismLight style={oneDark as any} language={match[1]} PreTag="div" customStyle={codeStyle}>
        {String(children).replace(/\n$/, '')}
      </PrismLight>
    </div>
  )
}

const components: Components = {
  code: CodeBlock,
  a({ href, children }) {
    if (href?.startsWith('http')) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700 underline underline-offset-2 decoration-blue-300 hover:decoration-blue-500 transition-colors">
          {children}
          <ExternalLink className="w-3 h-3 inline" />
        </a>
      )
    }
    return <a href={href} className="text-blue-600 hover:text-blue-700 underline underline-offset-2 decoration-blue-300">{children}</a>
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-3 rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <tbody>{children}</tbody>
        </table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="bg-gray-50">{children}</thead>
  },
  th({ children, align }) {
    return (
      <th className={`px-4 py-2.5 text-xs font-semibold border-b border-gray-200 bg-gray-50 ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      }`}>
        {children}
      </th>
    )
  },
  td({ children, align }) {
    return (
      <td className={`px-4 py-2.5 text-xs border-b border-gray-100 ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      }`}>
        {children}
      </td>
    )
  },
  tr({ children }) {
    return <tr className="hover:bg-blue-50/30 transition-colors">{children}</tr>
  },
  ul({ children }) {
    return <ul className="list-disc list-inside space-y-0.5 my-1 text-sm text-gray-700">{children}</ul>
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside space-y-0.5 my-1 text-sm text-gray-700">{children}</ol>
  },
  p({ children }) {
    return <p className="text-sm text-gray-700 leading-relaxed my-1.5">{children}</p>
  },
  h2({ children }) {
    return <h2 className="text-sm font-bold text-gray-800 mt-1.5 mb-1">{children}</h2>
  },
  h3({ children }) {
    return <h3 className="text-sm font-semibold text-gray-700 mt-1 mb-0.5">{children}</h3>
  },
  blockquote({ children }) {
    return <blockquote className="border-l-3 border-blue-300 pl-3 py-1 my-1 bg-blue-50/50 rounded-r text-sm text-gray-600 italic">{children}</blockquote>
  },
  strong({ children }) {
    return <strong className="font-semibold text-gray-800">{children}</strong>
  },
}

// ================================================================
// 流式渲染器（核心）
// ================================================================

interface StreamingMarkdownRendererProps {
  content: string
  isStreaming?: boolean
  className?: string
}

export default function StreamingMarkdownRenderer({
  content,
  isStreaming = false,
  className,
}: StreamingMarkdownRendererProps) {
  // 最终状态（流结束后使用）
  const [finalBlocks, setFinalBlocks] = useState<ThinkingBlock[]>([])
  // 流期间：累积的完整块（只用 ref，累积增长，永不丢失）
  const completedBlocksRef = useRef<ThinkingBlock[]>([])
  // 流期间：未完成的内容
  const [incompleteContent, setIncompleteContent] = useState<string | null>(null)

  // 流式期间：每次 content 变化时增量提取
  useEffect(() => {
    if (!isStreaming) return

    const { blocks } = extractThinkingIncremental(content, [])
    const newCompleted = blocks.filter((b) => b.complete)

    if (newCompleted.length > 0) {
      const existingIds = new Set(completedBlocksRef.current.map((b) => b.id))
      for (const block of newCompleted) {
        if (!existingIds.has(block.id)) {
          completedBlocksRef.current = [...completedBlocksRef.current, block]
        }
      }
    }

    // 未完成内容：从最后一个开始标签后提取到内容末尾
    const normalized = normalizeText(content)
    const lastOpen = Math.max(
      normalized.lastIndexOf('<think>'),
      normalized.lastIndexOf('&lt;<think>&gt;')
    )
    const lastClose = Math.max(
      normalized.lastIndexOf('</think>'),
      normalized.lastIndexOf('&lt;</think>&gt;')
    )
    setIncompleteContent(lastOpen > lastClose ? normalized.slice(lastOpen + 5).trim() : null)
  }, [content, isStreaming])

  // 流结束时：转换为最终状态
  useEffect(() => {
    if (isStreaming) return
    const { blocks } = extractThinkingIncremental(content, [])
    setFinalBlocks(blocks.filter((b) => b.complete))
    completedBlocksRef.current = []
    setIncompleteContent(null)
  }, [content, isStreaming])

  const preprocessed = useMemo(() => preprocessMathBlocks(content), [content])
  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], [])

  // 思考块：流期间用 ref 中的累积块，流结束后用 finalBlocks
  const thinkingBlocks = isStreaming ? completedBlocksRef.current : finalBlocks

  // 流式期间：从预处理的文本中移除思考块标签，显示为普通文本
  const markdownForRender = useMemo(() => {
    return preprocessed
      .replace(THINK_TAG_REGEX, '')
      .replace(THINK_TAG_HTML_ENTITY_REGEX, '')
  }, [preprocessed])

  return (
    <div className={`prose-sm max-w-none ${className || ''}`}>
      {/* 思考折叠面板（流式期间实时渲染已完成的块） */}
      {thinkingBlocks.map((block) => (
        <ThinkingFoldable key={block.id} content={block.content} />
      ))}

      {/* 流式期间的未完成思考内容（直接显示在 Markdown 之前） */}
      {isStreaming && incompleteContent && (
        <div className="my-2 rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] text-blue-500 font-medium">思考中...</span>
          </div>
          <div className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap font-mono animate-pulse">
            {incompleteContent}
          </div>
        </div>
      )}

      {/* Markdown 内容 */}
      {markdownForRender.trim() && (
        <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
          {markdownForRender}
        </ReactMarkdown>
      )}
    </div>
  )
}
