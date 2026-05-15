import { useSpaceLabStore } from '../store'
import { useEffect, useState } from 'react'

function RingChart({ value, color, size = 64 }: { value: number; color: string; size?: number }) {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 100)
    return () => clearTimeout(t)
  }, [value])

  const r = (size - 8) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (animated / 100) * circumference

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="14"
        fontWeight="bold"
        className="rotate-[90deg]"
        style={{ transformOrigin: 'center' }}
      >
        {value}%
      </text>
    </svg>
  )
}

export default function ComputePanel() {
  const computeNodes = useSpaceLabStore((s) => s.computeNodes)
  const [, setTick] = useState(0)

  // Simulate real-time fluctuation
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 3000)
    return () => clearInterval(interval)
  }, [])

  const fluctuate = (val: number) => Math.max(0, Math.min(100, val + (Math.random() - 0.5) * 6))

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wider text-blue-400/80 uppercase">算力节点监控</h3>
      {computeNodes.map((node) => {
        const cpu = Math.round(fluctuate(node.cpuUsage))
        const gpu = Math.round(fluctuate(node.gpuUsage))
        const mem = Math.round(fluctuate(node.memoryUsage))
        return (
          <div
            key={node.id}
            className="rounded-lg border border-blue-500/10 bg-blue-950/30 p-3"
          >
            <div className="mb-2 text-xs font-medium text-blue-200">{node.name}</div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-center gap-1">
                <RingChart value={cpu} color="#3b82f6" size={48} />
                <span className="text-[10px] text-blue-400/60">CPU</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RingChart value={gpu} color="#22d3ee" size={48} />
                <span className="text-[10px] text-cyan-400/60">GPU</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RingChart value={mem} color="#10b981" size={48} />
                <span className="text-[10px] text-emerald-400/60">MEM</span>
              </div>
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-blue-300/40">
              <span>CPU {Math.round(fluctuate(node.cpuTemp))}°C</span>
              <span>GPU {Math.round(fluctuate(node.gpuTemp))}°C</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
