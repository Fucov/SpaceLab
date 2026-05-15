/**
 * 大屏左侧 - 模块一：算力池 + 智能体调度中心
 *
 * 重构说明：
 * 1. 将原来三个独立算力节点合并为"核心算力池"统一展示
 * 2. 新增智能体调度中心面板：展示 LLM Token 速率、并发任务数、推理延迟
 * 3. 新增资源锁列表，标识当前被占用的物理/LLM 资源
 * 4. 保留告警区（AlertLog 独立为单独组件）
 */

import { useSpaceLabStore } from '../store'
import { useEffect, useState, useRef } from 'react'
import { Cpu, Gauge, Zap, Lock, BrainCircuit, Layers } from 'lucide-react'

/** 环形进度条（带动画） */
function MiniRing({ value, color, size = 52 }: { value: number; color: string; size?: number }) {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 80)
    return () => clearTimeout(t)
  }, [value])
  const r = (size - 6) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (animated / 100) * circumference
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
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

  // 每 2 秒模拟数值波动
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000)
    return () => clearInterval(id)
  }, [])

  const fluctuate = (v: number, range = 4) =>
    Math.max(0, Math.min(100, v + (Math.random() - 0.5) * range))

  const metrics = [
    { label: 'CPU', value: Math.round(fluctuate(pool.cpuUsagePercent)), color: '#3b82f6', icon: Cpu },
    { label: 'GPU', value: Math.round(fluctuate(pool.gpuUsagePercent)), color: '#22d3ee', icon: Layers },
    { label: 'RAM', value: Math.round(fluctuate(pool.ramUsagePercent)), color: '#10b981', icon: Gauge },
    { label: 'NET', value: Math.round(fluctuate(pool.networkUsagePercent)), color: '#8b5cf6', icon: Zap },
  ]

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[10px] font-semibold tracking-widest text-cyan-400/70 uppercase flex items-center gap-1">
        <Cpu className="w-3 h-3" />
        核心算力池
      </h3>

      {/* 资源总量 */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: 'CPU核心', val: pool.totalCpuCores, unit: '核' },
          { label: 'GPU单元', val: pool.totalGpuUnits, unit: '块' },
          { label: '总内存', val: pool.totalRamGB, unit: 'GB' },
          { label: '网络带宽', val: pool.networkBandwidthMbps, unit: 'Mbps' },
        ].map((item) => (
          <div key={item.label} className="rounded border border-blue-500/10 bg-blue-950/30 px-2 py-1.5">
            <div className="text-[9px] text-blue-400/40">{item.label}</div>
            <div className="text-sm font-bold font-mono text-blue-100">
              <AnimatedNumber value={item.val} />
              <span className="text-[9px] text-blue-400/40 ml-0.5">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 使用率环形图 */}
      <div className="grid grid-cols-4 gap-1">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-0.5">
            <div className="relative flex items-center justify-center">
              <MiniRing value={m.value} color={m.color} size={40} />
              <span className="absolute text-[9px] font-bold" style={{ color: m.color }}>
                {m.value}%
              </span>
            </div>
            <span className="text-[8px] text-blue-400/50">{m.label}</span>
          </div>
        ))}
      </div>

      {/* 温度 */}
      <div className="flex justify-between text-[9px] text-blue-400/30 px-1">
        <span>CPU {Math.round(pool.cpuTemp + (Math.random() - 0.5) * 3)}°C</span>
        <span>GPU {Math.round(pool.gpuTemp + (Math.random() - 0.5) * 4)}°C</span>
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
    <div className="flex flex-col gap-2">
      <h3 className="text-[10px] font-semibold tracking-widest text-cyan-400/70 uppercase flex items-center gap-1">
        <BrainCircuit className="w-3 h-3" />
        智能体调度中心
      </h3>

      {/* 三大指标 */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded border border-cyan-500/15 bg-cyan-950/20 px-2 py-2 text-center">
          <div className="text-[9px] text-cyan-400/50 mb-1">Token/s</div>
          <div className="text-lg font-bold font-mono text-cyan-300">
            <AnimatedNumber value={tokenRate} />
          </div>
          <div className="text-[8px] text-cyan-400/30">LLM消耗</div>
        </div>
        <div className="rounded border border-purple-500/15 bg-purple-950/20 px-2 py-2 text-center">
          <div className="text-[9px] text-purple-400/50 mb-1">并发</div>
          <div className="text-lg font-bold font-mono text-purple-300">{metrics.concurrentTasks}</div>
          <div className="text-[8px] text-purple-400/30">运行任务</div>
        </div>
        <div className="rounded border border-amber-500/15 bg-amber-950/20 px-2 py-2 text-center">
          <div className="text-[9px] text-amber-400/50 mb-1">延迟</div>
          <div className="text-lg font-bold font-mono text-amber-300">
            <AnimatedNumber value={latency} />
          </div>
          <div className="text-[8px] text-amber-400/30">ms P50</div>
        </div>
      </div>

      {/* 资源锁列表 */}
      <div>
        <div className="text-[9px] text-blue-400/40 mb-1 flex items-center gap-1">
          <Lock className="w-2.5 h-2.5" />
          当前资源锁 ({metrics.activeResourceLocks.length})
        </div>
        <div className="space-y-1">
          {metrics.activeResourceLocks.slice(0, 3).map((lock) => (
            <div key={lock.id} className="flex items-center gap-1.5 rounded border border-blue-500/10 bg-blue-950/20 px-2 py-1">
              {/* 资源类型图标 */}
              <span className={`text-[8px] font-bold px-1 rounded ${
                lock.type === 'physical'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {lock.type === 'physical' ? 'PHY' : 'LLM'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] text-blue-200 truncate">{lock.resourceName}</div>
                <div className="text-[8px] text-blue-400/30 truncate">{lock.holderTask}</div>
              </div>
              <div className="text-[8px] text-blue-400/40">{lock.moduleName}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ComputePanel() {
  return (
    <div className="flex flex-col gap-3">
      <ComputePoolPanel />
      <AgentMetricsPanel />
    </div>
  )
}
