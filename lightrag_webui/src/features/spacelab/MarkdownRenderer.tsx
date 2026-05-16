/**
 * AstroAgent OS - Markdown/HTML 渲染组件
 *
 * 支持：
 * - GitHub Flavored Markdown (表格、任务列表、删除线)
 * - 数学公式 (remark-math)
 * - 代码高亮
 * - 实验数据链接（自定义渲染）
 * - 流式输出时增量追加
 * - 思考内容折叠（识别 <think> 标签，类似 GPT/DeepSeek）
 */

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Components } from 'react-markdown'
import { ExternalLink, ChevronDown, Brain } from 'lucide-react'

// ================================================================
// 思考内容提取与折叠
// ================================================================

interface ThinkingBlock {
  raw: string      // 原始 <think>...</think> 标签
  content: string  // 标签内的思考内容
  placeholder: string // 替换用的占位符 marker
}

// 提取所有 <think>...</think> 块，返回处理后的内容和各块列表
function extractThinkingBlocks(text: string): { processed: string; blocks: ThinkingBlock[] } {
  const blocks: ThinkingBlock[] = []
  const placeholder = '__THINKING_BLOCK__'
  let idx = 0

  const processed = text.replace(/<think>([\s\S]*?)<\/think>/gi, (match, content) => {
    const block: ThinkingBlock = {
      raw: match,
      content: content.trim(),
      placeholder: `${placeholder}${idx}__`,
    }
    blocks.push(block)
    idx++
    return block.placeholder
  })

  return { processed, blocks }
}

// 渲染占位符为折叠面板
function renderThinkingPlaceholder(
  placeholder: string,
  content: string,
  index: number
) {
  return (
    <ThinkingFoldable
      key={`think-${placeholder}-${index}`}
      content={content}
      defaultExpanded={false}
    />
  )
}

interface ThinkingFoldableProps {
  content: string
  defaultExpanded?: boolean
}

function ThinkingFoldable({ content, defaultExpanded = false }: ThinkingFoldableProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="my-2 rounded-lg border border-blue-200 bg-blue-50/30 overflow-hidden">
      {/* 可点击的头部 */}
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
          className={`w-3.5 h-3.5 text-blue-400 ml-auto shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 展开内容 */}
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
// Markdown 组件
// ================================================================

const components: Components = {
  // 代码块
  code({ node, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const isInline = !match
    if (isInline) {
      return (
        <code
          className="px-1 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[11px] border border-gray-200"
          {...props}
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
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '11px',
            background: '#1e1e1e',
          }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    )
  },

  // 链接
  a({ href, children }) {
    if (href && (href.startsWith('http') || href.includes('tiankong-station.cn'))) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700 underline underline-offset-2 decoration-blue-300 hover:decoration-blue-500 transition-colors">
          {children}
          <ExternalLink className="w-3 h-3 inline" />
        </a>
      )
    }
    return (
      <a href={href} className="text-blue-600 hover:text-blue-700 underline underline-offset-2 decoration-blue-300 hover:decoration-blue-500 transition-colors">
        {children}
      </a>
    )
  },

  // 表格
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="border-collapse border border-gray-200 text-xs w-full">
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
      <th className={`px-3 py-1.5 text-xs font-semibold border border-gray-200 bg-gray-50 ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      }`}>
        {children}
      </th>
    )
  },
  tr({ children }) {
    return <tr className="hover:bg-blue-50/30 transition-colors">{children}</tr>
  },

  // 列表
  ul({ children }) {
    return <ul className="list-disc list-inside space-y-0.5 my-1 text-sm text-gray-700">{children}</ul>
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside space-y-0.5 my-1 text-sm text-gray-700">{children}</ol>
  },
  li({ children }) {
    return <li className="text-sm text-gray-700">{children}</li>
  },

  // 段落
  p({ children }) {
    return <p className="text-sm text-gray-700 leading-relaxed my-1.5">{children}</p>
  },

  // 标题
  h1({ children }) {
    return <h1 className="text-base font-bold text-gray-800 mt-2 mb-1 border-b border-gray-200 pb-1">{children}</h1>
  },
  h2({ children }) {
    return <h2 className="text-sm font-bold text-gray-800 mt-1.5 mb-1">{children}</h2>
  },
  h3({ children }) {
    return <h3 className="text-sm font-semibold text-gray-700 mt-1 mb-0.5">{children}</h3>
  },

  // 引用块
  blockquote({ children }) {
    return (
      <blockquote className="border-l-3 border-blue-300 pl-3 py-1 my-1 bg-blue-50/50 rounded-r text-sm text-gray-600 italic">
        {children}
      </blockquote>
    )
  },

  // 水平线
  hr() {
    return <hr className="my-2 border-gray-200" />
  },

  // 强调
  strong({ children }) {
    return <strong className="font-semibold text-gray-800">{children}</strong>
  },
  em({ children }) {
    return <em className="text-gray-600">{children}</em>
  },
}

// ================================================================
// 主渲染器
// ================================================================

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const { processed, blocks } = extractThinkingBlocks(content)

  return (
    <div className={`prose-sm max-w-none ${className || ''}`}>
      {/* 渲染 <think> 思考块 */}
      {blocks.map((block, i) =>
        renderThinkingPlaceholder(block.placeholder, block.content, i)
      )}

      {/* 渲染处理后的 Markdown 内容（占位符处留空） */}
      {processed.trim() && (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          components={components}
        >
          {processed}
        </ReactMarkdown>
      )}
    </div>
  )
}
