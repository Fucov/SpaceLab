/**
 * AstroAgent OS - Markdown/HTML 渲染组件
 *
 * 支持：
 * - GitHub Flavored Markdown (表格、任务列表、删除线)
 * - 数学公式 (remark-math)
 * - 代码高亮
 * - 实验数据链接（自定义渲染）
 * - 流式输出时增量追加
 */

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Components } from 'react-markdown'
import { ExternalLink } from 'lucide-react'

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

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`prose-sm max-w-none ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
