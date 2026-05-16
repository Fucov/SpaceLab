/**
 * 大屏左侧 - 算力池 + 智能体调度中心
 *
 * 设计原则：简洁克制、去掉花哨效果、以数据可读性为核心
 * - 去掉发光和渐变动画
 * - 使用柔和的中性蓝灰色调
 * - 字体清晰、层次分明
 */

import { useSpaceLabStore } from '../store'
import { useEffect, useState, useRef } from 'react'
import { Cpu, Gauge, Zap, Lock, BrainCircuit, Layers } from 'lucide-react'

function MiniRing({ value, color, size = 48 }: { value: number; color: string; size?: number }) {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 100)
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

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  useEffect(() => {
    const diff = value - prevRef.current
    if (diff === 0) return
    const steps = 15
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
    }, 25)
    return () => clearInterval(interval)
  }, [value])
  return <>{display}{suffix}</>
}

/** 核心算力池 */
function ComputePoolPanel() {
  const pool = useSpaceLabStore((s) => s.computePool)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000)
    return () => clearInterval(id)
  }, [])

  const fluctuate = (v: number, range = 3) =>
    Math.max(0, Math.min(100, v + (Math.random() - 0.5) * range))

  const metrics = [
    { label: 'CPU', value: Math.round(fluctuate(pool.cpuUsagePercent)), color: '#5b8dd9', Icon: Cpu },
    { label: 'GPU', value: Math.round(fluctuate(pool.gpuUsagePercent)), color: '#6ba3c9', Icon: Layers },
    { label: 'RAM', value: Math.round(fluctuate(pool.ramUsagePercent)), color: '#7fb3a0', Icon: Gauge },
    { label: 'NET', value: Math.round(fluctuate(pool.networkUsagePercent)), color: '#8fa3c2', Icon: Zap },
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* 标题 */}
      <div className="flex items-center gap-2 pb-1 border-b border-white/5">
        <Cpu className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">算力池</span>
      </div>

      {/* 资源总量 2x2 */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'CPU核心', val: pool.totalCpuCores, unit: '核' },
          { label: 'GPU单元', val: pool.totalGpuUnits, unit: '块' },
          { label: '总内存', val: pool.totalRamGB, unit: 'GB' },
          { label: '网络带宽', val: pool.networkBandwidthMbps, unit: 'Mbps' },
        ].map((item) => (
          <div key={item.label} className="bg-white/5 rounded-lg px-3 py-2.5">
            <div className="text-[10px] text-slate-500 mb-0.5">{item.label}</div>
            <div className="text-lg font-bold font-mono text-slate-200">
              <AnimatedNumber value={item.val} />
              <span className="text-[10px] text-slate-500 ml-1">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 使用率 */}
      <div className="grid grid-cols-4 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-1">
            <div className="relative flex items-center justify-center">
              <MiniRing value={m.value} color={m.color} size={44} />
              <span className="absolute text-[11px] font-bold text-slate-300">{m.value}%</span>
            </div>
            <div className="flex items-center gap-1">
              <m.Icon className="w-2.5 h-2.5" style={{ color: m.color }} />
              <span className="text-[10px] text-slate-500">{m.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 温度 */}
      <div className="flex justify-between text-[10px] text-slate-500 px-1">
        <span>CPU {Math.round(pool.cpuTemp + (Math.random() - 0.5) * 3)}°C</span>
        <span>GPU {Math.round(pool.gpuTemp + (Math.random() - 0.5) * 4)}°C</span>
      </div>
    </div>
  )
}

/** 智能体调度中心 */
function AgentMetricsPanel() {
  const metrics = useSpaceLabStore((s) => s.agentMetrics)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000)
    return () => clearInterval(id)
  }, [])

  const tokenRate = Math.round(metrics.llmTokenRate + (Math.random() - 0.5) * 800)
  const latency = Math.round(metrics.inferenceLatencyMs + (Math.random() - 0.5) * 20)

  return (
    <div className="flex flex-col gap-3">
      {/* 标题 */}
      <div className="flex items-center gap-2 pb-1 border-b border-white/5">
        <BrainCircuit className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">智能体调度</span>
      </div>

      {/* 三大指标 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-lg px-2 py-2.5 text-center">
          <div className="text-[10px] text-slate-500 mb-1">Token/s</div>
          <div className="text-lg font-bold font-mono text-slate-200">
            <AnimatedNumber value={tokenRate} />
          </div>
          <div className="text-[9px] text-slate-600">LLM消耗</div>
        </div>
        <div className="bg-white/5 rounded-lg px-2 py-2.5 text-center">
          <div className="text-[10px] text-slate-500 mb-1">并发</div>
          <div className="text-lg font-bold font-mono text-slate-200">{metrics.concurrentTasks}</div>
          <div className="text-[9px] text-slate-600">运行任务</div>
        </div>
        <div className="bg-white/5 rounded-lg px-2 py-2.5 text-center">
          <div className="text-[10px] text-slate-500 mb-1">延迟</div>
          <div className="text-lg font-bold font-mono text-slate-200">
            <AnimatedNumber value={latency} />
          </div>
          <div className="text-[9px] text-slate-600">ms P50</div>
        </div>
      </div>

      {/* 资源锁列表 */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-2">
          <Lock className="w-2.5 h-2.5" />
          资源锁 ({metrics.activeResourceLocks.length})
        </div>
        <div className="space-y-1">
          {metrics.activeResourceLocks.slice(0, 4).map((lock) => (
            <div key={lock.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-2">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                lock.type === 'physical' ? 'bg-amber-500/15 text-amber-300' : 'bg-blue-500/15 text-blue-300'
              }`}>
                {lock.type === 'physical' ? 'PHY' : 'LLM'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-slate-300 truncate">{lock.resourceName}</div>
                <div className="text-[9px] text-slate-600 truncate">{lock.holderTask}</div>
              </div>
              <div className="text-[9px] text-slate-500 flex-shrink-0">{lock.moduleName}</div>
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
