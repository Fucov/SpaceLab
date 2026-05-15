import { useSpaceLabStore } from '../store'

export default function GlobalParams() {
  const globalParams = useSpaceLabStore((s) => s.globalParams)

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wider text-blue-400/80 uppercase">空间站全局参数</h3>
      {globalParams.map((param) => (
        <div
          key={param.label}
          className="rounded-lg border border-blue-500/10 bg-blue-950/30 p-3"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-blue-400/50">{param.label}</span>
            <span className="text-sm">{param.icon}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-blue-100 tracking-tight">
              {param.value}
            </span>
            <span className="text-xs text-blue-400/40">{param.unit}</span>
          </div>
          <div className="mt-1 text-[9px] text-blue-400/30">
            {param.trend === 'up' ? '↑ 上升趋势' : param.trend === 'down' ? '↓ 下降趋势' : '→ 稳定'}
          </div>
        </div>
      ))}
    </div>
  )
}
