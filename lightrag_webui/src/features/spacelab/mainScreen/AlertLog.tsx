/**
 * 大屏监控日志面板
 * 设计：简洁克制，去掉所有花哨背景色，只用文字和边框区分
 */
import { useState } from 'react'
import { useSpaceLabStore } from '../store'

type FilterMode = 'all' | 'warn'

export default function AlertLog() {
  const alertLogs = useSpaceLabStore((s) => s.alertLogs)
  const [filter, setFilter] = useState<FilterMode>('warn')

  const filtered = filter === 'all' ? alertLogs : alertLogs.filter((l) => l.level === 'WARN' || l.level === 'ERROR')
  const warnCount = alertLogs.filter((l) => l.level === 'WARN' || l.level === 'ERROR').length

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* 标题栏 */}
      <div className="flex items-center justify-between pb-1 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">日志</span>
          {warnCount > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 rounded px-1.5 py-0.5 font-bold">
              {warnCount}
            </span>
          )}
        </div>
        <div className="flex rounded overflow-hidden">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
              filter === 'all' ? 'bg-white/10 text-slate-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('warn')}
            className={`px-2.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
              filter === 'warn' ? 'bg-white/10 text-slate-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            告警
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {filtered.length === 0 && (
          <div className="text-xs text-slate-600 py-6 text-center">暂无日志</div>
        )}
        {filtered.map((log) => (
          <div
            key={log.id}
            className={`rounded-lg px-3 py-2.5 border ${
              log.level === 'WARN'
                ? 'border-amber-500/20 bg-amber-500/5'
                : log.level === 'ERROR'
                ? 'border-red-500/20 bg-red-500/5'
                : 'border-transparent'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-slate-600">{log.timestamp}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                log.level === 'WARN' ? 'bg-amber-500/15 text-amber-400' :
                log.level === 'ERROR' ? 'bg-red-500/15 text-red-400' :
                'bg-slate-500/10 text-slate-400'
              }`}>
                {log.level}
              </span>
              <span className="text-[10px] text-slate-600">{log.source}</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">{log.message}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
