/**
 * 天宫智能助手 - 流式感知 Markdown 渲染器
 *
 * 核心能力：
 * - 流式期间实时检测 <think> 块，增量渲染折叠面板
 * - 流式完成后替换为最终渲染结果
 * - 支持思维过程折叠、数学公式、代码高亮
 */

import { useState, useEffect, useMemo } from 'react'
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

interface ParsedThinking {
  visibleText: string
  blocks: ThinkingBlock[]
  incomplete: ThinkingBlock | null
}

// 归一化文本
function normalizeText(text: string): string {
  return text
    .replace(/[\u202F\u00A0\u200B\u3000\u200A\u205F]/g, ' ')
    .replace(/[\u2000-\u200A]/g, ' ')
}

const THINK_OPEN_PATTERN = /(?:<think\b[^>]*>|&lt;think\b[^&]*?&gt;)/gi
const DAG_STEPS_BLOCK_REGEX = /\[DAG_STEPS_START\][\s\S]*?(?:\[DAG_STEPS_END\]|$)/gi

/**
 * 从文本中提取思考块，并返回可渲染正文。
 * 这个解析器会直接删除 <think>...</think> 内部内容，避免思考过程泄露到正文。
 */
function parseThinking(text: string): ParsedThinking {
  const normalized = normalizeText(text)
  const tagRegex = /(?:<think\b[^>]*>|<\/think>|&lt;think\b[^&]*?&gt;|&lt;\/think&gt;)/gi
  const blocks: ThinkingBlock[] = []
  const visibleParts: string[] = []
  let cursor = 0
  let activeStart: number | null = null
  let activeContentStart = 0
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(normalized)) !== null) {
    const tag = match[0].toLowerCase()
    const isOpen = THINK_OPEN_PATTERN.test(tag)
    THINK_OPEN_PATTERN.lastIndex = 0

    if (isOpen) {
      if (activeStart === null) {
        visibleParts.push(normalized.slice(cursor, match.index))
        activeStart = match.index
        activeContentStart = match.index + match[0].length
      }
      continue
    }

    if (activeStart !== null) {
      const content = normalized.slice(activeContentStart, match.index).trim()
      if (content) {
        blocks.push({ id: blocks.length, content, complete: true })
      }
      cursor = match.index + match[0].length
      activeStart = null
      activeContentStart = 0
    }
  }

  if (activeStart !== null) {
    const content = normalized.slice(activeContentStart).trim()
    return {
      visibleText: visibleParts.join(''),
      blocks,
      incomplete: content ? { id: blocks.length, content, complete: false } : null,
    }
  }

  visibleParts.push(normalized.slice(cursor))
  return { visibleText: visibleParts.join(''), blocks, incomplete: null }
}

function stripDagStepsBlock(text: string): string {
  return text.replace(DAG_STEPS_BLOCK_REGEX, '').trim()
}

// ================================================================
// 思考折叠面板
// ================================================================

function ThinkingFoldable({
  content,
  complete = true,
  defaultExpanded = false,
}: {
  content: string
  complete?: boolean
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (!content.trim()) return null
  const foldTitle = /多角色|智能体|资源调度|安全监察|数据分析/.test(content)
    ? '多角色协同思考'
    : '思考过程'

  return (
    <div className="my-2 rounded-lg border border-blue-200 bg-blue-50/30 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-100/40 transition-colors text-left"
        aria-expanded={expanded}
      >
        <Brain className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-xs font-medium text-blue-600">
          {complete ? foldTitle : '思考中'} {expanded ? '(点击收起)' : '(点击展开)'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-blue-400 ml-auto shrink-0 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-blue-100">
          <div className={`pt-2 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-mono ${complete ? '' : 'animate-pulse'}`}>
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
  // 流期间：未完成的内容
  const [incompleteBlock, setIncompleteBlock] = useState<ThinkingBlock | null>(null)

  // 流式期间：每次 content 变化时增量提取
  useEffect(() => {
    if (!isStreaming) return
    const parsed = parseThinking(content)
    setFinalBlocks(parsed.blocks)
    setIncompleteBlock(parsed.incomplete)
  }, [content, isStreaming])

  // 流结束时：转换为最终状态
  useEffect(() => {
    if (isStreaming) return
    const parsed = parseThinking(content)
    setFinalBlocks(parsed.incomplete ? [...parsed.blocks, { ...parsed.incomplete, complete: true }] : parsed.blocks)
    setIncompleteBlock(null)
  }, [content, isStreaming])

  const visibleContent = useMemo(() => {
    return stripDagStepsBlock(parseThinking(content).visibleText)
  }, [content])
  const preprocessed = useMemo(() => preprocessMathBlocks(visibleContent), [visibleContent])
  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], [])

  const thinkingBlocks = finalBlocks
  const markdownForRender = preprocessed

  return (
    <div className={`prose-sm max-w-none ${className || ''}`}>
      {/* 思考折叠面板（流式期间实时渲染已完成的块） */}
      {thinkingBlocks.map((block) => (
        <ThinkingFoldable key={block.id} content={block.content} />
      ))}

      {/* 流式期间的未完成思考内容，同样可折叠 */}
      {isStreaming && incompleteBlock && (
        <ThinkingFoldable
          key="incomplete-thinking"
          content={incompleteBlock.content}
          complete={false}
          defaultExpanded
        />
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
