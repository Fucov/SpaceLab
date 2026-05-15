import { useSpaceLabStore } from '../store'
import type { LabModuleStatus } from '../types'

const statusLabel: Record<LabModuleStatus, { text: string; cls: string }> = {
  standby: { text: '待机', cls: 'bg-gray-100 text-gray-500' },
  running: { text: '运行中', cls: 'bg-blue-50 text-blue-600' },
  completed: { text: '已完成', cls: 'bg-green-50 text-green-600' },
  error: { text: '异常', cls: 'bg-red-50 text-red-600' },
  paused: { text: '暂停', cls: 'bg-amber-50 text-amber-600' },
}

export default function LabModuleInfo() {
  const labModules = useSpaceLabStore((s) => s.labModules)
  const selectModule = useSpaceLabStore((s) => s.selectModule)

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 mb-2 tracking-wider uppercase">实验舱状态</h3>
      <div className="space-y-1.5">
        {labModules.map((mod) => {
          const st = statusLabel[mod.status]
          return (
            <button
              key={mod.id}
              onClick={() => selectModule(mod.id)}
              className="w-full cursor-pointer flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 text-left transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{mod.icon}</span>
                <div>
                  <div className="text-xs font-medium text-gray-800">{mod.name}</div>
                  <div className="text-[10px] text-gray-400">{mod.currentTask}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mod.status === 'running' && (
                  <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-1000"
                      style={{ width: `${mod.progress}%` }}
                    />
                  </div>
                )}
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${st.cls}`}>
                  {st.text}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
