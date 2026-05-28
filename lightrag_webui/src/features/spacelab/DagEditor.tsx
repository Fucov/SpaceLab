/**
 * 天宫智能助手 - 交互式 DAG 实验步骤编辑器
 *
 * 功能：
 * - 内嵌可编辑的 DAG 可视化（带图例）
 * - 支持动态增删步骤、编辑名称/说明/目标/参数/前提/并行组
 * - 绿色虚线表示并行连接，蓝色实线表示串行连接
 * - 支持"重新生成描述"：将修改后的 DAG 发回 AI
 * - 支持"开始执行"：启动实验监控模式
 */

import { useState, useCallback, useMemo } from 'react'
import type { DagStepDetail } from './types'
import {
  Plus, Trash2, ChevronDown, ChevronRight,
  CheckCircle, Clock, Edit3, X, FileText, RotateCcw, Play, AlertTriangle,
} from 'lucide-react'

// ================================================================
// 类型定义
// ================================================================

interface DagEditorProps {
  /** 初始步骤列表（可选） */
  initialSteps?: DagStepDetail[]
  /** 用户确认执行时的回调 */
  onConfirm?: (steps: DagStepDetail[], executionPlan: string) => void
  /** 用户取消时的回调 */
  onCancel?: () => void
  /** 只读模式（用于展示已确认的计划） */
  readOnly?: boolean
}

// ================================================================
// 工具函数
// ================================================================

function makeId(prefix = 'step') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function defaultStepDetail(name = '新步骤', parallelGroup = 0): DagStepDetail {
  return {
    id: makeId(),
    name,
    description: '',
    instrumentParams: [],
    prerequisites: [],
    goals: [],
    parallelGroup,
  }
}

function dagStepToDetail(step: DagStepDetail): DagStepDetail {
  return {
    id: step.id || makeId(),
    name: step.name || '未命名步骤',
    description: step.description || '',
    instrumentParams: step.instrumentParams || [],
    prerequisites: step.prerequisites || [],
    goals: step.goals || [],
    parallelGroup: step.parallelGroup ?? 0,
  }
}

function parseNumericValue(value: string | number) {
  const parsed = Number.parseFloat(String(value).replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function formatNumericValue(value: number, step: number) {
  const precision = step < 1 ? 1 : 0
  return value.toFixed(precision)
}

function getParamRange(param: { key: string; name?: string; value: string | number; unit?: string; min?: number; max?: number; step?: number }) {
  if (param.min !== undefined && param.max !== undefined && param.step !== undefined) {
    return { min: param.min, max: param.max, step: param.step }
  }
  const raw = `${param.name || param.key} ${param.unit || ''}`.toLowerCase()
  const numericValue = parseNumericValue(param.value) ?? 0

  if (/温度|temperature|temp|°c|℃|celsius/.test(raw)) {
    return { min: -100, max: 120, step: 0.1 }
  }
  if (/co₂|co2|二氧化碳|carbon/.test(raw)) {
    return { min: 0, max: 10, step: 0.1 }
  }
  if (/湿度|humidity|rh/.test(raw)) {
    return { min: 0, max: 100, step: 1 }
  }
  if (/功率|power|w\b|瓦/.test(raw)) {
    return { min: 0, max: 500, step: 1 }
  }
  if (/压力|pressure|kpa|pa\b/.test(raw)) {
    return { min: 0, max: 200, step: 0.1 }
  }
  if (/体积|容积|volume|ml|l\b/.test(raw)) {
    return { min: 0, max: 100, step: 0.1 }
  }
  if (/时长|时间|duration|time|min|分钟/.test(raw)) {
    return { min: 0, max: 240, step: 1 }
  }
  if (/浓度|concentration|浓缩|%/.test(raw)) {
    return { min: 0, max: 100, step: 0.1 }
  }
  return { min: 0, max: 100, step: 1 }
}

// ================================================================
// 步骤编辑器卡片
// ================================================================

function StepEditor({
  step,
  onUpdate,
  onDelete,
  index,
  readOnly,
}: {
  step: DagStepDetail
  onUpdate: (s: DagStepDetail) => void
  onDelete: () => void
  index: number
  readOnly?: boolean
}) {
  const [expanded, setExpanded] = useState(true)

  const bgClass = step.parallelGroup > 0 ? 'border-green-200' : 'border-blue-200'

  return (
    <div className={`flex-1 rounded-lg border ${bgClass} bg-white overflow-hidden`}>
      {/* 步骤头部 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
        {/* 步骤编号 */}
        <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>

        {/* 步骤名称 */}
        {readOnly ? (
          <span className="text-sm font-semibold text-gray-800 flex-1">{step.name}</span>
        ) : (
          <input
            type="text"
            value={step.name}
            onChange={(e) => onUpdate({ ...step, name: e.target.value })}
            className="flex-1 text-sm font-semibold text-gray-800 bg-transparent border-none outline-none focus:border-b focus:border-blue-400"
            placeholder="步骤名称..."
          />
        )}

        {/* 并行组标签 */}
        {step.parallelGroup > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded border border-green-200 font-medium">
            并行 {step.parallelGroup}
          </span>
        )}

        {/* 操作按钮 */}
        {!readOnly && (
          <button
            onClick={onDelete}
            className="cursor-pointer p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="cursor-pointer p-1 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div className="px-4 py-3 space-y-3 border-t border-blue-100">
          {/* 并行分组 */}
          {!readOnly && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-500 w-20 shrink-0">并行组</label>
              <input
                type="number"
                min={0}
                value={step.parallelGroup}
                onChange={(e) => onUpdate({ ...step, parallelGroup: parseInt(e.target.value) || 0 })}
                className="w-20 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-400"
              />
              <span className="text-xs text-gray-400">同组步骤可并行执行</span>
            </div>
          )}

          {/* 步骤说明 */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">步骤说明</label>
            <textarea
              value={step.description}
              onChange={(e) => onUpdate({ ...step, description: e.target.value })}
              placeholder="描述这个步骤要做什么..."
              rows={1}
              readOnly={readOnly}
              className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-blue-400 resize-none"
            />
          </div>

          {/* 执行目标 */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">执行目标</label>
            {step.goals.map((goal, i) => (
              <div key={i} className="flex items-center gap-1 mb-1">
                <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                {readOnly ? (
                  <span className="text-xs text-gray-600">{goal}</span>
                ) : (
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => {
                      const goals = [...step.goals]
                      goals[i] = e.target.value
                      onUpdate({ ...step, goals })
                    }}
                    className="flex-1 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-700 outline-none focus:border-blue-400"
                  />
                )}
                {!readOnly && (
                  <button
                    onClick={() => onUpdate({ ...step, goals: step.goals.filter((_, j) => j !== i) })}
                    className="cursor-pointer p-0.5 text-gray-300 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <button
                onClick={() => onUpdate({ ...step, goals: [...step.goals, ''] })}
                className="cursor-pointer flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1"
              >
                <Plus className="w-3 h-3" />
                添加目标
              </button>
            )}
          </div>

          {/* 仪器参数 */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">仪器参数</label>
            <div className="space-y-1">
              {step.instrumentParams.map((param, i) => {
                const numericValue = parseNumericValue(param.value)
                const range = getParamRange(param)
                const sliderValue = Math.min(range.max, Math.max(range.min, numericValue ?? range.min))
                const updateParam = (patch: Partial<typeof param>) => {
                  const params = [...step.instrumentParams]
                  params[i] = { ...params[i], ...patch }
                  onUpdate({ ...step, instrumentParams: params })
                }
                const updateParamValue = (value: string | number) => updateParam({ value })
                const displayName = param.name ?? param.key ?? ''
                const unit = param.unit ?? ''

                return (
                  <div key={i} className="flex min-h-[40px] items-center gap-2 rounded-md border border-gray-100 bg-gray-50/70 px-2 py-1.5">
                    {readOnly ? (
                      <>
                        <span className="min-w-0 flex-1 truncate text-xs font-mono text-gray-600">{displayName || '参数'}</span>
                        <span className="w-28 shrink-0 text-right text-xs font-mono font-medium text-gray-700">
                          {param.value}{unit}
                        </span>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => updateParam({ name: e.target.value, key: param.key || e.target.value || `param-${i + 1}` })}
                          className="h-8 w-28 shrink-0 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-400"
                          placeholder="参数名称"
                        />
                        {numericValue !== null ? (
                        <input
                          type="range"
                          min={range.min}
                          max={range.max}
                          step={range.step}
                          value={sliderValue}
                          onChange={(e) => updateParamValue(formatNumericValue(Number(e.target.value), range.step))}
                          className="h-8 min-w-[120px] flex-1 cursor-pointer accent-blue-600"
                        />
                        ) : (
                          <div className="min-w-[120px] flex-1" />
                        )}
                        <input
                          type={numericValue !== null ? 'number' : 'text'}
                          min={range.min}
                          max={range.max}
                          step={range.step}
                          value={param.value}
                          onChange={(e) => updateParamValue(e.target.value)}
                          className="h-8 w-[90px] shrink-0 rounded-md border border-gray-200 bg-white px-2 text-xs font-mono text-gray-700 outline-none focus:border-blue-400"
                        />
                        <input
                          type="text"
                          value={unit}
                          onChange={(e) => updateParam({ unit: e.target.value })}
                          className="h-8 w-[60px] shrink-0 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-400"
                          placeholder="单位"
                        />
                        <button
                          onClick={() =>
                            onUpdate({ ...step, instrumentParams: step.instrumentParams.filter((_, j) => j !== i) })
                          }
                          className="cursor-pointer rounded p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400 active:bg-red-100"
                          aria-label="删除参数"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            {!readOnly && (
              <button
                onClick={() =>
                  onUpdate({
                    ...step,
                    instrumentParams: [
                      ...step.instrumentParams,
                      { key: `param-${step.instrumentParams.length + 1}`, name: '新参数', value: 0, unit: '', min: 0, max: 100, step: 1, editable: true },
                    ],
                  })
                }
                className="cursor-pointer flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1"
              >
                <Plus className="w-3 h-3" />
                添加参数
              </button>
            )}
          </div>

          {/* 执行前提 */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">执行前提</label>
            {step.prerequisites.map((prereq, i) => (
              <div key={i} className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-orange-400 shrink-0" />
                {readOnly ? (
                  <span className="text-xs text-gray-600">{prereq}</span>
                ) : (
                  <input
                    type="text"
                    value={prereq}
                    onChange={(e) => {
                      const prereqs = [...step.prerequisites]
                      prereqs[i] = e.target.value
                      onUpdate({ ...step, prerequisites: prereqs })
                    }}
                    className="flex-1 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-700 outline-none focus:border-blue-400"
                  />
                )}
                {!readOnly && (
                  <button
                    onClick={() =>
                      onUpdate({ ...step, prerequisites: step.prerequisites.filter((_, j) => j !== i) })
                    }
                    className="cursor-pointer p-0.5 text-gray-300 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <button
                onClick={() => onUpdate({ ...step, prerequisites: [...step.prerequisites, ''] })}
                className="cursor-pointer flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1"
              >
                <Plus className="w-3 h-3" />
                添加前提
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ================================================================
// DAG 图例
// ================================================================

const DAG_LEGEND = [
  { color: '#eff6ff', border: '#3b82f6', label: '串行步骤', desc: '蓝色实线 · 等待前置完成' },
  { color: '#d1fae5', border: '#10b981', label: '并行分组', desc: '绿色虚线 · 同组可并行' },
]

// ================================================================
// DAG 可视化（带图例和清晰连线）
// ================================================================

function DagPreviewWithLegend({ steps }: { steps: DagStepDetail[] }) {
  const { nodes, lines, svgW, svgH } = useMemo(() => {
    const groups = new Map<number, DagStepDetail[]>()
    steps.forEach((s) => {
      const g = s.parallelGroup ?? 0
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g)!.push(s)
    })
    const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a - b)

    const nodeWidth = 116
    const nodeHeight = 34
    const groupGap = 58
    const nodeGap = 12
    const pad = 12
    const legendH = 20
    const maxGroupH = sortedGroups.reduce(
      (max, [, group]) => Math.max(max, group.length * (nodeHeight + nodeGap) - nodeGap),
      nodeHeight
    )
    const svgW = Math.max(320, sortedGroups.length * (nodeWidth + groupGap) - groupGap + pad * 2)
    const svgH = legendH + maxGroupH + pad * 2
    const nodes: {
      step: DagStepDetail
      x: number
      y: number
      w: number
      h: number
      group: number
      parallel: boolean
    }[] = []

    sortedGroups.forEach(([groupId, groupSteps], groupIndex) => {
      const x = pad + groupIndex * (nodeWidth + groupGap)
      const groupH = groupSteps.length * (nodeHeight + nodeGap) - nodeGap
      const startY = legendH + pad + (maxGroupH - groupH) / 2
      groupSteps.forEach((step, stepIndex) => {
        nodes.push({
          step,
          x,
          y: startY + stepIndex * (nodeHeight + nodeGap),
          w: nodeWidth,
          h: nodeHeight,
          group: groupId,
          parallel: groupSteps.length > 1,
        })
      })
    })

    const byGroup = sortedGroups.map(([groupId]) => nodes.filter((node) => node.group === groupId))
    const lines: {
      d: string
      parallel: boolean
      arrow: boolean
    }[] = []
    for (let i = 0; i < byGroup.length - 1; i++) {
      const current = byGroup[i]
      const next = byGroup[i + 1]
      const isFan = current.length > 1 || next.length > 1

      if (!isFan) {
        const from = current[0]
        const to = next[0]
        const x1 = from.x + from.w
        const y1 = from.y + from.h / 2
        const x2 = to.x
        const y2 = to.y + to.h / 2
        lines.push({
          d: `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`,
          parallel: false,
          arrow: true,
        })
        continue
      }

      const currentYs = current.map((node) => node.y + node.h / 2)
      const nextYs = next.map((node) => node.y + node.h / 2)
      const busX = (current[0].x + current[0].w + next[0].x) / 2
      lines.push({
        d: `M ${busX} ${Math.min(...currentYs, ...nextYs)} L ${busX} ${Math.max(...currentYs, ...nextYs)}`,
        parallel: true,
        arrow: false,
      })
      current.forEach((from) => {
        const y = from.y + from.h / 2
        lines.push({
          d: `M ${from.x + from.w} ${y} L ${busX} ${y}`,
          parallel: true,
          arrow: false,
        })
      })
      next.forEach((to) => {
        const y = to.y + to.h / 2
        lines.push({
          d: `M ${busX} ${y} L ${to.x} ${y}`,
          parallel: true,
          arrow: true,
        })
      })
    }

    return { nodes, lines, svgW, svgH }
  }, [steps])

  return (
    <div>
      {/* 图例 */}
      <div className="flex items-center gap-5 pb-2 border-b border-gray-200 mb-2">
        {DAG_LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-4 h-3 rounded border flex items-center justify-center"
              style={{ background: item.color, borderColor: item.border }}
            >
              {item.label === '并行分组' ? (
                <div className="w-3 border-t border-dashed" style={{ borderColor: item.border }} />
              ) : (
                <div className="w-3 border-t border-solid" style={{ borderColor: item.border }} />
              )}
            </div>
            <span className="text-[10px] text-gray-500">
              <span className="font-semibold" style={{ color: item.border }}>{item.label}</span>
              {' — '}{item.desc}
            </span>
          </div>
        ))}
      </div>

      {/* SVG 图 */}
      <div className="overflow-x-auto py-1">
        <svg width={Math.max(svgW, 300)} height={svgH} className="block">
          <defs>
            <marker id="editor-dag-arrow" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <polygon points="0 0, 7 2.5, 0 5" fill="#3b82f6" />
            </marker>
            <marker id="editor-dag-arrow-parallel" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <polygon points="0 0, 7 2.5, 0 5" fill="#10b981" />
            </marker>
          </defs>
          {/* 连接线 */}
          {lines.map((l, i) => (
            <path
              key={i}
              d={l.d}
              fill="none"
              stroke={l.parallel ? '#10b981' : '#3b82f6'}
              strokeWidth={1.5}
              strokeDasharray={l.parallel ? '4,3' : 'none'}
              opacity={0.6}
              markerEnd={l.arrow ? (l.parallel ? 'url(#editor-dag-arrow-parallel)' : 'url(#editor-dag-arrow)') : undefined}
            />
          ))}
          {/* 节点 */}
          {nodes.map((node) => (
            <g key={node.step.id}>
              <rect
                x={node.x} y={node.y}
                width={node.w} height={node.h}
                rx={6} ry={6}
                fill={node.parallel ? '#d1fae5' : '#eff6ff'}
                stroke={node.parallel ? '#10b981' : '#3b82f6'}
                strokeWidth={1.5}
              />
              <text
                x={node.x + node.w / 2} y={node.y + node.h / 2 - 3}
                textAnchor="middle" dominantBaseline="central"
                fill={node.parallel ? '#065f46' : '#1e40af'}
                fontSize={9}
                fontFamily="monospace"
                fontWeight="600"
              >
                {node.step.name.length > 12 ? `${node.step.name.slice(0, 11)}…` : node.step.name}
              </text>
              <text
                x={node.x + node.w / 2} y={node.y + node.h / 2 + 9}
                textAnchor="middle" dominantBaseline="central"
                fill={node.parallel ? '#047857' : '#2563eb'}
                fontSize={8}
                fontFamily="monospace"
              >
                组 {node.group}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

// ================================================================
// 标准执行请求序列化
// ================================================================

export interface DagExecutionRequest {
  experiment_id: string
  title: string
  steps: DagStepDetail[]
  created_at: string
  execution_mode: 'sequential' | 'parallel' | 'hybrid'
  priority?: 'high' | 'medium' | 'low'
}

function serializeDagForExecution(steps: DagStepDetail[]): DagExecutionRequest {
  const allGroups = new Set(steps.map((s) => s.parallelGroup ?? 0))
  const mode: 'sequential' | 'parallel' | 'hybrid' =
    allGroups.size === 1 ? 'sequential' : 'hybrid'
  return {
    experiment_id: `exp-${Date.now()}`,
    title: steps[0]?.name ?? '未命名实验',
    steps,
    created_at: new Date().toISOString(),
    execution_mode: mode,
  }
}

// ================================================================
// 生成执行计划报告
// ================================================================

function generateExecutionPlan(steps: DagStepDetail[]): string {
  const lines: string[] = ['# 实验执行计划', '']

  steps.forEach((step, i) => {
    lines.push(`## 步骤 ${i + 1}：${step.name}`)
    lines.push('')

    if (step.description) {
      lines.push(`**说明**：${step.description}`)
      lines.push('')
    }

    if (step.goals.length > 0) {
      lines.push('**执行目标**：')
      step.goals.forEach((g) => lines.push(`- ${g}`))
      lines.push('')
    }

    if (step.instrumentParams.length > 0) {
      lines.push('**仪器参数**：')
      step.instrumentParams.forEach((p) =>
        lines.push(`- \`${p.name || p.key}\` = **${p.value}** ${p.unit || ''}`)
      )
      lines.push('')
    }

    if (step.prerequisites.length > 0) {
      lines.push('**前置条件**：')
      step.prerequisites.forEach((p) => lines.push(`- ${p}`))
      lines.push('')
    }

    if (step.parallelGroup > 0) {
      lines.push(`> **并行组**：${step.parallelGroup}（同组内步骤可并行执行）`)
    } else {
      lines.push('> **执行模式**：串行（等待前置步骤完成）')
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  })

  const ts = new Date().toLocaleString('zh-CN')
  lines.push(`*计划生成时间：${ts}*`)

  return lines.join('\n')
}

// ================================================================
// 执行确认对话框组件
// ================================================================

function ConfirmExecutionDialog({
  steps,
  show,
  onClose,
  onConfirm,
}: {
  steps: DagStepDetail[]
  show: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[420px] rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        {/* 标题 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 border border-red-100">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800">确认执行实验</div>
            <div className="text-xs text-gray-400">此操作将锁定当前会话并启动监控</div>
          </div>
        </div>

        {/* 内容 */}
        <div className="px-5 py-4 space-y-3">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-1.5">
            <div className="text-xs text-gray-500">实验步骤概览</div>
            {steps.slice(0, 5).map((step, i) => (
              <div key={step.id} className="flex items-center gap-2 text-xs text-gray-700">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="font-medium truncate">{step.name}</span>
                {step.parallelGroup > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded shrink-0">
                    并行 {step.parallelGroup}
                  </span>
                )}
              </div>
            ))}
            {steps.length > 5 && (
              <div className="text-xs text-gray-400 pl-7">... 还有 {steps.length - 5} 个步骤</div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700 leading-relaxed">
              <strong>执行后将发生以下变化：</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>当前对话将被锁定，无法继续发送消息</li>
                <li>系统将创建新的监控会话窗口</li>
                <li>实验舱状态将切换为「运行中」</li>
                <li>可在左侧栏「活跃实验」查看进度</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 操作 */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="cursor-pointer rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            确认执行
          </button>
        </div>
      </div>
    </div>
  )
}

// ================================================================
// 主组件
// ================================================================

export function DagEditor({
  initialSteps,
  onConfirm,
  onCancel,
  onStartExecution,
  onRegenerate,
  readOnly = false,
}: DagEditorProps & {
  /** 点击"开始执行"时的回调 */
  onStartExecution?: (request: DagExecutionRequest) => void
  /** 点击"重新生成描述"时的回调，传入修改后的 DAG 描述 */
  onRegenerate?: (regeneratePrompt: string) => void
}) {
  const [steps, setSteps] = useState<DagStepDetail[]>(
    initialSteps?.map(dagStepToDetail) ?? [defaultStepDetail()]
  )
  const [previewMode, setPreviewMode] = useState(false)
  const [isPlanReady, setIsPlanReady] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const updateStep = useCallback(
    (index: number, updated: DagStepDetail) => {
      setSteps((prev) => prev.map((s, i) => (i === index ? updated : s)))
      setIsPlanReady(false)
    },
    []
  )

  const deleteStep = useCallback((index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index))
    setIsPlanReady(false)
  }, [])

  const addStep = useCallback(
    (afterIndex: number) => {
      setSteps((prev) => {
        const newSteps = [...prev]
        const afterGroup = prev[afterIndex]?.parallelGroup ?? 0
        newSteps.splice(afterIndex + 1, 0, defaultStepDetail('新步骤', afterGroup))
        return newSteps
      })
      setIsPlanReady(false)
    },
    []
  )

  const handleConfirm = useCallback(() => {
    const plan = generateExecutionPlan(steps)
    onConfirm?.(steps, plan)
    setIsPlanReady(true)
  }, [steps, onConfirm])

  const handleStartExecution = useCallback(() => {
    if (steps.length === 0) return
    const request = serializeDagForExecution(steps)
    onStartExecution?.(request)
  }, [steps, onStartExecution])

  const handleRegenerate = useCallback(() => {
    if (!onRegenerate) return
    const dagDesc = steps
      .map(
        (s, i) =>
          `${i + 1}. **${s.name}**\n   说明: ${s.description || '无'}\n   目标: ${s.goals.join('、') || '无'}\n   参数: ${s.instrumentParams.map((p) => `${p.name || p.key}=${p.value}${p.unit || ''}`).join(', ') || '无'}\n   并行组: ${s.parallelGroup}`
      )
      .join('\n')
    const prompt = `请根据以下修改后的实验 DAG 步骤，重新生成完整的实验设计方案描述：\n\n${dagDesc}\n\n请用 Markdown 格式描述实验流程，重点说明每个步骤的科学目标。`
    onRegenerate(prompt)
  }, [steps, onRegenerate])

  const maxGroup = Math.max(0, ...steps.map((s) => s.parallelGroup ?? 0))

  // ================================================================
  // 预览模式
  // ================================================================
  if (previewMode) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/30 overflow-hidden my-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-100/50 border-b border-blue-200">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-700">DAG 执行计划预览</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setPreviewMode(false)}
              className="cursor-pointer flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              返回编辑
            </button>
            {!readOnly && steps.length > 0 && (
              <button
                onClick={() => setShowConfirmDialog(true)}
                className="cursor-pointer flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors"
              >
                <Play className="w-3 h-3" />
                执行实验
              </button>
            )}
          </div>
        </div>
        <div className="p-4">
          <DagPreviewWithLegend steps={steps} />
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="text-xs font-medium text-gray-500 mb-2">执行步骤</div>
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{step.name}</div>
                  {step.description && (
                    <div className="text-xs text-gray-500 mt-0.5">{step.description}</div>
                  )}
                  {step.goals.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {step.goals.map((g, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded border border-green-200"
                        >
                          <CheckCircle className="w-2.5 h-2.5" />
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                  {step.instrumentParams.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {step.instrumentParams.map((p, j) => (
                        <span key={j} className="text-[10px] font-mono text-gray-600">
                          {p.name || p.key}: {p.value}
                          {p.unit || ''}
                        </span>
                      ))}
                    </div>
                  )}
                  {step.parallelGroup > 0 && (
                    <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded border border-green-200">
                      并行组 {step.parallelGroup}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ================================================================
  // 编辑模式
  // ================================================================
  return (
    <>
    <div className="rounded-xl border border-blue-200 bg-blue-50/30 overflow-hidden my-2">
      {/* 头部 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-100/50 border-b border-blue-200">
        <FileText className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-semibold text-blue-700">
          {readOnly ? '实验执行计划' : 'DAG 实验步骤编辑器'}
        </span>
        <span className="text-xs text-blue-500">
          {steps.length} 个步骤 · {maxGroup + 1} 个并行组
        </span>
        {isPlanReady && (
          <span className="ml-2 flex items-center gap-1 text-[10px] text-green-600 font-medium">
            <CheckCircle className="w-3 h-3" />
            计划就绪
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          {!readOnly && (
            <button
              onClick={() => setSteps((prev) => [...prev, defaultStepDetail()])}
              className="cursor-pointer flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-3 h-3" />
              添加步骤
            </button>
          )}
          <button
            onClick={() => setPreviewMode(true)}
            className="cursor-pointer flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-3 h-3" />
            预览计划
          </button>
          {!readOnly && onCancel && (
            <button
              onClick={onCancel}
              className="cursor-pointer flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3 h-3" />
              取消
            </button>
          )}
        </div>
      </div>

      {/* 步骤编辑器列表 */}
      <div className="p-3 space-y-1">
        <DagPreviewWithLegend steps={steps} />

        {steps.map((step, i) => (
          <div key={step.id} className="flex items-start gap-1">
            <StepEditor
              step={step}
              onUpdate={(updated) => updateStep(i, updated)}
              onDelete={() => deleteStep(i)}
              index={i}
              readOnly={readOnly}
            />
            {!readOnly && (
              <button
                onClick={() => addStep(i)}
                className="cursor-pointer mt-2 p-1 text-gray-300 hover:text-blue-500 transition-colors"
                title="在此步骤后添加"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {steps.length === 0 && (
          <div className="text-center py-6 text-sm text-gray-400">
            暂无步骤，请点击"添加步骤"
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {!readOnly && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-blue-100 bg-blue-50/30">
          {/* 重新生成描述 */}
          {steps.length > 0 && onRegenerate && (
            <button
              onClick={handleRegenerate}
              className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              title="将修改后的 DAG 发回 AI，重新生成描述"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重新生成描述
            </button>
          )}

          {/* 右侧：生成计划 + 开始执行 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleConfirm}
              disabled={steps.length === 0}
              className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-4 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText className="w-3.5 h-3.5" />
              生成执行计划
            </button>
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={steps.length === 0}
              className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              title="锁定 DAG 并启动异步实验执行监控"
            >
              <Play className="w-3.5 h-3.5" />
              执行实验
            </button>
          </div>
        </div>
      )}
    </div>

    {/* 执行确认对话框 */}
    <ConfirmExecutionDialog
      steps={steps}
      show={showConfirmDialog}
      onClose={() => setShowConfirmDialog(false)}
      onConfirm={handleStartExecution}
    />
    </>
  )
}
