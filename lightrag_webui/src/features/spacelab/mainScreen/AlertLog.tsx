import { useState } from 'react'
import { useSpaceLabStore } from '../store'

type FilterMode = 'all' | 'warn'

const levelStyle: Record<string, string> = {
  INFO: 'text-blue-400/60',
  WARN: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  ERROR: 'text-red-400 bg-red-500/10 border-red-500/20',
}

export default function AlertLog() {
  const alertLogs = useSpaceLabStore((s) => s.alertLogs)
  const [filter, setFilter] = useState<FilterMode>('warn')

  const filtered = filter === 'all' ? alertLogs : alertLogs.filter((l) => l.level === 'WARN' || l.level === 'ERROR')

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wider text-blue-400/80 uppercase">监控日志</h3>
        <div className="flex rounded border border-blue-500/20 overflow-hidden">
          <button
            onClick={() => setFilter('all')}
            className={`cursor-pointer px-2 py-0.5 text-[10px] transition-colors ${filter === 'all' ? 'bg-blue-600/40 text-blue-200' : 'text-blue-400/40 hover:text-blue-300/60'}`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('warn')}
            className={`cursor-pointer px-2 py-0.5 text-[10px] transition-colors ${filter === 'warn' ? 'bg-amber-600/40 text-amber-200' : 'text-blue-400/40 hover:text-blue-300/60'}`}
          >
            告警
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-blue-800/30 scrollbar-track-transparent">
        {filtered.map((log) => (
          <div
            key={log.id}
            className={`rounded border px-2 py-1.5 text-[11px] leading-tight ${
              log.level === 'WARN'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                : log.level === 'ERROR'
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-transparent text-blue-300/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] opacity-50">{log.timestamp}</span>
              <span className={`rounded px-1 py-px text-[9px] font-bold ${levelStyle[log.level] || ''}`}>
                {log.level}
              </span>
              <span className="text-[10px] opacity-40">{log.source}</span>
            </div>
            <div className="mt-0.5">{log.message}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
