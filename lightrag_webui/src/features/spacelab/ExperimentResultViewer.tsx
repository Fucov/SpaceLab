/**
 * AstroAgent OS - 实验数据可视化查看器
 *
 * 功能：
 * - 点击已完成实验卡片，展开查看多组原始数据
 * - 支持多种图表类型：温度曲线、粒子分布、光谱图、多组对比
 * - 工程风格：网格线、坐标轴标签、数据点标注
 * - 数据链接可点击查看原始数据
 */

import { useState, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { HistoryExperiment, ExperimentDataGroup } from './types'
import { FileText, Download, ChevronDown, ChevronUp, ExternalLink, X, FileSpreadsheet } from 'lucide-react'

// ================================================================
// 生成 CSV Blob URL（供下载原始数据）
// ================================================================

function generateCSV(experiment: HistoryExperiment): string {
  const lines = [`"${experiment.name}" - 原始数据\n`]
  lines.push(`"舱体","${experiment.id}"`)
  lines.push(`"日期","${experiment.date}"`)
  lines.push(`"结果","${experiment.result}"`)
  lines.push(`"数据点","${experiment.dataPoints}"`)
  lines.push(`"摘要","${experiment.summary.replace(/"/g, '""')}"`)
  lines.push('')

  if (experiment.dataGroups && experiment.dataGroups.length > 0) {
    const firstGroup = experiment.dataGroups[0]
    const headers = ['X', ...experiment.dataGroups.map((g) => g.label)]
    lines.push(headers.map((h) => `"${h}"`).join(','))
    const maxLen = Math.max(...experiment.dataGroups.map((g) => g.data.length))
    for (let i = 0; i < maxLen; i++) {
      const row = [
        firstGroup.timestamps?.[i] ?? i,
        ...experiment.dataGroups.map((g) => g.data[i] ?? ''),
      ]
      lines.push(row.map((v) => `"${v}"`).join(','))
    }
  } else if (experiment.temperatureHistory && experiment.temperatureHistory.length > 0) {
    lines.push('"时间","温度"')
    experiment.temperatureHistory.forEach((v, i) => {
      const ts = experiment.historyTimestamps?.[i] ?? i
      lines.push(`"${ts}",${v}`)
    })
  }

  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  return URL.createObjectURL(blob)
}

function generateReport(experiment: HistoryExperiment): string {
  const groups = experiment.dataGroups ?? []
  const metadataLines = [
    `# ${experiment.name}`,
    '',
    `**日期**: ${experiment.date}`,
    `**实验结果**: ${experiment.result}`,
    `**数据点数**: ${experiment.dataPoints.toLocaleString()}`,
    '',
    '## 实验摘要',
    '',
    experiment.summary,
    '',
  ]

  if (groups.length > 0) {
    metadataLines.push('## 数据组')
    metadataLines.push('')
    groups.forEach((g) => {
      metadataLines.push(`### ${g.label}`)
      metadataLines.push(`- 类型: ${g.type}`)
      metadataLines.push(`- 描述: ${g.description}`)
      if (g.metadata) {
        metadataLines.push('- 元数据:')
        Object.entries(g.metadata).forEach(([k, v]) => {
          metadataLines.push(`  - ${k}: ${v}`)
        })
      }
      metadataLines.push(`- 数据点数: ${g.data.length}`)
      metadataLines.push('')
      metadataLines.push('| X轴 | 数值 |')
      metadataLines.push('|---|---:|')
      g.data.forEach((v, i) => {
        const x = g.timestamps?.[i] ?? i
        metadataLines.push(`| ${x} | ${v} |`)
      })
      metadataLines.push('')
    })
  }

  const blob = new Blob(['\ufeff' + metadataLines.join('\n')], { type: 'text/markdown;charset=utf-8' })
  return URL.createObjectURL(blob)
}

// ================================================================
// 工程风格图表组件
// ================================================================

const GRID_COLOR = 'rgba(148,163,184,0.1)'
const AXIS_STYLE = { fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  fontSize: 11,
  fontFamily: 'monospace',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

interface ChartProps {
  group: ExperimentDataGroup
  compact?: boolean
}

function LineChartView({ group, compact }: ChartProps) {
  const data = group.data.map((v, i) => ({
    x: group.timestamps?.[i] ?? i,
    value: v,
  }))
  return (
    <ResponsiveContainer width="100%" height={compact ? 80 : 120}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis dataKey="x" tick={AXIS_STYLE} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS_STYLE} tickLine={false} width={40} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [Number(value).toFixed(3), group.label]}
          labelStyle={{ color: '#374151', fontWeight: 600 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={group.color || '#3b82f6'}
          strokeWidth={1.5}
          dot={{ r: 2, fill: group.color || '#3b82f6', strokeWidth: 0 }}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function MultiLineChartView({ groups, compact }: { groups: ExperimentDataGroup[]; compact?: boolean }) {
  const maxLen = Math.max(...groups.map((g) => g.data.length))
  const data = Array.from({ length: maxLen }, (_, i) => {
    const row: Record<string, string | number> = { x: groups[0].timestamps?.[i] ?? i }
    groups.forEach((g) => {
      row[g.id] = g.data[i] ?? 0
    })
    return row
  })
  return (
    <ResponsiveContainer width="100%" height={compact ? 80 : 140}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis dataKey="x" tick={AXIS_STYLE} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS_STYLE} tickLine={false} width={40} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#374151', fontWeight: 600 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, paddingTop: 4, fontFamily: 'monospace' }}
          iconType="circle" iconSize={6}
        />
        {groups.map((g) => (
          <Line
            key={g.id}
            type="monotone"
            dataKey={g.id}
            name={g.label}
            stroke={g.color || '#3b82f6'}
            strokeWidth={1.5}
            dot={{ r: 1.5, strokeWidth: 0 }}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function BarChartView({ group, compact }: ChartProps) {
  const data = group.data.map((v, i) => ({
    x: group.timestamps?.[i] ?? i,
    value: v,
  }))
  return (
    <ResponsiveContainer width="100%" height={compact ? 80 : 120}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="x" tick={AXIS_STYLE} tickLine={false} interval={0} angle={-30} textAnchor="end" height={30} />
        <YAxis tick={AXIS_STYLE} tickLine={false} width={40} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [Number(value).toFixed(2), group.label]}
          labelStyle={{ color: '#374151', fontWeight: 600 }}
        />
        <Bar
          dataKey="value"
          fill={group.color || '#3b82f6'}
          opacity={0.85}
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

function AreaChartView({ group, compact }: ChartProps) {
  const data = group.data.map((v, i) => ({
    x: group.timestamps?.[i] ?? i,
    value: v,
  }))
  return (
    <ResponsiveContainer width="100%" height={compact ? 80 : 120}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${group.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={group.color || '#3b82f6'} stopOpacity={0.3} />
            <stop offset="95%" stopColor={group.color || '#3b82f6'} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis dataKey="x" tick={AXIS_STYLE} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS_STYLE} tickLine={false} width={40} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [Number(value).toFixed(4), group.label]}
          labelStyle={{ color: '#374151', fontWeight: 600 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={group.color || '#3b82f6'}
          fill={`url(#grad-${group.id})`}
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function ChartView({ group, compact }: ChartProps) {
  if (group.type === 'particle_size') {
    return <BarChartView group={group} compact={compact} />
  }
  if (group.type === 'spectral') {
    return <AreaChartView group={group} compact={compact} />
  }
  if (group.type === 'multi') {
    // 如果是单条数据，渲染折线；如果是多条（通过 parent 传入），渲染多线
    return <LineChartView group={group} compact={compact} />
  }
  return <LineChartView group={group} compact={compact} />
}

// ================================================================
// 单组数据卡片
// ================================================================

function DataGroupCard({ group }: { group: ExperimentDataGroup }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: group.color || '#3b82f6' }}
          />
          <span className="text-xs font-semibold text-gray-700">{group.label}</span>
        </div>
        <span className="text-[10px] text-gray-400">{group.type.toUpperCase()}</span>
      </div>
      {/* 图表 */}
      <div className="px-2 pt-1 pb-2">
        <ChartView group={group} />
      </div>
      {/* 描述 */}
      {group.description && (
        <div className="px-3 py-1.5 border-t border-gray-50 text-[10px] text-gray-500 italic">
          {group.description}
        </div>
      )}
      {/* 元数据 */}
      {group.metadata && Object.keys(group.metadata).length > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-50 flex flex-wrap gap-x-3 gap-y-0.5">
          {Object.entries(group.metadata).map(([k, v]) => (
            <span key={k} className="text-[10px] text-gray-400 font-mono">
              <span className="text-gray-500">{k}:</span> {v}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ================================================================
// 完整实验数据查看器（Modal 浮层）
// ================================================================

export default function ExperimentResultViewer({
  experiment,
  onClose,
}: {
  experiment: HistoryExperiment
  onClose: () => void
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(experiment.dataGroups?.map((g) => g.id) ?? []))

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const resultColor =
    experiment.result === 'success' ? 'text-green-600 bg-green-50 border-green-200'
    : experiment.result === 'partial' ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200'

  const resultLabel =
    experiment.result === 'success' ? '成功'
    : experiment.result === 'partial' ? '部分成功'
    : '失败'

  // 如果有多组数据，包含同 ID 的（实验组/地面对照组），合并显示
  const groups = experiment.dataGroups ?? []
  const groupedByMulti = groups.filter((g) => g.type === 'multi')
  const standaloneGroups = groups.filter((g) => g.type !== 'multi')

  return (
    <>
      {/* 遮罩 */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-4 top-4 bottom-4 z-50 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-800 truncate">{experiment.name}</h2>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-400">{experiment.date}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${resultColor}`}>
                  {resultLabel}
                </span>
                <span className="text-xs text-gray-400 font-mono">{experiment.dataPoints.toLocaleString()} 数据点</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {experiment.dataGroups && experiment.dataGroups.length > 0 && (
              <button
                onClick={() => {
                  const url = generateCSV(experiment)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${experiment.id}_data.csv`
                  a.click()
                  setTimeout(() => URL.revokeObjectURL(url), 5000)
                }}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                原始数据(CSV)
              </button>
            )}
            <button
              onClick={() => {
                const url = generateReport(experiment)
                const a = document.createElement('a')
                a.href = url
                a.download = `${experiment.id}_report.md`
                a.click()
                setTimeout(() => URL.revokeObjectURL(url), 5000)
              }}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              实验报告(MD)
            </button>
            <button onClick={onClose}
              className="cursor-pointer p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 实验摘要 */}
        <div className="px-6 py-3 border-b border-gray-100 bg-blue-50/30 shrink-0">
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-blue-600 mt-0.5 shrink-0">摘要</span>
            <p className="text-xs text-gray-700 leading-relaxed">{experiment.summary}</p>
          </div>
        </div>

        {/* 数据图表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 多组对比图 */}
          {groupedByMulti.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-gray-700">多组数据对比</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {groupedByMulti.map((g) => g.label).join(' / ')}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <MultiLineChartView groups={groupedByMulti} />
              </div>
              {/* 分组详情（可展开） */}
              <div className="border-t border-gray-100 p-4 pt-2 space-y-2">
                {groupedByMulti.map((g) => (
                  <div key={g.id}>
                    <button
                      onClick={() => toggleGroup(g.id)}
                      className="flex items-center gap-2 w-full text-left py-1 cursor-pointer hover:bg-gray-50 rounded px-2"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="text-xs font-semibold text-gray-700 flex-1">{g.label}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{g.description}</span>
                      {expandedGroups.has(g.id) ? (
                        <ChevronUp className="w-3 h-3 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                    {expandedGroups.has(g.id) && (
                      <div className="pl-4 pb-1">
                        <DataGroupCard group={g} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 独立数据组 */}
          {standaloneGroups.map((group) => (
            <DataGroupCard key={group.id} group={group} />
          ))}
        </div>
      </div>
    </>
  )
}
