import { useSpaceLabStore } from '../store'

export default function MacroData() {
  const globalParams = useSpaceLabStore((s) => s.globalParams)
  const labModules = useSpaceLabStore((s) => s.labModules)
  const runningCount = labModules.filter((m) => m.status === 'running').length

  const temp = globalParams.find((p) => p.label === '舱内温度')

  return (
    <div className="flex gap-3">
      <div className="flex-1 rounded-lg border border-gray-200 bg-white p-3">
        <div className="text-[10px] text-gray-400 mb-1">舱内温度</div>
        <div className="text-xl font-bold font-mono text-gray-800">{temp?.value ?? '--'}°C</div>
      </div>
      <div className="flex-1 rounded-lg border border-gray-200 bg-white p-3">
        <div className="text-[10px] text-gray-400 mb-1">运行中舱体</div>
        <div className="text-xl font-bold font-mono text-blue-600">{runningCount}</div>
      </div>
      <div className="flex-1 rounded-lg border border-gray-200 bg-white p-3">
        <div className="text-[10px] text-gray-400 mb-1">总实验舱</div>
        <div className="text-xl font-bold font-mono text-gray-800">{labModules.length}</div>
      </div>
    </div>
  )
}
