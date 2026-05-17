/**
 * 大屏中央 - 舱体详情与 DAG 图
 *
 * 设计：清晰的横向层次布局、标签对比度高、历史实验可点击查看完整图表
 */

import { useSpaceLabStore } from '../store'
import { useMemo } from 'react'
import type { LabModule, DagStep, HistoryExperiment } from '../types'
import { ArrowLeftIcon, BarChart3, ChevronDown, ChevronUp, ExternalLink, FileText } from 'lucide-react'
import ExperimentResultViewer from '../ExperimentResultViewer'

// ================================================================
// 子组件 1：传感器网格
// ================================================================

function SensorGrid({ module }: { module: LabModule }) {
  const sensors = [
    { label: '温度', value: module.temperature.toFixed(1), unit: '°C', color: '#fbbf24' },
    { label: 'CO₂', value: (module.co2 * 100).toFixed(2), unit: '%', color: '#a78bfa' },
    { label: '湿度', value: module.humidity.toFixed(1), unit: '%', color: '#22d3ee' },
    { label: '气压', value: module.pressure.toFixed(1), unit: 'kPa', color: '#34d399' },
    { label: '功率', value: `${module.power}W`, unit: '', color: '#fb923c' },
  ]
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {sensors.map((s) => (
        <div key={s.label} className="rounded border border-white/10 bg-black/30 p-2 text-center">
          <div className="text-[9px] text-white/40 mb-0.5">{s.label}</div>
          <div className="text-base font-bold font-mono leading-tight" style={{ color: s.color }}>{s.value}</div>
          {s.unit && <div className="text-[8px] text-white/30 mt-0.5">{s.unit}</div>}
        </div>
      ))}
    </div>
  )
}

// ================================================================
// 子组件 2：DAG 横向流程图
// ================================================================

interface DagNode {
  step: DagStep
  x: number
  y: number
  w: number
  h: number
}

const NODE_W = 120
const NODE_H = 36
const NODE_GAP = 14
const GROUP_GAP_X = 72
const DAG_PAD = 12

function computeDagLayout(steps: DagStep[]) {
  const groupMap = new Map<number, DagStep[]>()
  steps.forEach((step) => {
    const g = step.parallelGroup ?? 0
    if (!groupMap.has(g)) groupMap.set(g, [])
    groupMap.get(g)!.push(step)
  })
  const sortedGroups = [...groupMap.entries()].sort((a, b) => a[0] - b[0])

  // SVG 高度 = 最大组的高度
  const maxGroupH = sortedGroups.reduce((max, [, group]) =>
    Math.max(max, group.length * (NODE_H + NODE_GAP) - NODE_GAP), 0)
  const svgH = maxGroupH + DAG_PAD * 2
  const svgW = sortedGroups.length * (NODE_W + GROUP_GAP_X) + DAG_PAD * 2

  const nodes: DagNode[] = []
  sortedGroups.forEach(([, group], gi) => {
    const gx = DAG_PAD + gi * (NODE_W + GROUP_GAP_X)
    const totalGroupH = group.length * (NODE_H + NODE_GAP) - NODE_GAP
    const startY = DAG_PAD + (maxGroupH - totalGroupH) / 2
    group.forEach((step, si) => {
      const gy = startY + si * (NODE_H + NODE_GAP)
      nodes.push({ step, x: gx, y: gy, w: NODE_W, h: NODE_H })
    })
  })

  return { nodes, svgW, svgH }
}

const DAG_COLORS = {
  completed:        { bg: '#1a2744', border: '#3b5998', text: '#c8d8f0', dot: '#5b8cd4' },
  running:          { bg: '#1a2d5a', border: '#3b82f6', text: '#93c5fd', dot: '#60a5fa' },
  error:            { bg: '#3b1a1a', border: '#dc2626', text: '#fca5a5', dot: '#f87171' },
  waiting_resource: { bg: '#3b2a1a', border: '#d97706', text: '#fcd34d', dot: '#fbbf24' },
  pending:          { bg: '#0f172a', border: '#334155', text: '#94a3b8', dot: '#64748b' },
}

function statusText(step: DagStep) {
  switch (step.status) {
    case 'running': return step.duration || '进行中'
    case 'completed': return step.duration || '完成'
    case 'error': return '异常'
    case 'waiting_resource': return '等待资源'
    default: return step.duration || '等待'
  }
}

function DagSvg({ steps }: { steps: DagStep[] }) {
  const { nodes, svgW, svgH } = useMemo(() => computeDagLayout(steps), [steps])

  const groupNodes = useMemo(() => {
    const map = new Map<number, DagNode[]>()
    nodes.forEach((n) => {
      const g = n.step.parallelGroup ?? 0
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(n)
    })
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [nodes])

  const edges = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number; completed: boolean }[] = []
    for (let gi = 0; gi < groupNodes.length - 1; gi++) {
      const [, prev] = groupNodes[gi]
      const [, next] = groupNodes[gi + 1]
      const last = prev[prev.length - 1]
      const first = next[0]
      const done = prev.every((n) => n.step.status === 'completed')
      result.push({
        x1: last.x + last.w,
        y1: last.y + last.h / 2,
        x2: first.x,
        y2: first.y + first.h / 2,
        completed: done,
      })
    }
    return result
  }, [groupNodes])

  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <svg width={svgW} height={svgH} style={{ minWidth: svgW }}>
        <defs>
          <marker id="dag-arr" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill="#475569" />
          </marker>
          <marker id="dag-arr-active" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill="#60a5fa" />
          </marker>
        </defs>

        {edges.map((e, i) => (
          <line key={i}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={e.completed ? '#60a5fa' : '#334155'}
            strokeWidth={e.completed ? 1.5 : 1}
            strokeDasharray={e.completed ? undefined : '4 3'}
            opacity={e.completed ? 0.9 : 0.4}
            markerEnd={e.completed ? 'url(#dag-arr-active)' : 'url(#dag-arr)'}
          />
        ))}

        {nodes.map((node) => {
          const c = DAG_COLORS[node.step.status] || DAG_COLORS.pending
          const active = node.step.status === 'running' || node.step.status === 'waiting_resource'

          return (
            <g key={node.step.id}>
              <rect
                x={node.x} y={node.y} width={node.w} height={node.h}
                rx="5" ry="5"
                fill={c.bg} stroke={c.border}
                strokeWidth={active ? 1.5 : 1}
              />
              <text
                x={node.x + node.w / 2} y={node.y + node.h / 2 - 4}
                textAnchor="middle" dominantBaseline="central"
                fill={c.text} fontSize="10" fontWeight="600"
                fontFamily="system-ui, sans-serif"
              >
                {node.step.name.length > 12 ? node.step.name.slice(0, 11) + '…' : node.step.name}
              </text>
              <text
                x={node.x + node.w / 2} y={node.y + node.h / 2 + 7}
                textAnchor="middle" dominantBaseline="central"
                fill={c.dot} fontSize="8" fontFamily="monospace"
              >
                {statusText(node.step)}
              </text>
              {node.step.status === 'running' && (
                <circle cx={node.x + node.w - 6} cy={node.y + 6} r="3" fill="#3b82f6" opacity="0.8">
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ================================================================
// 子组件 3：历史实验列表
// ================================================================

function HistoryList({ module }: { module: LabModule }) {
  const selectHistory = useSpaceLabStore((s) => s.selectHistory)

  if (module.history.length === 0) {
    return <div className="text-xs text-white/30 py-2">暂无历史记录</div>
  }

  const rc = (r: HistoryExperiment['result']) =>
    r === 'success' ? 'text-emerald-400' : r === 'failed' ? 'text-red-400' : 'text-amber-400'

  return (
    <div className="space-y-1.5">
      {module.history.map((h) => (
        <button
          key={h.id}
          onClick={() => selectHistory(h.id)}
          className="w-full flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2 text-left cursor-pointer hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-white/80 truncate">{h.name}</div>
              <div className="text-[9px] text-white/30 mt-0.5">{h.date} · {h.dataPoints.toLocaleString()} 点</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[9px] font-medium ${rc(h.result)}`}>
              {h.result === 'success' ? '成功' : h.result === 'failed' ? '失败' : '部分'}
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-white/30" />
          </div>
        </button>
      ))}
    </div>
  )
}

// ================================================================
// 子组件 4：任务队列
// ================================================================

function TaskQueue({ module }: { module: LabModule }) {
  const pc = {
    high:   { color: 'text-red-400 bg-red-500/15', label: '高' },
    medium: { color: 'text-amber-400 bg-amber-500/15', label: '中' },
    low:    { color: 'text-blue-400 bg-blue-500/15', label: '低' },
  }
  if (module.taskQueue.length === 0) {
    return <div className="text-xs text-white/30 py-2">暂无排队任务</div>
  }
  return (
    <div className="space-y-1.5">
      {module.taskQueue.map((task) => {
        const cfg = pc[task.priority]
        return (
          <div key={task.id} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-2.5 py-2">
            <div>
              <div className="text-xs text-white/80">{task.name}</div>
              <div className="text-[9px] text-white/30 mt-0.5">负责人: {task.assignee} · {task.scheduledTime}</div>
            </div>
            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${cfg.color}`}>{cfg.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ================================================================
// 主组件
// ================================================================

export default function LabModuleDetail() {
  const selectedId = useSpaceLabStore((s) => s.selectedModuleId)
  const labModules = useSpaceLabStore((s) => s.labModules)
  const selectModule = useSpaceLabStore((s) => s.selectModule)
  const selectedHistoryId = useSpaceLabStore((s) => s.selectedHistoryId)
  const selectHistory = useSpaceLabStore((s) => s.selectHistory)

  const module = labModules.find((m) => m.id === selectedId)
  const selectedHistory = selectedHistoryId
    ? labModules.flatMap((m) => m.history).find((h) => h.id === selectedHistoryId) ?? null
    : null

  const statusColor = module
    ? module.status === 'running' ? 'text-emerald-400'
      : module.status === 'completed' ? 'text-blue-400'
      : module.status === 'error' ? 'text-red-400'
      : 'text-white/40'
    : 'text-white/40'
  const statusLabel = module
    ? module.status === 'running' ? '运行中'
      : module.status === 'completed' ? '已完成'
      : module.status === 'error' ? '异常'
      : module.status === 'paused' ? '已暂停'
      : '待机'
    : ''

  return (
    <div className="flex flex-col h-full">
      {/* 返回 */}
      <div className="shrink-0 px-3 pt-3 pb-2">
        <button
          onClick={() => selectModule(null)}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 cursor-pointer transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          返回阵列表
        </button>
      </div>

      {module && (
        <>
          {/* 标题 */}
          <div className="shrink-0 px-3 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{module.icon}</span>
              <div>
                <div className="text-sm font-bold text-white">{module.name}</div>
                <div className="text-xs text-white/50">{module.currentTask}</div>
              </div>
              <div className="ml-auto text-right">
                <div className={`text-xs font-bold ${statusColor}`}>{statusLabel}</div>
                <div className="text-xs text-white/30">{module.progress}%</div>
              </div>
            </div>
          </div>

          {/* 传感器 */}
          <div className="shrink-0 px-3 pb-3">
            <SensorGrid module={module} />
          </div>

          {/* DAG */}
          <div className="shrink-0 px-3 pb-3">
            <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5">实验步骤流程</div>
            {module.dagSteps.length > 0 ? (
              <div className="rounded border border-white/10 bg-black/30 p-2">
                <DagSvg steps={module.dagSteps} />
              </div>
            ) : (
              <div className="rounded border border-dashed border-white/10 bg-black/20 p-6 flex flex-col items-center justify-center gap-2">
                <div className="text-white/20 text-2xl">🧪</div>
                <div className="text-xs text-white/40 text-center">暂无实验步骤</div>
                <div className="text-[10px] text-white/25 text-center">在左侧智能助手对话框中描述实验内容<br/>AI 将自动生成实验步骤 DAG</div>
              </div>
            )}
          </div>

          {/* 历史+队列 */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5">历史实验 ({module.history.length})</div>
              <HistoryList module={module} />
            </div>
            <div>
              <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5">任务队列 ({module.taskQueue.length})</div>
              <TaskQueue module={module} />
            </div>
          </div>
        </>
      )}

      {selectedHistory && (
        <ExperimentResultViewer
          experiment={selectedHistory}
          onClose={() => selectHistory(null)}
        />
      )}
    </div>
  )
}
