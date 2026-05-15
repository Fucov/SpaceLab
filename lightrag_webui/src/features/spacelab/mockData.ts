import type {
  LabModule,
  AlertLogEntry,
  ComputeNode,
  GlobalParam,
  Equipment,
  DocumentItem,
} from './types'

export const labModules: LabModule[] = [
  {
    id: 'life-science',
    name: '生命科学舱',
    icon: '🧬',
    status: 'running',
    currentTask: '拟南芥微重力生长实验',
    progress: 67,
    eta: '2026-05-15 18:30',
    temperature: 22.4,
    co2: 0.04,
    humidity: 45.2,
    pressure: 101.3,
    dagSteps: [
      { id: 's1', name: '样本解冻', status: 'completed', duration: '12min' },
      { id: 's2', name: '培养基注入', status: 'completed', duration: '8min' },
      { id: 's3', name: '恒温静置', status: 'running', duration: '进行中' },
      { id: 's4', name: '荧光成像', status: 'pending' },
      { id: 's5', name: '数据采集', status: 'pending' },
    ],
    taskQueue: [
      { id: 't1', name: '蛋白质结晶观察', assignee: '张伟', scheduledTime: '19:00', priority: 'high' },
      { id: 't2', name: '细胞培养基更换', assignee: '李明', scheduledTime: '21:00', priority: 'medium' },
    ],
    history: [
      { id: 'h1', name: '种子萌发率测试', date: '2026-05-14', result: 'success', summary: '微重力环境下萌发率提升12%', dataPoints: 2400 },
      { id: 'h2', name: '根系向光性实验', date: '2026-05-12', result: 'success', summary: '观察到异常向光性反应', dataPoints: 1800 },
    ],
  },
  {
    id: 'fluid-physics',
    name: '流体物理舱',
    icon: '🌊',
    status: 'standby',
    currentTask: '待分配',
    progress: 0,
    eta: '--',
    temperature: 21.8,
    co2: 0.03,
    humidity: 42.1,
    pressure: 101.1,
    dagSteps: [
      { id: 's1', name: '流体注入', status: 'pending' },
      { id: 's2', name: '参数设置', status: 'pending' },
      { id: 's3', name: '液滴生成', status: 'pending' },
      { id: 's4', name: '高速摄影', status: 'pending' },
    ],
    taskQueue: [
      { id: 't1', name: '表面张力测定', assignee: '王芳', scheduledTime: '20:00', priority: 'medium' },
    ],
    history: [
      { id: 'h1', name: '毛细管实验', date: '2026-05-13', result: 'success', summary: '微重力毛细现象数据完整', dataPoints: 3200 },
    ],
  },
  {
    id: 'material-exp',
    name: '材料实验舱',
    icon: '🔬',
    status: 'running',
    currentTask: '钛合金凝固过程观测',
    progress: 43,
    eta: '2026-05-15 20:15',
    temperature: 24.1,
    co2: 0.035,
    humidity: 38.5,
    pressure: 101.2,
    dagSteps: [
      { id: 's1', name: '样品装载', status: 'completed', duration: '15min' },
      { id: 's2', name: '加热熔融', status: 'completed', duration: '25min' },
      { id: 's3', name: '缓慢冷却', status: 'running', duration: '进行中' },
      { id: 's4', name: '组织分析', status: 'pending' },
      { id: 's5', name: '性能测试', status: 'pending' },
    ],
    taskQueue: [
      { id: 't1', name: '陶瓷烧结实验', assignee: '赵强', scheduledTime: '22:00', priority: 'low' },
    ],
    history: [
      { id: 'h1', name: '玻璃微球制备', date: '2026-05-11', result: 'partial', summary: '部分样品合格率85%', dataPoints: 1500 },
    ],
  },
  {
    id: 'combustion',
    name: '燃烧科学舱',
    icon: '🔥',
    status: 'completed',
    currentTask: '微重力火焰传播研究',
    progress: 100,
    eta: '已完成',
    temperature: 23.2,
    co2: 0.042,
    humidity: 40.3,
    pressure: 101.0,
    dagSteps: [
      { id: 's1', name: '气氛准备', status: 'completed', duration: '10min' },
      { id: 's2', name: '点火触发', status: 'completed', duration: '2min' },
      { id: 's3', name: '高速记录', status: 'completed', duration: '30min' },
      { id: 's4', name: '数据分析', status: 'completed', duration: '45min' },
    ],
    taskQueue: [],
    history: [
      { id: 'h1', name: '微重力火焰传播研究', date: '2026-05-15', result: 'success', summary: '获取完整球形火焰传播数据', dataPoints: 5600 },
    ],
  },
  {
    id: 'earth-observe',
    name: '对地观测舱',
    icon: '🌍',
    status: 'running',
    currentTask: '高光谱遥感扫描',
    progress: 28,
    eta: '2026-05-16 02:00',
    temperature: 20.5,
    co2: 0.032,
    humidity: 35.8,
    pressure: 101.4,
    dagSteps: [
      { id: 's1', name: '轨道调整', status: 'completed', duration: '20min' },
      { id: 's2', name: '传感器校准', status: 'completed', duration: '15min' },
      { id: 's3', name: '区域扫描', status: 'running', duration: '进行中' },
      { id: 's4', name: '数据下传', status: 'pending' },
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
    progress: 52,
    eta: '暂停',
    temperature: 25.8,
    co2: 0.05,
    humidity: 48.2,
    pressure: 100.9,
    dagSteps: [
      { id: 's1', name: '样品制备', status: 'completed', duration: '30min' },
      { id: 's2', name: '电泳分离', status: 'error', duration: '异常中断' },
      { id: 's3', name: '染色观察', status: 'pending' },
    ],
    taskQueue: [
      { id: 't1', name: 'DNA提取实验', assignee: '陈静', scheduledTime: '待定', priority: 'high' },
    ],
    history: [
      { id: 'h1', name: '微生物培养实验', date: '2026-05-10', result: 'failed', summary: '培养箱温度异常导致实验失败', dataPoints: 800 },
    ],
  },
]

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

export const computeNodes: ComputeNode[] = [
  { id: 'node-1', name: '主控节点', cpuUsage: 62, gpuUsage: 78, memoryUsage: 71, cpuTemp: 58, gpuTemp: 72 },
  { id: 'node-2', name: '数据处理节点', cpuUsage: 45, gpuUsage: 92, memoryUsage: 85, cpuTemp: 52, gpuTemp: 81 },
  { id: 'node-3', name: '通信节点', cpuUsage: 28, gpuUsage: 15, memoryUsage: 43, cpuTemp: 42, gpuTemp: 38 },
]

export const globalParams: GlobalParam[] = [
  { label: '舱内温度', value: '22.4', unit: '°C', trend: 'stable', icon: '🌡️' },
  { label: '相对湿度', value: '42.1', unit: '%', trend: 'down', icon: '💧' },
  { label: '总气压', value: '101.2', unit: 'kPa', trend: 'stable', icon: '🔵' },
  { label: '背景噪声', value: '45.3', unit: 'dB', trend: 'up', icon: '🔊' },
]

export const equipment: Equipment[] = [
  { id: 'eq1', name: '主供电网', status: 'online', value: '12.4', unit: 'kW', icon: '⚡' },
  { id: 'eq2', name: '液冷循环', status: 'warning', value: '3.2', unit: 'L/min', icon: '❄️' },
  { id: 'eq3', name: '空气净化', status: 'online', value: '98.5', unit: '%', icon: '🌬️' },
  { id: 'eq4', name: '通信链路', status: 'online', value: '256', unit: 'Mbps', icon: '📡' },
  { id: 'eq5', name: '姿态控制', status: 'online', value: '0.02', unit: '°/s', icon: '🛰️' },
]

export const documents: DocumentItem[] = [
  { id: 'doc1', name: '实验方案_流体力学_v3.pdf', status: 'processed', uploadTime: '2026-05-14 10:30', size: '2.4MB' },
  { id: 'doc2', name: '微重力生物效应研究.txt', status: 'processed', uploadTime: '2026-05-13 16:20', size: '156KB' },
  { id: 'doc3', name: '空间站设备维护手册.pdf', status: 'processing', uploadTime: '2026-05-15 14:00', size: '8.7MB' },
]
