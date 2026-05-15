/**
 * AstroAgent OS - 模拟数据
 * 包含所有实验舱、设备、告警等运行时数据，以及模拟的时间序列数据
 */

import type {
  LabModule,
  AlertLogEntry,
  GlobalParam,
  Equipment,
  DocumentItem,
  ComputePoolMetrics,
  AgentMetrics,
  ArbitrationAllocation,
  ActiveTaskTracker,
} from './types'

// ============================================================
// 实验舱模拟数据（含并行 DAG 拓扑）
// ============================================================

export const labModules: LabModule[] = [
  {
    id: 'life-science',
    name: '生命科学舱',
    icon: '🧬',
    status: 'running',
    currentTask: '拟南芥微重力生长实验',
    currentStepIndex: 2,
    progress: 67,
    eta: '2026-05-15 18:30',
    temperature: 22.4,
    co2: 0.04,
    humidity: 45.2,
    pressure: 101.3,
    power: 45,
    moduleType: 'life_science',
    // DAG: 步骤1(样本解冻) -> [步骤2a(显微镜预热) || 步骤2b(培养基配制)] -> 步骤3(恒温静置) -> 步骤4(荧光成像) -> 步骤5(数据采集)
    dagSteps: [
      { id: 's1', name: '样本解冻', status: 'completed', duration: '12min', parallelGroup: 0 },
      // 并行分支
      { id: 's2a', name: '显微镜预热', status: 'completed', duration: '8min', parallelGroup: 1, resourceLock: 'physical' },
      { id: 's2b', name: '培养基配制', status: 'completed', duration: '10min', parallelGroup: 1, resourceLock: 'physical' },
      // 汇聚
      { id: 's3', name: '恒温静置', status: 'running', duration: '进行中', parallelGroup: 2, isActive: true },
      { id: 's4', name: '荧光成像', status: 'pending', parallelGroup: 3, resourceLock: 'llm' },
      { id: 's5', name: '数据采集', status: 'pending', parallelGroup: 3 },
    ],
    taskQueue: [
      {
        id: 't1', name: '蛋白质结晶观察', assignee: '张伟', scheduledTime: '19:00', priority: 'high',
        parsedParams: { id: 'draft-1', taskName: '蛋白质结晶观察', targetModuleId: 'life-science', targetModuleName: '生命科学舱', device: '离心机', deviceParams: [{ key: '转速', value: 5000, unit: 'rpm', editable: true }, { key: '时间', value: 10, unit: 'min', editable: true }, { key: '温度', value: 4, unit: '°C', editable: true }], estimatedDuration: '30min', priority: 'high', rawText: '启动蛋白质结晶观察实验，离心机转速5000转，时间10分钟，温度4度', authorized: false },
      },
      { id: 't2', name: '细胞培养基更换', assignee: '李明', scheduledTime: '21:00', priority: 'medium' },
    ],
    history: [
      {
        id: 'h1', name: '种子萌发率测试', date: '2026-05-14', result: 'success',
        summary: '微重力环境下萌发率提升12%',
        dataPoints: 2400,
        temperatureHistory: [21.2, 21.5, 22.0, 22.3, 22.1, 22.4, 22.6, 22.8, 23.0, 22.9, 22.7, 22.5],
        historyTimestamps: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
      },
      {
        id: 'h2', name: '根系向光性实验', date: '2026-05-12', result: 'success',
        summary: '观察到异常向光性反应',
        dataPoints: 1800,
        temperatureHistory: [20.8, 21.0, 21.3, 21.8, 22.1, 22.0, 21.9, 21.7, 21.5, 21.3],
        historyTimestamps: ['00:00', '02:24', '04:48', '07:12', '09:36', '12:00', '14:24', '16:48', '19:12', '21:36'],
      },
    ],
  },
  {
    id: 'fluid-physics',
    name: '流体物理舱',
    icon: '🌊',
    status: 'running',
    currentTask: '表面张力液滴生成实验',
    currentStepIndex: 1,
    progress: 35,
    eta: '2026-05-15 21:00',
    temperature: 21.8,
    co2: 0.03,
    humidity: 42.1,
    pressure: 101.1,
    power: 38,
    moduleType: 'fluid_physics',
    // 并行: 步骤1a(流体注入) || 步骤1b(参数初始化) -> 步骤2(液滴生成) -> 步骤3(高速摄影)
    dagSteps: [
      { id: 'f1a', name: '流体注入', status: 'running', duration: '进行中', parallelGroup: 0, resourceLock: 'physical', isActive: true },
      { id: 'f1b', name: '参数初始化', status: 'running', duration: '进行中', parallelGroup: 0, resourceLock: 'llm' },
      { id: 'f2', name: '液滴生成', status: 'pending', parallelGroup: 1, resourceLock: 'physical' },
      { id: 'f3', name: '高速摄影', status: 'pending', parallelGroup: 2, resourceLock: 'physical' },
    ],
    taskQueue: [
      { id: 't1', name: '毛细管测定', assignee: '王芳', scheduledTime: '22:00', priority: 'medium' },
    ],
    history: [
      { id: 'h1', name: '毛细管实验', date: '2026-05-13', result: 'success', summary: '微重力毛细现象数据完整', dataPoints: 3200, temperatureHistory: [21.0, 21.2, 21.5, 21.8, 22.0, 21.9, 21.7, 21.5], historyTimestamps: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'] },
    ],
  },
  {
    id: 'material-exp',
    name: '材料实验舱',
    icon: '🔬',
    status: 'running',
    currentTask: '钛合金凝固过程观测',
    currentStepIndex: 1,
    progress: 43,
    eta: '2026-05-15 20:15',
    temperature: 24.1,
    co2: 0.035,
    humidity: 38.5,
    pressure: 101.2,
    power: 72,
    moduleType: 'material',
    dagSteps: [
      { id: 'm1', name: '样品装载', status: 'completed', duration: '15min', parallelGroup: 0 },
      { id: 'm2', name: '加热熔融', status: 'completed', duration: '25min', parallelGroup: 0 },
      { id: 'm3', name: '缓慢冷却', status: 'running', duration: '进行中', parallelGroup: 1, isActive: true },
      { id: 'm4', name: '组织分析', status: 'pending', parallelGroup: 2, resourceLock: 'llm' },
      { id: 'm5', name: '性能测试', status: 'pending', parallelGroup: 2 },
    ],
    taskQueue: [
      { id: 't1', name: '陶瓷烧结实验', assignee: '赵强', scheduledTime: '22:00', priority: 'low' },
    ],
    history: [
      { id: 'h1', name: '玻璃微球制备', date: '2026-05-11', result: 'partial', summary: '部分样品合格率85%', dataPoints: 1500, temperatureHistory: [20.0, 25.0, 30.0, 35.0, 40.0, 38.0, 35.0, 30.0, 25.0], historyTimestamps: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00'] },
    ],
  },
  {
    id: 'combustion',
    name: '燃烧科学舱',
    icon: '🔥',
    status: 'completed',
    currentTask: '微重力火焰传播研究',
    currentStepIndex: 4,
    progress: 100,
    eta: '已完成',
    temperature: 23.2,
    co2: 0.042,
    humidity: 40.3,
    pressure: 101.0,
    power: 15,
    moduleType: 'combustion',
    dagSteps: [
      { id: 'c1', name: '气氛准备', status: 'completed', duration: '10min', parallelGroup: 0 },
      { id: 'c2', name: '点火触发', status: 'completed', duration: '2min', parallelGroup: 0 },
      { id: 'c3', name: '高速记录', status: 'completed', duration: '30min', parallelGroup: 1 },
      { id: 'c4', name: '数据分析', status: 'completed', duration: '45min', parallelGroup: 2, resourceLock: 'llm' },
    ],
    taskQueue: [],
    history: [
      { id: 'h1', name: '微重力火焰传播研究', date: '2026-05-15', result: 'success', summary: '获取完整球形火焰传播数据', dataPoints: 5600, temperatureHistory: [22.0, 25.0, 28.0, 32.0, 35.0, 34.0, 30.0, 27.0, 24.0, 23.0], historyTimestamps: ['00:00', '01:48', '03:36', '05:24', '07:12', '09:00', '10:48', '12:36', '14:24', '16:12'] },
    ],
  },
  {
    id: 'earth-observe',
    name: '对地观测舱',
    icon: '🌍',
    status: 'running',
    currentTask: '高光谱遥感扫描',
    currentStepIndex: 1,
    progress: 28,
    eta: '2026-05-16 02:00',
    temperature: 20.5,
    co2: 0.032,
    humidity: 35.8,
    pressure: 101.4,
    power: 88,
    moduleType: 'earth_observe',
    dagSteps: [
      { id: 'e1', name: '轨道调整', status: 'completed', duration: '20min', parallelGroup: 0 },
      { id: 'e2', name: '传感器校准', status: 'completed', duration: '15min', parallelGroup: 0 },
      { id: 'e3', name: '区域扫描', status: 'running', duration: '进行中', parallelGroup: 1, isActive: true, resourceLock: 'physical' },
      { id: 'e4', name: '数据下传', status: 'pending', parallelGroup: 2, resourceLock: 'llm' },
    ],
    taskQueue: [
      { id: 't1', name: '大气成分探测', assignee: '刘洋', scheduledTime: '04:00', priority: 'high' },
    ],
    history: [],
  },
  {
    id: 'bio-experiment',
    name: '生物技术舱',
    icon: '🧫',
    status: 'error',
    currentTask: '蛋白质电泳实验 (异常)',
    currentStepIndex: 1,
    progress: 52,
    eta: '暂停',
    temperature: 25.8,
    co2: 0.05,
    humidity: 48.2,
    pressure: 100.9,
    power: 22,
    moduleType: 'bio',
    dagSteps: [
      { id: 'b1', name: '样品制备', status: 'completed', duration: '30min', parallelGroup: 0 },
      { id: 'b2', name: '电泳分离', status: 'error', duration: '异常中断', parallelGroup: 1, isActive: true },
      { id: 'b3', name: '染色观察', status: 'pending', parallelGroup: 2 },
    ],
    taskQueue: [
      { id: 't1', name: 'DNA提取实验', assignee: '陈静', scheduledTime: '待定', priority: 'high' },
    ],
    history: [
      { id: 'h1', name: '微生物培养实验', date: '2026-05-10', result: 'failed', summary: '培养箱温度异常导致实验失败', dataPoints: 800, temperatureHistory: [24.0, 26.0, 28.0, 30.0, 29.0, 27.0, 25.0], historyTimestamps: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'] },
    ],
  },
]

// ============================================================
// 告警日志
// ============================================================

export const alertLogs: AlertLogEntry[] = [
  { id: 'a1', timestamp: '15:42:18', level: 'ERROR', source: '生物技术舱', message: '电泳仪电流异常，自动断电保护已触发' },
  { id: 'a2', timestamp: '15:40:05', level: 'WARN', source: '生命科学舱', message: 'CO₂浓度接近阈值 (0.048%)，建议检查通风系统' },
  { id: 'a3', timestamp: '15:38:22', level: 'INFO', source: '系统', message: '对地观测舱开始高光谱扫描任务' },
  { id: 'a4', timestamp: '15:35:10', level: 'WARN', source: '材料实验舱', message: '冷却速率偏高，建议调整至0.5°C/min' },
  { id: 'a5', timestamp: '15:30:45', level: 'INFO', source: '系统', message: '燃烧科学舱实验数据已完整下传' },
  { id: 'a6', timestamp: '15:28:33', level: 'WARN', source: '生物技术舱', message: '培养箱温度波动超过±0.5°C' },
  { id: 'a7', timestamp: '15:25:12', level: 'INFO', source: '系统', message: '空间站轨道维持机动完成' },
  { id: 'a8', timestamp: '15:20:08', level: 'ERROR', source: '公共设备', message: '液冷循环泵B压力异常，已切换至备用泵' },
  { id: 'a9', timestamp: '15:15:44', level: 'INFO', source: '生命科学舱', message: '荧光成像预热完成' },
  { id: 'a10', timestamp: '15:10:22', level: 'WARN', source: '对地观测舱', message: '太阳能帆板角度需微调' },
]

// ============================================================
// 算力池指标（合并三个节点）
// ============================================================

export const computePoolMetrics: ComputePoolMetrics = {
  totalCpuCores: 384,
  totalGpuUnits: 12,
  totalRamGB: 2048,
  networkBandwidthMbps: 10000,
  cpuUsagePercent: 64,
  gpuUsagePercent: 82,
  ramUsagePercent: 71,
  networkUsagePercent: 38,
  cpuTemp: 55,
  gpuTemp: 76,
}

// ============================================================
// 智能体调度中心指标
// ============================================================

export const agentMetrics: AgentMetrics = {
  llmTokenRate: 12847,
  concurrentTasks: 8,
  inferenceLatencyMs: 234,
  activeResourceLocks: [
    { id: 'rl1', type: 'physical', resourceName: '机械臂#03', holderTask: '样本转移', moduleName: '生命科学舱' },
    { id: 'rl2', type: 'llm', resourceName: 'LLM推理单元', holderTask: '荧光成像分析', moduleName: '生命科学舱' },
    { id: 'rl3', type: 'physical', resourceName: '高速相机#01', holderTask: '液滴生成记录', moduleName: '流体物理舱' },
    { id: 'rl4', type: 'llm', resourceName: 'LLM推理单元', holderTask: '组织分析', moduleName: '材料实验舱' },
  ],
}

// ============================================================
// 全局参数
// ============================================================

export const globalParams: GlobalParam[] = [
  { label: '舱内温度', value: '22.4', unit: '°C', trend: 'stable', icon: '🌡️' },
  { label: '相对湿度', value: '42.1', unit: '%', trend: 'down', icon: '💧' },
  { label: '总气压', value: '101.2', unit: 'kPa', trend: 'stable', icon: '🔵' },
  { label: '背景噪声', value: '45.3', unit: 'dB', trend: 'up', icon: '🔊' },
]

// ============================================================
// 公共设备
// ============================================================

export const equipment: Equipment[] = [
  { id: 'eq1', name: '主供电网', status: 'online', value: '12.4', unit: 'kW', icon: '⚡' },
  { id: 'eq2', name: '液冷循环', status: 'warning', value: '3.2', unit: 'L/min', icon: '❄️' },
  { id: 'eq3', name: '空气净化', status: 'online', value: '98.5', unit: '%', icon: '🌬️' },
  { id: 'eq4', name: '通信链路', status: 'online', value: '256', unit: 'Mbps', icon: '📡' },
  { id: 'eq5', name: '姿态控制', status: 'online', value: '0.02', unit: '°/s', icon: '🛰️' },
]

// ============================================================
// 全局资源仲裁分配（电力流向）
// ============================================================

export const arbitrationAllocations: ArbitrationAllocation[] = [
  {
    id: 'power-1',
    sourceName: '主供电网',
    sourceTotal: 12.4,
    sourceUnit: 'kW',
    targets: [
      { moduleId: 'life-science', moduleName: '生命科学舱', percentage: 30, currentValue: 3.72, unit: 'kW', color: '#3b82f6' },
      { moduleId: 'fluid-physics', moduleName: '流体物理舱', percentage: 20, currentValue: 2.48, unit: 'kW', color: '#06b6d4' },
      { moduleId: 'material-exp', moduleName: '材料实验舱', percentage: 25, currentValue: 3.10, unit: 'kW', color: '#f59e0b' },
      { moduleId: 'earth-observe', moduleName: '对地观测舱', percentage: 15, currentValue: 1.86, unit: 'kW', color: '#10b981' },
      { moduleId: 'bio-experiment', moduleName: '生物技术舱', percentage: 10, currentValue: 1.24, unit: 'kW', color: '#8b5cf6' },
    ],
  },
]

// ============================================================
// 文档
// ============================================================

export const documents: DocumentItem[] = [
  { id: 'doc1', name: '实验方案_流体力学_v3.pdf', status: 'processed', uploadTime: '2026-05-14 10:30', size: '2.4MB' },
  { id: 'doc2', name: '微重力生物效应研究.txt', status: 'processed', uploadTime: '2026-05-13 16:20', size: '156KB' },
  { id: 'doc3', name: '空间站设备维护手册.pdf', status: 'processing', uploadTime: '2026-05-15 14:00', size: '8.7MB' },
]

// ============================================================
// 活跃任务追踪（平板侧边栏用）
// ============================================================

export const activeTaskTrackers: ActiveTaskTracker[] = [
  {
    id: 'tracker-1',
    moduleId: 'life-science',
    moduleName: '生命科学舱',
    icon: '🧬',
    currentStep: '恒温静置',
    currentStepIndex: 2,
    totalSteps: 5,
    status: 'running',
  },
  {
    id: 'tracker-2',
    moduleId: 'fluid-physics',
    moduleName: '流体物理舱',
    icon: '🌊',
    currentStep: '流体注入 || 参数初始化 (并行)',
    currentStepIndex: 0,
    totalSteps: 3,
    status: 'running',
  },
  {
    id: 'tracker-3',
    moduleId: 'material-exp',
    moduleName: '材料实验舱',
    icon: '🔬',
    currentStep: '缓慢冷却',
    currentStepIndex: 2,
    totalSteps: 5,
    status: 'blocked',
    blockedReason: '等待 LLM 推理单元释放',
  },
  {
    id: 'tracker-4',
    moduleId: 'bio-experiment',
    moduleName: '生物技术舱',
    icon: '🧫',
    currentStep: '电泳分离 (异常中断)',
    currentStepIndex: 1,
    totalSteps: 3,
    status: 'error',
  },
]
