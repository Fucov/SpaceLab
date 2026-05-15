/**
 * 大屏监控日志面板
 * 字体已增大以保证大屏可读性
 */
import { useState } from 'react'
import { useSpaceLabStore } from '../store'

type FilterMode = 'all' | 'warn'

export default function AlertLog() {
  const alertLogs = useSpaceLabStore((s) => s.alertLogs)
  const [filter, setFilter] = useState<FilterMode>('warn')

  const filtered = filter === 'all' ? alertLogs : alertLogs.filter((l) => l.level === 'WARN' || l.level === 'ERROR')

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-widest text-cyan-400 uppercase">监控日志</h3>
        <div className="flex rounded-lg border border-blue-500/20 overflow-hidden">
          <button
            onClick={() => setFilter('all')}
            className={`cursor-pointer px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'all' ? 'bg-blue-600/50 text-blue-100' : 'text-blue-400/50 hover:text-blue-300/70'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('warn')}
            className={`cursor-pointer px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'warn' ? 'bg-amber-600/50 text-amber-100' : 'text-blue-400/50 hover:text-blue-300/70'
            }`}
          >
            告警
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-blue-800/30 scrollbar-track-transparent">
        {filtered.length === 0 && (
          <div className="text-xs text-blue-400/30 py-4 text-center">暂无告警日志</div>
        )}
        {filtered.map((log) => (
          <div
            key={log.id}
            className={`rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${
              log.level === 'WARN'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                : log.level === 'ERROR'
                ? 'border-red-500/30 bg-red-500/10 text-red-100'
                : 'border-transparent text-blue-300/50'
            }`}
          >
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs text-blue-400/40 font-mono flex-shrink-0">{log.timestamp}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-bold flex-shrink-0 ${
                log.level === 'WARN'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : log.level === 'ERROR'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
              }`}>
                {log.level}
              </span>
              <span className="text-xs text-blue-400/40 flex-shrink-0">{log.source}</span>
            </div>
            <div className="text-sm pl-1">{log.message}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
