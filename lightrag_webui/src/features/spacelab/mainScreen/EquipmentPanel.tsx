/**
 * 大屏右侧 - 环境、电源和电力分配面板
 * 设计：简洁克制，以数据为主，去掉花哨粒子动画
 */

import { useSpaceLabStore } from '../store'
import { BatteryCharging, Zap, Thermometer, Droplets, Gauge, Volume2, Activity } from 'lucide-react'

/** 全局环境参数（简洁卡片） */
function GlobalParamsMini() {
  const globalParams = useSpaceLabStore((s) => s.globalParams)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-1 border-b border-white/5">
        <Thermometer className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">全站环境</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {globalParams.map((p) => {
          const Icon = p.icon === '🌡️' ? Thermometer
            : p.icon === '💧' ? Droplets
            : p.icon === '🔵' ? Gauge
            : Volume2
          const trendArrow = p.trend === 'up' ? '↑' : p.trend === 'down' ? '↓' : '→'
          const trendColor = p.trend === 'up' ? 'text-red-400' : p.trend === 'down' ? 'text-blue-400' : 'text-slate-400'
          return (
            <div key={p.label} className="bg-white/5 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500">{p.label}</span>
                <Icon className="w-3 h-3 text-slate-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-slate-200">{p.value}</span>
                <span className="text-xs text-slate-500">{p.unit}</span>
              </div>
              <div className={`text-[10px] mt-1 ${trendColor}`}>
                {trendArrow} {p.trend === 'up' ? '上升' : p.trend === 'down' ? '下降' : '稳定'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 电源系统状态（mock 遥测） */
function PowerSystemStatus() {
  const generationKw = 18.6
  const loadKw = 12.8
  const batteryPercent = 76
  const batteryRuntime = 4.2

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-1 border-b border-white/5">
        <BatteryCharging className="w-3.5 h-3.5 text-emerald-300" />
        <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">电源系统</span>
      </div>
      <div className="bg-white/5 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-[10px] text-slate-500 mb-1">太阳翼发电</div>
            <div className="text-lg font-bold font-mono text-amber-200">{generationKw}<span className="ml-1 text-xs text-slate-500">kW</span></div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 mb-1">当前负载</div>
            <div className="text-lg font-bold font-mono text-slate-200">{loadKw}<span className="ml-1 text-xs text-slate-500">kW</span></div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">蓄电池电量</span>
          <span className="text-xs font-mono text-emerald-200">{batteryPercent}% · {batteryRuntime}h</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${batteryPercent}%` }} />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-300">
          <Activity className="w-3 h-3" />
          功率余量 {(generationKw - loadKw).toFixed(1)} kW，供电稳定
        </div>
      </div>
    </div>
  )
}

/** 电力分配（简洁横向条形图） */
function PowerDistribution() {
  const allocations = useSpaceLabStore((s) => s.arbitrationAllocations)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-1 border-b border-white/5">
        <Zap className="w-3.5 h-3.5 text-yellow-400" />
        <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">电力分配</span>
      </div>

      {allocations.map((alloc) => (
        <div key={alloc.id} className="bg-white/5 rounded-lg p-3">
          {/* 源节点 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs text-slate-300">{alloc.sourceName}</span>
            </div>
            <span className="text-sm font-bold font-mono text-slate-200">
              {alloc.sourceTotal}{alloc.sourceUnit}
            </span>
          </div>

          {/* 分配条形图 */}
          <div className="space-y-2">
            {alloc.targets.map((t) => (
              <div key={t.moduleId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: t.color }} />
                    {t.moduleName}
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    {t.currentValue}{t.unit}
                    <span className="text-slate-600 ml-1">({t.percentage}%)</span>
                  </span>
                </div>
                {/* 条形 */}
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${t.percentage}%`,
                      backgroundColor: t.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Agent 调配建议 */}
      <div className="bg-white/5 rounded-lg p-3">
        <div className="text-[10px] text-slate-500 mb-2">Agent 调配建议</div>
        <div className="space-y-2">
          {[
            { reason: '材料实验舱正在冷却', action: '降低供电 5%', delta: '-0.6kW', color: '#f59e0b' },
            { reason: 'LLM 分析队列积压', action: '提升推理优先级', delta: '+2%', color: '#5b8dd9' },
            { reason: '液冷泵B告警', action: '切换备用泵', delta: '', color: '#ef4444' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: item.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-slate-500 truncate">{item.reason}</div>
                <div className="text-slate-300 flex items-center gap-1">
                  {item.action}
                  {item.delta && <span className="font-mono font-bold" style={{ color: item.color }}>{item.delta}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function EquipmentPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <GlobalParamsMini />
      <PowerSystemStatus />
      <PowerDistribution />
    </div>
  )
}
