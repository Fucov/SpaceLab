/**
 * 天宫智能助手 - 实验步骤可视化（对话内嵌 DAG）
 *
 * 功能：
 * - 在对话消息中嵌入实验步骤 DAG（横向流程图）
 * - 显示每个步骤的状态（完成/运行中/待执行）
 * - 点击步骤可查看详情
 */

import { useState } from 'react'
import { Lock, BotMessageSquare, ChevronUp, ChevronDown } from 'lucide-react'
import type { DagStep, ExecutionParams } from './types'

interface ExperimentDagProps {
  steps: DagStep[]
  compact?: boolean
  onStepClick?: (step: DagStep) => void
}

export function ExperimentDag({ steps, compact = false, onStepClick }: ExperimentDagProps) {
  // 按 parallelGroup 分组
  const groups = new Map<number, DagStep[]>()
  steps.forEach((s) => {
    const g = s.parallelGroup ?? 0
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(s)
  })
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a - b)

  const nodeWidth = compact ? 90 : 110
  const nodeHeight = compact ? 28 : 36
  const groupGap = compact ? 12 : 16
  const nodeGap = compact ? 6 : 8
  const groupWidths = sortedGroups.map(([, nodes]) => nodeWidth + (nodes.length - 1) * (nodeWidth + nodeGap))
  const maxGroupWidth = Math.max(...groupWidths)
  const svgW = sortedGroups.length * (maxGroupWidth + groupGap) - groupGap + (compact ? 16 : 24)
  const svgH = nodeHeight + (compact ? 20 : 28)

  const lines: { x1: number; y1: number; x2: number; y2: number; completed: boolean }[] = []
  let xOffset = compact ? 8 : 12

  sortedGroups.forEach(([, nodes], gi) => {
    const groupX = xOffset + maxGroupWidth / 2 - groupWidths[gi] / 2
    nodes.forEach((node, ni) => {
      const nx = groupX + ni * (nodeWidth + nodeGap)
      const ny = (svgH - nodeHeight) / 2
      // 连线：同组内节点到下组第一个节点
      if (gi < sortedGroups.length - 1) {
        const nextNodes = sortedGroups[gi + 1][1]
        const nextGroupX = xOffset + (gi + 1) * (maxGroupWidth + groupGap) + maxGroupWidth / 2 - groupWidths[gi + 1] / 2
        nextNodes.forEach((nextNode) => {
          const nnx = nextGroupX + (nextNode.parallelGroup ?? 0) * (nodeWidth + nodeGap)
          lines.push({ x1: nx + nodeWidth, y1: ny + nodeHeight / 2, x2: nnx, y2: ny + nodeHeight / 2, completed: node.status === 'completed' || node.status === 'running' })
        })
      }
      // 组内并行节点之间的连线（水平虚线）
      if (nodes.length > 1 && ni < nodes.length - 1) {
        lines.push({ x1: nx + nodeWidth, y1: ny + nodeHeight / 2, x2: nx + nodeWidth + nodeGap, y2: ny + nodeHeight / 2, completed: false })
      }
    })
    xOffset += maxGroupWidth + groupGap
  })

  return (
    <div className="overflow-x-auto py-1">
      <svg width={svgW} height={svgH} className="block">
        {/* 连接线 */}
        {lines.map((l, i) => {
          const midX = (l.x1 + l.x2) / 2
          const d = `M ${l.x1} ${l.y1} C ${midX} ${l.y1}, ${midX} ${l.y2}, ${l.x2} ${l.y2}`
          return (
            <path key={i} d={d} fill="none"
              stroke={l.completed ? '#3b82f6' : '#d1d5db'}
              strokeWidth={1.5}
              strokeDasharray={l.completed ? undefined : '4 3'}
              opacity={l.completed ? 0.7 : 0.4}
            />
          )
        })}

        {/* 节点 */}
          {(() => {
          xOffset = compact ? 8 : 12
          const elements: React.ReactNode[] = []
          sortedGroups.forEach(([, nodes], gi) => {
            const groupX = xOffset + maxGroupWidth / 2 - groupWidths[gi] / 2
            nodes.forEach((node, ni) => {
              const nx = groupX + ni * (nodeWidth + nodeGap)
              const ny = (svgH - nodeHeight) / 2
              const colors = {
                completed: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
                running: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
                error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
                waiting_resource: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
                pending: { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' },
              }[node.status]
              elements.push(
                <g key={node.id} onClick={() => onStepClick?.(node)} style={{ cursor: onStepClick ? 'pointer' : 'default' }}>
                  <rect x={nx} y={ny} width={nodeWidth} height={nodeHeight}
                    rx={compact ? 4 : 6} ry={compact ? 4 : 6}
                    fill={colors.bg} stroke={colors.border} strokeWidth={1.5}
                  />
                  <text
                    x={nx + nodeWidth / 2} y={ny + nodeHeight / 2}
                    textAnchor="middle" dominantBaseline="central"
                    fill={colors.text}
                    fontSize={compact ? 9 : 11}
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    {compact ? node.name.slice(0, 8) : node.name.slice(0, 12)}
                  </text>
                  {node.status === 'running' && (
                    <circle cx={nx + nodeWidth - 6} cy={ny + 6} r={3} fill="#3b82f6" className="animate-pulse" />
                  )}
                </g>
              )
            })
            xOffset += maxGroupWidth + groupGap
          })
          return elements
        })()}
      </svg>
    </div>
  )
}

// ================================================================
// 执行参数草稿（可折叠）
// ================================================================

interface ExecutionDraftProps {
  params: ExecutionParams
  onParamChange?: (key: string, value: string | number) => void
  onAuthorize?: () => void
  onCancel?: () => void
}

export function ExecutionDraft({ params, onParamChange, onAuthorize, onCancel }: ExecutionDraftProps) {
  const [expanded, setExpanded] = useState(true)

  const priorityColor =
    params.priority === 'high' ? 'text-red-500 bg-red-50 border-red-200'
    : params.priority === 'medium' ? 'text-amber-500 bg-amber-50 border-amber-200'
    : 'text-gray-500 bg-gray-50 border-gray-200'

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 my-2 overflow-hidden">
      {/* 头部（可折叠） */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BotMessageSquare className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-blue-700">{params.taskName}</span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${priorityColor}`}>
            {params.priority === 'high' ? '高优先级' : params.priority === 'medium' ? '中优先级' : '低优先级'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />}
        </div>
      </button>

      {/* 展开内容 */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="text-xs text-blue-600/70 bg-blue-100/40 rounded px-2 py-1.5 italic">
            原始指令：{params.rawText}
          </div>

          {/* 设备参数 */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-blue-700">设备参数</div>
            {params.deviceParams.map((p) => (
              <div key={p.key} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20 shrink-0">{p.key}</span>
                {p.editable ? (
                  <input
                    type="number"
                    value={p.value}
                    onChange={(e) => onParamChange?.(p.key, e.target.value)}
                    className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 text-xs font-mono text-gray-800 focus:border-blue-400 focus:outline-none"
                  />
                ) : (
                  <span className="flex-1 rounded border border-gray-100 bg-gray-50 px-2 py-1 text-xs font-mono text-gray-400">
                    {p.value} {p.unit}
                  </span>
                )}
                <span className="text-xs text-gray-400 w-8">{p.unit}</span>
                {!p.editable && (
                  <Lock className="w-3 h-3 text-gray-300" />
                )}
              </div>
            ))}
          </div>

          {/* 执行信息 */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>目标舱体：<strong className="text-gray-700">{params.targetModuleName}</strong></span>
            <span>设备：<strong className="text-gray-700">{params.device}</strong></span>
            <span>预计：<strong className="text-gray-700">{params.estimatedDuration}</strong></span>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={onAuthorize}
              className="cursor-pointer flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              授权执行
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
