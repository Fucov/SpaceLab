import { useSpaceLabStore } from '../store'

const statusColor: Record<string, string> = {
  online: 'text-emerald-400',
  offline: 'text-gray-500',
  warning: 'text-amber-400',
}

const statusDot: Record<string, string> = {
  online: 'bg-emerald-400',
  offline: 'bg-gray-500',
  warning: 'bg-amber-400 animate-pulse',
}

export default function EquipmentPanel() {
  const equipment = useSpaceLabStore((s) => s.equipment)

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wider text-blue-400/80 uppercase">公共设备</h3>
      {equipment.map((eq) => (
        <div
          key={eq.id}
          className="flex items-center justify-between rounded-lg border border-blue-500/10 bg-blue-950/30 px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{eq.icon}</span>
            <div>
              <div className="text-xs text-blue-200">{eq.name}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot[eq.status]}`} />
                <span className={`text-[9px] ${statusColor[eq.status]}`}>
                  {eq.status === 'online' ? '正常' : eq.status === 'offline' ? '离线' : '告警'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono font-bold text-blue-100">{eq.value}</span>
            <span className="text-[10px] text-blue-400/40 ml-0.5">{eq.unit}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
