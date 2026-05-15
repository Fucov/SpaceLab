/**
 * 大屏左侧 - 模块一：算力池 + 智能体调度中心
 *
 * 重构说明：
 * 1. 将原来三个独立算力节点合并为"核心算力池"统一展示
 * 2. 新增智能体调度中心面板：展示 LLM Token 速率、并发任务数、推理延迟
 * 3. 新增资源锁列表，标识当前被占用的物理/LLM 资源
 * 4. 字体已增大以保证大屏可读性
 */

import { useSpaceLabStore } from '../store'
import { useEffect, useState, useRef } from 'react'
import { Cpu, Gauge, Zap, Lock, BrainCircuit, Layers } from 'lucide-react'

/** 环形进度条（带动画） */
function MiniRing({ value, color, size = 56 }: { value: number; color: string; size?: number }) {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 80)
    return () => clearTimeout(t)
  }, [value])
  const r = (size - 8) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (animated / 100) * circumference
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
    </svg>
  )
}

/** 数字动画滚动 */
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  useEffect(() => {
    const diff = value - prevRef.current
    if (diff === 0) return
    const steps = 20
    const step = diff / steps
    let current = prevRef.current
    let count = 0
    const interval = setInterval(() => {
      current += step
      count++
      setDisplay(Math.round(current))
      if (count >= steps) {
        setDisplay(value)
        prevRef.current = value
        clearInterval(interval)
      }
    }, 20)
    return () => clearInterval(interval)
  }, [value])
  return <>{display}{suffix}</>
}

/** 核心算力池面板 */
function ComputePoolPanel() {
  const pool = useSpaceLabStore((s) => s.computePool)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000)
    return () => clearInterval(id)
  }, [])

  const fluctuate = (v: number, range = 4) =>
    Math.max(0, Math.min(100, v + (Math.random() - 0.5) * range))

  const metrics = [
    { label: 'CPU', value: Math.round(fluctuate(pool.cpuUsagePercent)), color: '#3b82f6', Icon: Cpu },
    { label: 'GPU', value: Math.round(fluctuate(pool.gpuUsagePercent)), color: '#22d3ee', Icon: Layers },
    { label: 'RAM', value: Math.round(fluctuate(pool.ramUsagePercent)), color: '#10b981', Icon: Gauge },
    { label: 'NET', value: Math.round(fluctuate(pool.networkUsagePercent)), color: '#8b5cf6', Icon: Zap },
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-bold tracking-widest text-cyan-400 uppercase">核心算力池</h3>
      </div>

      {/* 资源总量 */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'CPU核心', val: pool.totalCpuCores, unit: '核' },
          { label: 'GPU单元', val: pool.totalGpuUnits, unit: '块' },
          { label: '总内存', val: pool.totalRamGB, unit: 'GB' },
          { label: '网络带宽', val: pool.networkBandwidthMbps, unit: 'Mbps' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-blue-500/15 bg-blue-950/40 px-3 py-2.5">
            <div className="text-xs text-blue-400/50 mb-1">{item.label}</div>
            <div className="text-xl font-bold font-mono text-blue-100">
              <AnimatedNumber value={item.val} />
              <span className="text-xs text-blue-400/40 ml-1">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 使用率环形图 */}
      <div className="grid grid-cols-4 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-1.5">
            <div className="relative flex items-center justify-center">
              <MiniRing value={m.value} color={m.color} size={52} />
              <span className="absolute text-sm font-bold" style={{ color: m.color }}>
                {m.value}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <m.Icon className="w-3 h-3" style={{ color: m.color }} />
              <span className="text-xs font-semibold" style={{ color: m.color }}>{m.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 温度行 */}
      <div className="flex justify-between items-center bg-blue-950/30 rounded-lg px-3 py-2 border border-blue-500/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-xs text-blue-300/60">CPU</span>
          <span className="text-sm font-mono font-bold text-blue-100">
            {Math.round(pool.cpuTemp + (Math.random() - 0.5) * 3)}°C
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs text-blue-300/60">GPU</span>
          <span className="text-sm font-mono font-bold text-blue-100">
            {Math.round(pool.gpuTemp + (Math.random() - 0.5) * 4)}°C
          </span>
        </div>
      </div>
    </div>
  )
}

/** 智能体调度中心面板 */
function AgentMetricsPanel() {
  const metrics = useSpaceLabStore((s) => s.agentMetrics)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1500)
    return () => clearInterval(id)
  }, [])

  const tokenRate = Math.round(metrics.llmTokenRate + (Math.random() - 0.5) * 800)
  const latency = Math.round(metrics.inferenceLatencyMs + (Math.random() - 0.5) * 20)

  return (
    <div className="flex flex-col gap-3">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <BrainCircuit className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-bold tracking-widest text-cyan-400 uppercase">智能体调度</h3>
      </div>

      {/* 三大指标 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-3 py-3 text-center">
          <div className="text-xs text-cyan-400/60 mb-1.5">Token/s</div>
          <div className="text-2xl font-bold font-mono text-cyan-200">
            <AnimatedNumber value={tokenRate} />
          </div>
          <div className="text-xs text-cyan-400/40 mt-1">LLM消耗</div>
        </div>
        <div className="rounded-lg border border-purple-500/20 bg-purple-950/30 px-3 py-3 text-center">
          <div className="text-xs text-purple-400/60 mb-1.5">并发</div>
          <div className="text-2xl font-bold font-mono text-purple-200">{metrics.concurrentTasks}</div>
          <div className="text-xs text-purple-400/40 mt-1">运行任务</div>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/30 px-3 py-3 text-center">
          <div className="text-xs text-amber-400/60 mb-1.5">延迟</div>
          <div className="text-2xl font-bold font-mono text-amber-200">
            <AnimatedNumber value={latency} />
          </div>
          <div className="text-xs text-amber-400/40 mt-1">ms P50</div>
        </div>
      </div>

      {/* 资源锁列表 */}
      <div className="bg-blue-950/20 rounded-lg border border-blue-500/10 p-2.5">
        <div className="text-xs text-blue-400/50 mb-2 flex items-center gap-1.5">
          <Lock className="w-3 h-3" />
          当前资源锁 ({metrics.activeResourceLocks.length})
        </div>
        <div className="space-y-1.5">
          {metrics.activeResourceLocks.slice(0, 4).map((lock) => (
            <div key={lock.id} className="flex items-center gap-2.5 rounded border border-blue-500/10 bg-blue-950/30 px-2.5 py-2">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                lock.type === 'physical'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {lock.type === 'physical' ? 'PHY' : 'LLM'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-blue-200 truncate font-medium">{lock.resourceName}</div>
                <div className="text-xs text-blue-400/40 truncate">{lock.holderTask}</div>
              </div>
              <div className="text-xs text-blue-400/50 flex-shrink-0">{lock.moduleName}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ComputePanel() {
  return (
    <div className="flex flex-col gap-4">
      <ComputePoolPanel />
      <AgentMetricsPanel />
    </div>
  )
}
