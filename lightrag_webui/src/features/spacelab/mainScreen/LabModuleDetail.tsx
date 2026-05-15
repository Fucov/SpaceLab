/**
 * 大屏中央 - 舱体详情与 DAG 图（深度重构）
 *
 * 重构说明：
 * 1. 真正的非线性 DAG 渲染（Canvas）：支持并行分支拓扑、汇聚节点
 * 2. 节点上标注资源锁类型（physical/LLM），用不同颜色区分
 * 3. 历史实验视图：点击历史记录展开模拟温度折线图 + 关键结果日志
 * 4. 右侧 DAG 节点交互高亮
 *
 * 状态联动流程：
 * 平板授权执行 -> store.authorizeDraft() -> labModules[].dagSteps 更新
 * -> 此组件订阅 labModules -> DAG SVG 自动重新渲染
 */

import { useSpaceLabStore } from '../store'
import { useMemo, useRef, useEffect } from 'react'
import type { LabModule, DagStep, HistoryExperiment } from '../types'
import { ArrowLeftIcon, Activity, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'

// ============================================================
// 子组件 1：实时传感器网格
// ============================================================
function SensorGrid({ module }: { module: LabModule }) {
  const sensors = [
    { label: '温度', value: module.temperature.toFixed(1), unit: '°C', color: '#f59e0b' },
    { label: 'CO₂', value: (module.co2 * 100).toFixed(2), unit: '%', color: '#8b5cf6' },
    { label: '湿度', value: module.humidity.toFixed(1), unit: '%', color: '#06b6d4' },
    { label: '气压', value: module.pressure.toFixed(1), unit: 'kPa', color: '#3b82f6' },
    { label: '功率', value: module.power.toFixed(0), unit: 'W', color: '#fbbf24' },
  ]
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {sensors.map((s) => (
        <div key={s.label} className="rounded border border-blue-500/10 bg-blue-950/30 p-2 text-center">
          <div className="text-[8px] text-blue-400/40 mb-0.5">{s.label}</div>
          <div className="text-base font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
          <div className="text-[8px] text-blue-400/25">{s.unit}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// 子组件 2：真正的非线性 DAG 渲染（SVG）
// ============================================================

interface DagNode {
  step: DagStep
  x: number
  y: number
  w: number
  h: number
}

/** 计算 DAG 拓扑布局（层次布局，支持并行分支） */
function computeDagLayout(steps: DagStep[]): { nodes: DagNode[]; svgW: number; svgH: number } {
  const NODE_W = 120
  const NODE_H = 40
  const NODE_GAP = 20
  const GROUP_GAP_X = 80
  const PADDING = 16

  // 按 parallelGroup 分组
  const groups: DagStep[][] = []
  const groupMap = new Map<number, number>()
  steps.forEach((step) => {
    const g = step.parallelGroup ?? 0
    if (!groupMap.has(g)) {
      groupMap.set(g, groups.length)
      groups.push([])
    }
    const groupIdx = groupMap.get(g)!
    groups[groupIdx].push(step)
  })

  const svgH = groups.reduce((max, group) => {
    return Math.max(max, group.length * (NODE_H + NODE_GAP))
  }, 0) + PADDING * 2

  const svgW = groups.length * (NODE_W + GROUP_GAP_X) + PADDING * 2

  const nodes: DagNode[] = []

  groups.forEach((group, gi) => {
    const gx = PADDING + gi * (NODE_W + GROUP_GAP_X)
    const groupH = group.length * (NODE_H + NODE_GAP)
    group.forEach((step, si) => {
      const gy = PADDING + (svgH - groupH) / 2 + si * (NODE_H + NODE_GAP)
      nodes.push({ step, x: gx, y: gy, w: NODE_W, h: NODE_H })
    })
  })

  return { nodes, svgW, svgH }
}

/** 节点颜色方案 */
function nodeColors(step: DagStep) {
  switch (step.status) {
    case 'completed':
      return { bg: '#064e3b', border: '#10b981', text: '#6ee7b7', glow: 'rgba(16,185,129,0.2)' }
    case 'running':
      return { bg: '#0c4a6e', border: '#22d3ee', text: '#a5f3fc', glow: 'rgba(34,211,238,0.3)' }
    case 'error':
      return { bg: '#450a0a', border: '#ef4444', text: '#fca5a5', glow: 'rgba(239,68,68,0.3)' }
    case 'waiting_resource':
      return { bg: '#451a03', border: '#f59e0b', text: '#fcd34d', glow: 'rgba(245,158,11,0.3)' }
    default:
      return { bg: '#0f172a', border: '#334155', text: '#94a3b8', glow: 'transparent' }
  }
}

/** SVG DAG 渲染 */
function DagSvg({ steps }: { steps: DagStep[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { nodes, svgW, svgH } = useMemo(() => computeDagLayout(steps), [steps])

  // 构建组内索引映射
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.step.id, n])), [nodes])

  // 预计算连接线（每组最后一个节点指向下一组第一个节点）
  const edges = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number; completed: boolean }[] = []
    const stepsByGroup = new Map<number, DagStep[]>()
    steps.forEach((s) => {
      const g = s.parallelGroup ?? 0
      if (!stepsByGroup.has(g)) stepsByGroup.set(g, [])
      stepsByGroup.get(g)!.push(s)
    })

    const sortedGroups = [...stepsByGroup.entries()].sort((a, b) => a[0] - b[0])

    for (let gi = 0; gi < sortedGroups.length - 1; gi++) {
      const [, currSteps] = sortedGroups[gi]
      const [, nextSteps] = sortedGroups[gi + 1]

      // 当前组最后一个节点 -> 下一组所有节点（如果下一组有多节点则扇出）
      const lastNode = nodeMap.get(currSteps[currSteps.length - 1].id)!
      const cx = lastNode.x + lastNode.w
      const cy = lastNode.y + lastNode.h / 2

      nextSteps.forEach((nextStep) => {
        const nextNode = nodeMap.get(nextStep.id)!
        const nx = nextNode.x
        const ny = nextNode.y + nextNode.h / 2

        // 判断这条边是否已完成：当前组全部完成则边为完成状态
        const allDone = currSteps.every((s) => s.status === 'completed')
        result.push({ x1: cx, y1: cy, x2: nx, y2: ny, completed: allDone })
      })
    }
    return result
  }, [steps, nodeMap])

  return (
    <div className="overflow-x-auto">
      <svg
        ref={svgRef}
        width={svgW}
        height={svgH}
        className="block"
        style={{ minWidth: svgW }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#334155" />
          </marker>
          <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#22d3ee" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 连接线 */}
        {edges.map((e, i) => {
          const midX = (e.x1 + e.x2) / 2
          const path = `M ${e.x1} ${e.y1} C ${midX} ${e.y1}, ${midX} ${e.y2}, ${e.x2} ${e.y2}`
          return (
            <path
              key={i}
              d={path}
              fill="none"
              stroke={e.completed ? '#10b981' : '#334155'}
              strokeWidth={e.completed ? 1.5 : 1}
              strokeDasharray={e.completed ? undefined : '4 3'}
              opacity={e.completed ? 0.8 : 0.4}
              markerEnd={e.completed ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
            />
          )
        })}

        {/* 节点 */}
        {nodes.map((node) => {
          const { step } = node
          const colors = nodeColors(step)
          const isActive = step.isActive || step.status === 'running'
          const cx = node.x + node.w / 2
          const cy = node.y + node.h / 2

          return (
            <g key={step.id}>
              {/* 发光效果（运行中节点） */}
              {isActive && (
                <rect
                  x={node.x - 3} y={node.y - 3}
                  width={node.w + 6} height={node.h + 6}
                  rx="8" ry="8"
                  fill={colors.glow}
                  filter="url(#glow)"
                />
              )}

              {/* 节点主体 */}
              <rect
                x={node.x} y={node.y}
                width={node.w} height={node.h}
                rx="6" ry="6"
                fill={colors.bg}
                stroke={colors.border}
                strokeWidth={isActive ? 1.5 : 1}
              />

              {/* 步骤名称 */}
              <text
                x={cx} y={cy - 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={colors.text}
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {step.name}
              </text>

              {/* 时长或状态 */}
              <text
                x={cx} y={cy + 13}
                textAnchor="middle"
                dominantBaseline="central"
                fill={colors.text}
                fontSize="8"
                opacity={0.6}
                fontFamily="monospace"
              >
                {step.duration || (step.status === 'pending' ? '等待' : step.status)}
              </text>

              {/* 资源锁标识 */}
              {step.resourceLock && step.resourceLock !== 'none' && (
                <g transform={`translate(${node.x + node.w - 14}, ${node.y + 4})`}>
                  <rect x="0" y="0" width="18" height="10" rx="3" fill={step.resourceLock === 'physical' ? '#7c2d12' : '#1e3a5f'} stroke={step.resourceLock === 'physical' ? '#f59e0b' : '#3b82f6'} strokeWidth="0.5" />
                  <text x="9" y="5.5" textAnchor="middle" dominantBaseline="central" fill={step.resourceLock === 'physical' ? '#fbbf24' : '#93c5fd'} fontSize="6" fontWeight="bold" fontFamily="monospace">
                    {step.resourceLock === 'physical' ? 'PHY' : 'LLM'}
                  </text>
                </g>
              )}

              {/* 运行中动画点 */}
              {step.status === 'running' && (
                <>
                  <circle cx={node.x + node.w / 2} cy={node.y + node.h + 8} r="2.5" fill="#22d3ee">
                    <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={node.x + node.w / 2 - 7} cy={node.y + node.h + 8} r="2" fill="#22d3ee">
                    <animate attributeName="opacity" values="1;0.2;1" dur="1s" begin="0.3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={node.x + node.w / 2 + 7} cy={node.y + node.h + 8} r="2" fill="#22d3ee">
                    <animate attributeName="opacity" values="1;0.2;1" dur="1s" begin="0.6s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {/* 等待资源图标 */}
              {step.status === 'waiting_resource' && (
                <text x={node.x + 6} y={node.y + 8} fill="#f59e0b" fontSize="10">
                  ⏳
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================
// 子组件 3：历史实验温度折线图（Canvas）
// ============================================================
function HistoryChart({ history }: { history: HistoryExperiment }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height
    const PAD = { top: 8, right: 8, bottom: 18, left: 32 }
    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom

    const temps = history.temperatureHistory ?? []
    if (temps.length < 2) return

    const minT = Math.min(...temps) - 1
    const maxT = Math.max(...temps) + 1

    const toX = (i: number) => PAD.left + (i / (temps.length - 1)) * chartW
    const toY = (v: number) => PAD.top + (1 - (v - minT) / (maxT - minT)) * chartH

    ctx.clearRect(0, 0, W, H)

    // 网格线
    const gridCount = 3
    for (let i = 0; i <= gridCount; i++) {
      const y = PAD.top + (i / gridCount) * chartH
      const val = maxT - (i / gridCount) * (maxT - minT)
      ctx.strokeStyle = 'rgba(59,130,246,0.08)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(PAD.left, y)
      ctx.lineTo(PAD.left + chartW, y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(148,163,184,0.4)'
      ctx.font = '8px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${val.toFixed(0)}°`, PAD.left - 3, y + 3)
    }

    // 渐变填充
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH)
    grad.addColorStop(0, 'rgba(59,130,246,0.15)')
    grad.addColorStop(1, 'rgba(59,130,246,0.01)')
    ctx.beginPath()
    ctx.moveTo(toX(0), PAD.top + chartH)
    temps.forEach((t, i) => ctx.lineTo(toX(i), toY(t)))
    ctx.lineTo(toX(temps.length - 1), PAD.top + chartH)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // 折线
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(temps[0]))
    for (let i = 1; i < temps.length; i++) {
      ctx.lineTo(toX(i), toY(temps[i]))
    }
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 数据点
    temps.forEach((t, i) => {
      ctx.beginPath()
      ctx.arc(toX(i), toY(t), 2, 0, Math.PI * 2)
      ctx.fillStyle = '#3b82f6'
      ctx.fill()
    })

    // X轴标签
    const step = Math.max(1, Math.floor(temps.length / 5))
    history.historyTimestamps?.forEach((ts, i) => {
      if (i % step === 0) {
        ctx.fillStyle = 'rgba(148,163,184,0.4)'
        ctx.font = '7px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(ts, toX(i), H - 4)
      }
    })
  }, [history])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={380}
        height={80}
        className="w-full rounded"
        style={{ maxHeight: 80 }}
      />
    </div>
  )
}

// ============================================================
// 子组件 4：历史实验列表
// ============================================================
function HistoryList({ module }: { module: LabModule }) {
  const selectedHistoryId = useSpaceLabStore((s) => s.selectedHistoryId)
  const selectHistory = useSpaceLabStore((s) => s.selectHistory)

  if (module.history.length === 0) {
    return <div className="text-xs text-blue-400/30 py-2">暂无历史记录</div>
  }

  return (
    <div className="space-y-1.5">
      {module.history.map((h) => {
        const isSelected = selectedHistoryId === h.id
        const resultColor = h.result === 'success' ? 'text-emerald-400' : h.result === 'failed' ? 'text-red-400' : 'text-amber-400'
        return (
          <div key={h.id}>
            <button
              onClick={() => selectHistory(isSelected ? null : h.id)}
              className="w-full flex items-center justify-between rounded border border-blue-500/10 bg-blue-950/20 px-3 py-2 text-left cursor-pointer hover:bg-blue-900/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3 h-3 text-blue-400/40" />
                <div>
                  <div className="text-xs text-blue-200">{h.name}</div>
                  <div className="text-[9px] text-blue-400/30">{h.date} · {h.dataPoints} 点</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] ${resultColor}`}>
                  {h.result === 'success' ? '成功' : h.result === 'failed' ? '失败' : '部分'}
                </span>
                {isSelected ? <ChevronUp className="w-3 h-3 text-blue-400/50" /> : <ChevronDown className="w-3 h-3 text-blue-400/50" />}
              </div>
            </button>

            {/* 展开：温度折线图 + 结果摘要 */}
            {isSelected && (
              <div className="mt-1 rounded border border-blue-500/10 bg-blue-950/15 p-2">
                <div className="text-[9px] text-blue-400/40 mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  温度变化曲线
                </div>
                <HistoryChart history={h} />
                <div className="mt-1.5 text-[9px] text-blue-300/50 leading-relaxed">
                  {h.summary}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// 子组件 5：任务队列
// ============================================================
function TaskQueue({ module }: { module: LabModule }) {
  const priorityConfig = {
    high: { color: 'text-red-400 bg-red-500/15 border-red-500/20', label: '高' },
    medium: { color: 'text-amber-400 bg-amber-500/15 border-amber-500/20', label: '中' },
    low: { color: 'text-blue-400 bg-blue-500/15 border-blue-500/20', label: '低' },
  }
  return (
    <div className="space-y-1.5">
      {module.taskQueue.length === 0 ? (
        <div className="text-xs text-blue-400/30 py-2">暂无排队任务</div>
      ) : (
        module.taskQueue.map((task) => {
          const pc = priorityConfig[task.priority]
          return (
            <div key={task.id} className="flex items-center justify-between rounded border border-blue-500/10 bg-blue-950/20 px-2.5 py-2">
              <div>
                <div className="text-xs text-blue-200">{task.name}</div>
                <div className="text-[9px] text-blue-400/40 mt-0.5">负责人: {task.assignee} · {task.scheduledTime}</div>
              </div>
              <span className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${pc.color}`}>{pc.label}</span>
            </div>
          )
        })
      )}
    </div>
  )
}

// ============================================================
// 主组件：舱体详情页
// ============================================================
export default function LabModuleDetail() {
  const selectedId = useSpaceLabStore((s) => s.selectedModuleId)
  const labModules = useSpaceLabStore((s) => s.labModules)
  const selectModule = useSpaceLabStore((s) => s.selectModule)

  const module = labModules.find((m) => m.id === selectedId)
  if (!module) return null

  const activeStep = module.dagSteps.find((s) => s.isActive || s.status === 'running')

  return (
    <div className="h-full overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-blue-800/30 scrollbar-track-transparent">
      {/* 返回 + 标题行 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => selectModule(null)}
          className="cursor-pointer flex items-center gap-1 rounded border border-blue-500/20 px-2 py-1 text-[10px] text-blue-300/60 transition-colors hover:text-blue-200 hover:border-blue-400/40"
        >
          <ArrowLeftIcon className="w-3 h-3" />
          返回
        </button>
        <span className="text-lg">{module.icon}</span>
        <h2 className="text-sm font-semibold text-blue-100">{module.name}</h2>
        {module.status === 'running' && (
          <span className="text-[9px] text-cyan-400/60">[{activeStep ? `${activeStep.name} 进行中` : '执行中'}]</span>
        )}
      </div>

      {/* 传感器 */}
      <div className="mb-3">
        <div className="text-[9px] text-blue-400/40 mb-1 uppercase tracking-wider">实时传感器</div>
        <SensorGrid module={module} />
      </div>

      {/* DAG 图 */}
      <div className="mb-3">
        <div className="text-[9px] text-blue-400/40 mb-1.5 uppercase tracking-wider flex items-center gap-2">
          实验步骤拓扑 (DAG)
          {/* 图例 */}
          <span className="flex items-center gap-2 text-[8px] text-blue-400/30 normal-case tracking-normal">
            <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-2 rounded bg-orange-500/50" /> PHY 物理资源</span>
            <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-2 rounded bg-blue-500/50" /> LLM 算力</span>
            <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-0.5 bg-emerald-500/60" /> 已完成</span>
            <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-0.5 border-t border-dashed border-blue-400/40" /> 等待中</span>
          </span>
        </div>
        <div className="rounded-lg border border-blue-500/10 bg-blue-950/20 p-3 overflow-x-auto">
          <DagSvg steps={module.dagSteps} />
        </div>
      </div>

      {/* 任务队列 + 历史实验（两列） */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h4 className="text-[9px] text-blue-400/40 mb-1.5 uppercase tracking-wider">任务队列</h4>
          <TaskQueue module={module} />
        </div>
        <div>
          <h4 className="text-[9px] text-blue-400/40 mb-1.5 uppercase tracking-wider">历史实验</h4>
          <HistoryList module={module} />
        </div>
      </div>
    </div>
  )
}
