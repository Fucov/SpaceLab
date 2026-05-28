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
import { Cpu, Gauge, Zap, Layers, Wifi } from 'lucide-react'

interface NetworkInformationLike {
  downlink?: number
  rtt?: number
  effectiveType?: string
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

function getBrowserConnection(): NetworkInformationLike | undefined {
  const nav = navigator as Navigator & {
    connection?: NetworkInformationLike
    mozConnection?: NetworkInformationLike
    webkitConnection?: NetworkInformationLike
  }
  return nav.connection || nav.mozConnection || nav.webkitConnection
}

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

  const metrics = [
    { label: 'CPU', value: pool.cpuUsagePercent, color: '#5b8dd9', Icon: Cpu },
    { label: 'GPU', value: pool.gpuUsagePercent, color: '#6ba3c9', Icon: Layers },
    { label: 'RAM', value: pool.ramUsagePercent, color: '#7fb3a0', Icon: Gauge },
    { label: 'NET', value: pool.networkUsagePercent, color: '#8fa3c2', Icon: Zap },
  ]

  return (
    <div className="flex flex-col gap-2">
      {/* 标题 */}
      <div className="flex items-center gap-2 pb-1 border-b border-white/5">
        <Cpu className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">算力与链路</span>
      </div>

      {/* 资源总量 2x2 */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'CPU核心', val: pool.totalCpuCores, unit: '核' },
          { label: 'GPU单元', val: pool.totalGpuUnits, unit: '块' },
          { label: '总内存', val: pool.totalRamGB, unit: 'GB' },
          { label: '网络带宽', val: pool.networkBandwidthMbps, unit: 'Mbps' },
        ].map((item) => (
          <div key={item.label} className="bg-white/5 rounded-lg px-3 py-2">
            <div className="text-[10px] text-slate-500 mb-0.5">{item.label}</div>
            <div className="text-lg font-bold font-mono text-slate-200">
              <AnimatedNumber value={item.val} />
              <span className="text-[10px] text-slate-500 ml-1">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 使用率 */}
      <div className="grid grid-cols-4 gap-1.5">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-1">
            <div className="relative flex items-center justify-center">
              <MiniRing value={m.value} color={m.color} size={40} />
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
        <span>CPU {pool.cpuTemp}°C</span>
        <span>GPU {pool.gpuTemp}°C</span>
      </div>
    </div>
  )
}

/** 测控链路：优先读取浏览器 Network Information API，缺失时使用演示 mock。 */
function TrackingNetworkStatus() {
  const [network, setNetwork] = useState({
    bandwidthMbps: 84,
    latencyMs: 38,
    linkType: 'S-band/Ka-band',
    source: 'mock' as 'browser' | 'mock',
  })

  useEffect(() => {
    const connection = getBrowserConnection()
    if (!connection) return

    const update = () => {
      setNetwork({
        bandwidthMbps: Math.max(1, Number((connection.downlink ?? 84).toFixed(1))),
        latencyMs: Math.max(1, Math.round(connection.rtt ?? 38)),
        linkType: connection.effectiveType ? connection.effectiveType.toUpperCase() : '实时链路',
        source: 'browser',
      })
    }
    update()
    connection.addEventListener?.('change', update)
    return () => connection.removeEventListener?.('change', update)
  }, [])

  const packetLoss = network.source === 'browser' ? '<0.1%' : '0.03%'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 pb-1 border-b border-white/5">
        <Wifi className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">测控链路</span>
        <span className="ml-auto rounded border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 text-[9px] text-cyan-200">
          {network.source === 'browser' ? '实时' : '模拟'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: '测控带宽', value: network.bandwidthMbps, unit: 'Mbps', color: 'text-cyan-100' },
          { label: '链路延迟', value: network.latencyMs, unit: 'ms', color: 'text-slate-200' },
          { label: '网络制式', value: network.linkType, unit: '', color: 'text-cyan-200' },
          { label: '丢包率', value: packetLoss, unit: '', color: 'text-emerald-200' },
        ].map((item) => (
          <div key={item.label} className="flex h-12 min-w-0 flex-col justify-center rounded-lg bg-white/5 px-3">
            <div className="truncate text-[10px] text-slate-500">{item.label}</div>
            <div className={`mt-0.5 truncate font-mono text-sm font-bold ${item.color}`}>
              {item.value}
              {item.unit && <span className="ml-1 text-[10px] font-normal text-slate-500">{item.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ComputePanel() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <ComputePoolPanel />
      <TrackingNetworkStatus />
    </div>
  )
}
