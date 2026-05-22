/**
 * AstroAgent OS - 模拟数据
 *
 * 设计原则：贴近真实天宫空间站实验场景
 * - 每个实验舱有真实的实验主题和步骤
 * - 已完成实验含多组原始数据（可点击查看）
 * - 数据涵盖温度/压力/粒子/光谱等多种类型
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

// ================================================================
// 实验舱数据
// ================================================================

export const labModules: LabModule[] = [
  // ------------------------------------------------------------
  // 生命科学舱 - 运行中：微重力细胞培养实验
  // ------------------------------------------------------------
  {
    id: 'life-science',
    name: '生命科学舱',
    icon: '🧬',
    status: 'running',
    currentTask: '间充质干细胞微重力诱导分化实验',
    currentStepIndex: 2,
    progress: 62,
    eta: '2026-05-16 14:30',
    temperature: 37.2,
    co2: 0.048,
    humidity: 78.4,
    pressure: 101.3,
    power: 52,
    moduleType: 'life_science',
    dagSteps: [
      { id: 'ls1', name: '细胞复苏', status: 'completed', duration: '25min', parallelGroup: 0 },
      { id: 'ls2a', name: '培养基配制', status: 'completed', duration: '18min', parallelGroup: 1, resourceLock: 'physical' },
      { id: 'ls2b', name: 'CO₂培养箱预热', status: 'completed', duration: '20min', parallelGroup: 1, resourceLock: 'physical' },
      { id: 'ls3', name: '细胞接种', status: 'running', duration: '进行中', parallelGroup: 2, isActive: true, resourceLock: 'physical' },
      { id: 'ls4', name: '微重力诱导培养', status: 'pending', parallelGroup: 3, resourceLock: 'physical' },
      { id: 'ls5', name: '荧光染色与成像', status: 'pending', parallelGroup: 4, resourceLock: 'llm' },
      { id: 'ls6', name: '流式细胞分析', status: 'pending', parallelGroup: 4, resourceLock: 'llm' },
    ],
    taskQueue: [
      { id: 'ls-q1', name: '拟南芥基因表达分析', assignee: '张伟', scheduledTime: '16:00', priority: 'high' },
      { id: 'ls-q2', name: '蛋白质结晶筛选', assignee: '李明', scheduledTime: '19:00', priority: 'medium' },
    ],
    history: [
      {
        id: 'ls-h1',
        name: '骨组织工程干细胞分化研究',
        date: '2026-05-10',
        result: 'success',
        summary: '在微重力环境下成功诱导间充质干细胞向成骨细胞分化，分化效率达78.3%，显著高于地面对照组(45.1%)。钙结节染色阳性率提高67%。',
        dataPoints: 24580,
        dataGroups: [
          {
            id: 'g1', label: '实验组(μG)', description: '微重力环境下的细胞增殖曲线',
            type: 'temperature',
            color: '#3b82f6',
            data: [1.0, 1.82, 2.65, 3.41, 4.28, 5.12, 6.05, 6.89, 7.54, 8.21, 8.76, 9.18],
            timestamps: ['Day0','Day1','Day2','Day3','Day4','Day5','Day6','Day7','Day8','Day9','Day10','Day11'],
            metadata: { '细胞密度': '1×10⁵ cells/mL', '培养基': 'α-MEM+10%FBS', 'CO₂': '5%' },
          },
          {
            id: 'g2', label: '地面对照组(1G)', description: '正常重力环境下的细胞增殖曲线',
            type: 'temperature',
            color: '#94a3b8',
            data: [1.0, 1.65, 2.28, 2.91, 3.42, 4.05, 4.62, 5.18, 5.71, 6.12, 6.58, 6.95],
            timestamps: ['Day0','Day1','Day2','Day3','Day4','Day5','Day6','Day7','Day8','Day9','Day10','Day11'],
            metadata: { '细胞密度': '1×10⁵ cells/mL', '培养基': 'α-MEM+10%FBS', 'CO₂': '5%' },
          },
          {
            id: 'g3', label: 'ALP活性(U/L)', description: '碱性磷酸酶活性随时间变化',
            type: 'multi',
            color: '#10b981',
            data: [42.3, 48.7, 62.1, 85.4, 112.8, 148.2, 182.5, 208.4, 225.1, 238.6, 245.2, 248.9],
            timestamps: ['Day0','Day1','Day2','Day3','Day4','Day5','Day6','Day7','Day8','Day9','Day10','Day11'],
          },
        ],
      },
      {
        id: 'ls-h2',
        name: '线虫肌肉萎缩太空实验',
        date: '2026-05-05',
        result: 'success',
        summary: '观察到太空环境下线虫肌动蛋白F-actin含量下降32%，肌原纤维结构异常，与地面模拟微重力结果高度吻合。',
        dataPoints: 12800,
        dataGroups: [
          {
            id: 'g1', label: 'F-actin相对含量(%)', description: '肌动蛋白F-actin含量变化',
            type: 'multi', color: '#f59e0b',
            data: [100, 97.2, 94.8, 91.3, 87.6, 82.4, 78.9, 74.2, 71.5, 68.8, 67.3, 68.1],
            timestamps: ['D0','D2','D4','D6','D8','D10','D12','D14','D16','D18','D20','D22'],
            metadata: { '样本量': 'n=120', '温度': '20±0.5°C' },
          },
          {
            id: 'g2', label: '肌节长度(μm)', description: '肌原纤维肌节长度统计',
            type: 'particle_size', color: '#ef4444',
            data: [1.82, 1.78, 1.71, 1.65, 1.58, 1.52, 1.48, 1.45, 1.44, 1.43, 1.43, 1.43],
            timestamps: ['D0','D2','D4','D6','D8','D10','D12','D14','D16','D18','D20','D22'],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------
  // 流体物理舱 - 运行中：毛细管两相流实验
  // ------------------------------------------------------------
  {
    id: 'fluid-physics',
    name: '流体物理舱',
    icon: '🌊',
    status: 'running',
    currentTask: '毛细管内液-液界面行为研究',
    currentStepIndex: 1,
    progress: 38,
    eta: '2026-05-16 18:45',
    temperature: 21.8,
    co2: 0.031,
    humidity: 42.1,
    pressure: 101.1,
    power: 41,
    moduleType: 'fluid_physics',
    dagSteps: [
      { id: 'fp1a', name: '毛细管腔体清洗', status: 'completed', duration: '15min', parallelGroup: 0 },
      { id: 'fp1b', name: '工质预热至25°C', status: 'completed', duration: '20min', parallelGroup: 0, resourceLock: 'physical' },
      { id: 'fp2a', name: '液相注入(FC-72)', status: 'running', duration: '进行中', parallelGroup: 1, isActive: true, resourceLock: 'physical' },
      { id: 'fp2b', name: '高速摄像参数配置', status: 'running', duration: '进行中', parallelGroup: 1, resourceLock: 'physical' },
      { id: 'fp3', name: '界面张力测定', status: 'pending', parallelGroup: 2, resourceLock: 'physical' },
      { id: 'fp4', name: '接触角测量', status: 'pending', parallelGroup: 2, resourceLock: 'physical' },
      { id: 'fp5', name: '数据反传地面', status: 'pending', parallelGroup: 3, resourceLock: 'llm' },
    ],
    taskQueue: [
      { id: 'fp-q1', name: '液滴碰撞融合实验', assignee: '王芳', scheduledTime: '20:00', priority: 'high' },
    ],
    history: [
      {
        id: 'fp-h1',
        name: '沸腾传热临界热流密度研究',
        date: '2026-05-08',
        result: 'success',
        summary: '在微重力环境下测得FC-72临界热流密度(CHF)为12.4 W/cm²，低于地面值(18.2 W/cm²)，分析了气泡行为差异对传热的影响机制。',
        dataPoints: 36200,
        
        
        dataGroups: [
          {
            id: 'g1', label: 'CHF随压力变化', description: '临界热流密度随系统压力变化曲线',
            type: 'pressure', color: '#3b82f6',
            data: [6.8, 8.2, 10.1, 11.5, 12.4, 12.9, 13.2, 13.0],
            timestamps: ['0.05','0.1','0.2','0.3','0.4','0.5','0.6','0.7'],
            metadata: { '工质': 'FC-72', '加热方式': '恒功率', '接触角': '15°' },
          },
          {
            id: 'g2', label: '壁面过热度(°C)', description: '壁面过热度随热流密度变化',
            type: 'temperature', color: '#ef4444',
            data: [2.1, 4.3, 7.2, 10.8, 15.4, 22.1, 31.5, 38.2],
            timestamps: ['2','4','6','8','10','12','14','16'],
            metadata: { '接触角': '15°', '毛细管内径': '2mm' },
          },
          {
            id: 'g3', label: '气泡脱离直径(μm)', description: '不同过热度下气泡脱离直径分布',
            type: 'particle_size', color: '#10b981',
            data: [180, 240, 310, 385, 420, 445, 410, 380],
            timestamps: ['2°C','4°C','6°C','8°C','10°C','12°C','14°C','16°C'],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------
  // 材料实验舱 - 已完成：锆基金属玻璃制备
  // ------------------------------------------------------------
  {
    id: 'material-exp',
    name: '材料实验舱',
    icon: '🔬',
    status: 'completed',
    currentTask: 'Zr基块体金属玻璃热稳定性研究',
    currentStepIndex: 5,
    progress: 100,
    eta: '已完成',
    temperature: 23.5,
    co2: 0.028,
    humidity: 35.2,
    pressure: 101.2,
    power: 28,
    moduleType: 'material',
    dagSteps: [
      { id: 'me1', name: '合金配料与清洗', status: 'completed', duration: '30min', parallelGroup: 0 },
      { id: 'me2', name: '电弧熔炼(5N纯度原料)', status: 'completed', duration: '45min', parallelGroup: 0 },
      { id: 'me3a', name: '铜模吸铸成型', status: 'completed', duration: '20min', parallelGroup: 1, resourceLock: 'physical' },
      { id: 'me3b', name: '热处理退火', status: 'completed', duration: '120min', parallelGroup: 1, resourceLock: 'physical' },
      { id: 'me4', name: 'XRD结构表征', status: 'completed', duration: '40min', parallelGroup: 2, resourceLock: 'llm' },
      { id: 'me5', name: '热力学性能测试', status: 'completed', duration: '60min', parallelGroup: 2, resourceLock: 'llm' },
    ],
    taskQueue: [],
    history: [
      {
        id: 'me-h1',
        name: 'Zr₅₈Cu₂₂Fe₈Al₁₂块体金属玻璃制备',
        date: '2026-05-14',
        result: 'success',
        summary: '成功制备直径8mm的Zr基块体金属玻璃，玻璃形成能力(GFA)参数Tg/Tl=0.62，过冷液相区ΔTx=68K，热稳定性优异。XRD确认完全非晶结构，HRTEM未观察到晶格条纹。',
        dataPoints: 48920,
        
        
        dataGroups: [
          {
            id: 'g1', label: 'DSC热流曲线', description: '差示扫描量热法测量玻璃化转变和晶化过程',
            type: 'spectral', color: '#3b82f6',
            data: [-0.12, -0.08, 0.05, 0.42, 1.85, 3.21, 2.15, -0.45, -0.21, -0.09],
            timestamps: ['400','450','500','550','600','650','700','750','800','850'],
            metadata: { '升温速率': '20 K/min', '气氛': 'Ar 99.999%', '样品质量': '28.5mg' },
          },
          {
            id: 'g2', label: '直径分布(μm)', description: '粉末粒度分布统计',
            type: 'particle_size', color: '#f59e0b',
            data: [12, 45, 128, 285, 420, 510, 385, 210, 95, 38],
            timestamps: ['<5','5-20','20-50','50-100','100-200','200-400','400-600','600-800','800-1000','>1000'],
            metadata: { '雾化压力': '3.5MPa', '粉末得率': '67.2%' },
          },
          {
            id: 'g3', label: 'Vickers硬度(Hv)', description: '不同退火温度下的维氏硬度',
            type: 'multi', color: '#10b981',
            data: [542, 538, 545, 551, 548, 530, 485, 420, 380, 360],
            timestamps: ['200°C','250°C','300°C','350°C','400°C','450°C','500°C','550°C','600°C','650°C'],
            metadata: { '载荷': '200gf', '保载时间': '15s', '测量次数': 'n=10' },
          },
        ],
      },
      {
        id: 'me-h2',
        name: '半导体级硅晶体生长实验',
        date: '2026-05-03',
        result: 'partial',
        summary: 'CZ法单晶硅生长长度82mm，位错密度1.8×10⁴ cm⁻²，电阻率0.8-1.2 Ω·cm，达到设计指标的85%。籽晶区域出现少量微孪晶。',
        dataPoints: 31500,
        
        
        dataGroups: [
          {
            id: 'g1', label: '温度梯度(°C/cm)', description: '炉膛轴向温度梯度分布',
            type: 'temperature', color: '#ef4444',
            data: [45.2, 38.1, 28.5, 18.2, 10.5, 5.8, 3.2, 1.8, 1.2, 0.8],
            timestamps: ['0mm','10mm','20mm','30mm','40mm','50mm','60mm','70mm','80mm','90mm'],
            metadata: { '加热器功率': '12kW', '坩埚转速': '8rpm', '晶体转速': '12rpm' },
          },
          {
            id: 'g2', label: '晶体直径(mm)', description: '等径生长阶段直径变化',
            type: 'pressure', color: '#3b82f6',
            data: [28, 48, 65, 82, 83, 82, 81, 80, 78, 72],
            timestamps: ['0h','2h','4h','6h','8h','10h','12h','14h','16h','18h'],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------
  // 燃烧科学舱 - 已完成：煤油滴燃烧研究
  // ------------------------------------------------------------
  {
    id: 'combustion',
    name: '燃烧科学舱',
    icon: '🔥',
    status: 'completed',
    currentTask: '煤油单液滴燃烧soot生成机理研究',
    currentStepIndex: 4,
    progress: 100,
    eta: '已完成',
    temperature: 23.2,
    co2: 0.042,
    humidity: 40.3,
    pressure: 101.0,
    power: 18,
    moduleType: 'combustion',
    dagSteps: [
      { id: 'cb1', name: '气氛配制(O₂/N₂比例可调)', status: 'completed', duration: '25min', parallelGroup: 0 },
      { id: 'cb2', name: '液滴悬挂与定位', status: 'completed', duration: '10min', parallelGroup: 0 },
      { id: 'cb3', name: '点火触发(激光)', status: 'completed', duration: '5min', parallelGroup: 1 },
      { id: 'cb4', name: '高速摄影记录(10000fps)', status: 'completed', duration: '90min', parallelGroup: 1, resourceLock: 'physical' },
      { id: 'cb5', name: 'Soot光谱采集', status: 'completed', duration: '60min', parallelGroup: 2, resourceLock: 'llm' },
      { id: 'cb6', name: '数据离线分析', status: 'completed', duration: '120min', parallelGroup: 2, resourceLock: 'llm' },
    ],
    taskQueue: [],
    history: [
      {
        id: 'cb-h1',
        name: '壬烷单液滴微重力燃烧soot演化研究',
        date: '2026-05-12',
        result: 'success',
        summary: '在微重力环境下观测到煤油液滴燃烧形成的独特球形火焰结构，测得soot inception延迟时间比地面延长约40%，peak soot浓度位置外移，分析了浮力缺失对燃烧和碳黑生成的影响。',
        dataPoints: 156000,
        
        
        dataGroups: [
          {
            id: 'g1', label: '液滴直径平方d² (mm²)', description: '液滴直径平方随时间变化(经典d²定律)',
            type: 'temperature', color: '#3b82f6',
            data: [1.0, 0.91, 0.82, 0.74, 0.65, 0.57, 0.48, 0.40, 0.33, 0.25, 0.18, 0.12, 0.06],
            timestamps: ['0s','1s','2s','3s','4s','5s','6s','7s','8s','9s','10s','11s','12s'],
            metadata: { '初始直径': '2.0mm', '环境压力': '1atm', 'O₂浓度': '21%' },
          },
          {
            id: 'g2', label: '火焰温度(K)', description: '火焰前锋温度分布',
            type: 'spectral', color: '#ef4444',
            data: [298, 1050, 1520, 1880, 2100, 2180, 2150, 2050, 1900, 1700, 1450, 1100],
            timestamps: ['r=0','r=0.2d','r=0.4d','r=0.6d','r=0.8d','r=1.0d','r=1.2d','r=1.4d','r=1.6d','r=1.8d','r=2.0d','r>2.0d'],
            metadata: { '测量方法': '双色法', '帧率': '10000fps', '空间分辨率': '50μm' },
          },
          {
            id: 'g3', label: 'Soot体积分数(ppm)', description: '火焰内soot体积分数分布',
            type: 'particle_size', color: '#f59e0b',
            data: [0, 0.1, 0.8, 2.5, 5.2, 8.1, 6.8, 4.2, 2.1, 0.8, 0.2, 0],
            timestamps: ['r=0','r=0.2d','r=0.4d','r=0.6d','r=0.8d','r=1.0d','r=1.2d','r=1.4d','r=1.6d','r=1.8d','r=2.0d','r>2.0d'],
            metadata: { '测量方法': '激光诱导灼灭(LII)', '激光波长': '1064nm' },
          },
          {
            id: 'g4', label: '燃烧速率K (mm²/s)', description: '不同O₂浓度下的燃烧速率',
            type: 'multi', color: '#10b981',
            data: [0.24, 0.32, 0.41, 0.52, 0.65, 0.80],
            timestamps: ['21%','25%','30%','40%','50%','60%'],
            metadata: { '初始直径': '2.0mm', '环境压力': '1atm', '实验次数': 'n=6' },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------
  // 对地观测舱 - 运行中：高光谱遥感
  // ------------------------------------------------------------
  {
    id: 'earth-observe',
    name: '对地观测舱',
    icon: '🌍',
    status: 'running',
    currentTask: '西北太平洋黑潮区域高光谱成像',
    currentStepIndex: 2,
    progress: 45,
    eta: '2026-05-16 22:00',
    temperature: 18.2,
    co2: 0.032,
    humidity: 35.8,
    pressure: 101.4,
    power: 95,
    moduleType: 'earth_observe',
    dagSteps: [
      { id: 'eo1', name: '轨道预报与目标定位', status: 'completed', duration: '30min', parallelGroup: 0 },
      { id: 'eo2', name: '光谱仪热控与校准', status: 'completed', duration: '45min', parallelGroup: 0, resourceLock: 'physical' },
      { id: 'eo3a', name: '可见-近红外成像', status: 'running', duration: '进行中', parallelGroup: 1, isActive: true, resourceLock: 'physical' },
      { id: 'eo3b', name: '短波红外成像', status: 'running', duration: '进行中', parallelGroup: 1, resourceLock: 'physical' },
      { id: 'eo4', name: '实时辐射校正', status: 'pending', parallelGroup: 2, resourceLock: 'llm' },
      { id: 'eo5', name: '数据压缩与下传', status: 'pending', parallelGroup: 3, resourceLock: 'llm' },
    ],
    taskQueue: [
      { id: 'eo-q1', name: '青藏高原冰川变化监测', assignee: '刘洋', scheduledTime: '04:00', priority: 'high' },
      { id: 'eo-q2', name: '华北平原农作物分类', assignee: '陈峰', scheduledTime: '06:00', priority: 'medium' },
    ],
    history: [
      {
        id: 'eo-h1',
        name: '南海叶绿素浓度时空分布研究',
        date: '2026-05-06',
        result: 'success',
        summary: '利用天宫高光谱仪获取南海海域叶绿素a浓度分布图，浓度范围0.08-8.2 mg/m³，与MODIS卫星产品对比相关性R²=0.87。发现夏季上升流区域存在高浓度叶绿素聚集现象。',
        dataPoints: 842000,
        
        
        dataGroups: [
          {
            id: 'g1', label: '叶绿素a浓度(mg/m³)', description: '不同站位叶绿素a浓度分布',
            type: 'multi', color: '#3b82f6',
            data: [0.12, 0.18, 0.32, 0.45, 0.68, 0.95, 1.42, 2.15, 3.28, 4.82, 6.15, 7.42, 8.18, 7.65, 6.20],
            timestamps: ['St01','St02','St03','St04','St05','St06','St07','St08','St09','St10','St11','St12','St13','St14','St15'],
            metadata: { '卫星轨道': 'LST 02:30', '空间分辨率': '30m', '覆盖范围': '110°E-120°E,15°N-25°N' },
          },
          {
            id: 'g2', label: '遥感反射率Rrs(sr⁻¹)', description: '水体遥感反射率光谱曲线',
            type: 'spectral', color: '#10b981',
            data: [0.008, 0.012, 0.018, 0.025, 0.038, 0.055, 0.072, 0.085, 0.072, 0.048, 0.025, 0.012, 0.006],
            timestamps: ['400nm','420nm','450nm','490nm','520nm','550nm','580nm','620nm','670nm','700nm','750nm','800nm','850nm'],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------
  // 生物技术舱 - 异常：蛋白质电泳实验
  // ------------------------------------------------------------
  {
    id: 'bio-experiment',
    name: '生物技术舱',
    icon: '🧫',
    status: 'error',
    currentTask: 'SDS-PAGE蛋白质电泳分析 (异常中断)',
    currentStepIndex: 1,
    progress: 52,
    eta: '暂停',
    temperature: 25.8,
    co2: 0.052,
    humidity: 52.4,
    pressure: 100.9,
    power: 18,
    moduleType: 'bio',
    dagSteps: [
      { id: 'be1', name: '样品裂解与定量', status: 'completed', duration: '40min', parallelGroup: 0 },
      { id: 'be2', name: 'SDS-PAGE电泳分离', status: 'error', duration: '异常中断', parallelGroup: 1, isActive: true },
      { id: 'be3', name: '考马斯亮蓝染色', status: 'pending', parallelGroup: 2 },
      { id: 'be4', name: '凝胶成像与条带分析', status: 'pending', parallelGroup: 3, resourceLock: 'llm' },
    ],
    taskQueue: [
      { id: 'be-q1', name: 'CRISPR基因编辑效率检测', assignee: '陈静', scheduledTime: '待定', priority: 'high' },
    ],
    history: [
      {
        id: 'be-h1',
        name: '微重力下蛋白质结晶质量评估',
        date: '2026-05-01',
        result: 'failed',
        summary: '溶菌酶结晶实验因培养箱温度失控导致失败。温度最高达32°C(设定20°C)，超过蛋白质变性阈值，样品全部失活。教训：需增加独立温度监控告警。',
        dataPoints: 4200,
        
        
        dataGroups: [
          {
            id: 'g1', label: '培养箱温度(°C)', description: '温度失控过程记录',
            type: 'temperature', color: '#ef4444',
            data: [20.1, 20.3, 21.2, 23.8, 26.4, 28.9, 30.2, 31.5, 32.1, 31.8, 30.5],
            timestamps: ['00:00','02:00','04:00','06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00'],
            metadata: { '设定温度': '20°C', '告警阈值': '25°C', '超时': '持续超温4h' },
          },
        ],
      },
      {
        id: 'be-h2',
        name: '荧光蛋白折叠效率研究',
        date: '2026-04-25',
        result: 'success',
        summary: '在微重力条件下表达的EGFP蛋白折叠效率达到94.2%，比地面表达(82.5%)提高14.2%。圆二色谱证实折叠构象正确，荧光强度提高11.8%。',
        dataPoints: 18600,
        
        
        dataGroups: [
          {
            id: 'g1', label: '荧光强度(a.u.)', description: 'EGFP荧光强度随表达时间变化',
            type: 'multi', color: '#3b82f6',
            data: [0.12, 0.35, 0.82, 1.54, 2.68, 4.12, 5.85, 7.42, 8.68, 9.42, 9.85, 10.12, 10.24],
            timestamps: ['0h','2h','4h','6h','8h','10h','12h','14h','16h','18h','20h','22h','24h'],
            metadata: { '激发波长': '488nm', '发射波长': '509nm', '温度': '25°C' },
          },
        ],
      },
    ],
  },
]

// ================================================================
// 告警日志
// ================================================================

export const alertLogs: AlertLogEntry[] = [
  { id: 'a1', timestamp: '20:15:32', level: 'ERROR', source: '生物技术舱', message: 'SDS-PAGE电泳仪电流骤降保护触发(实测: 85mA → 12mA)，自动断电。中段电泳分离未完成。' },
  { id: 'a2', timestamp: '20:10:18', level: 'WARN', source: '生命科学舱', message: 'CO₂培养箱CO₂浓度0.048%，接近告警阈值0.05%，建议补充培养箱CO₂气源。' },
  { id: 'a3', timestamp: '19:48:05', level: 'INFO', source: '对地观测舱', message: '高光谱仪第7轨成像完成，有效覆盖面积4.2×10⁵ km²，数据量48.7GB。' },
  { id: 'a4', timestamp: '19:35:22', level: 'WARN', source: '材料实验舱', message: '锆基金属玻璃实验后冷却水回路温度偏高(+3.2°C)，建议下次实验前检查冷却效率。' },
  { id: 'a5', timestamp: '19:20:45', level: 'INFO', source: '系统', message: '燃烧科学舱壬烷燃烧实验数据已完整下传至北京航天飞控中心，原始数据量312GB。' },
  { id: 'a6', timestamp: '19:08:11', level: 'WARN', source: '流体物理舱', message: 'FC-72工质储罐液位偏低(18%)，低于安全余量(25%)，下次实验前需补充工质。' },
  { id: 'a7', timestamp: '18:55:33', level: 'INFO', source: '系统', message: '空间站轨道维持机动完成，当前轨道高度389.2 km，倾角41.5°，姿态稳定。' },
  { id: 'a8', timestamp: '18:40:08', level: 'ERROR', source: '公共设备', message: '液冷循环泵B出口压力异常(0.42MPa → 0.18MPa)，系统自动切换至泵A，泵B需检修。' },
  { id: 'a9', timestamp: '18:25:44', level: 'INFO', source: '生命科学舱', message: '间充质干细胞培养温度维持在37.2±0.3°C，符合实验要求(+/-0.5°C)。' },
  { id: 'a10', timestamp: '18:10:22', level: 'WARN', source: '对地观测舱', message: '太阳同步轨道光照条件变化，太阳能帆板发电效率下降12%，观测窗口时间缩短。' },
  { id: 'a11', timestamp: '17:55:18', level: 'INFO', source: '材料实验舱', message: '锆基金属玻璃热稳定性实验样品已转移至储存位，XRD数据已归档至实验数据库。' },
  { id: 'a12', timestamp: '17:30:05', level: 'WARN', source: '生物技术舱', message: '生物安全柜HEPA过滤器压差告警，需在72小时内更换过滤器。' },
]

// ================================================================
// 算力池
// ================================================================

export const computePoolMetrics: ComputePoolMetrics = {
  totalCpuCores: 384,
  totalGpuUnits: 12,
  totalRamGB: 2048,
  networkBandwidthMbps: 10000,
  cpuUsagePercent: 58,
  gpuUsagePercent: 74,
  ramUsagePercent: 65,
  networkUsagePercent: 42,
  cpuTemp: 52,
  gpuTemp: 71,
}

// ================================================================
// 智能体调度
// ================================================================

export const agentMetrics: AgentMetrics = {
  llmTokenRate: 14280,
  concurrentTasks: 6,
  inferenceLatencyMs: 218,
  activeResourceLocks: [
    { id: 'rl1', type: 'physical', resourceName: '机械臂#02', holderTask: '细胞接种操作', moduleName: '生命科学舱' },
    { id: 'rl2', type: 'physical', resourceName: '高速相机#01', holderTask: '液滴界面高速摄影', moduleName: '流体物理舱' },
    { id: 'rl3', type: 'llm', resourceName: 'LLM推理单元A', holderTask: '高光谱辐射校正', moduleName: '对地观测舱' },
    { id: 'rl4', type: 'llm', resourceName: 'LLM推理单元B', holderTask: 'Soot光谱分析', moduleName: '燃烧科学舱' },
  ],
}

// ================================================================
// 全局参数
// ================================================================

export const globalParams: GlobalParam[] = [
  { label: '舱内温度', value: '21.8', unit: '°C', trend: 'stable', icon: '🌡️' },
  { label: '相对湿度', value: '48.2', unit: '%', trend: 'up', icon: '💧' },
  { label: '总气压', value: '101.2', unit: 'kPa', trend: 'stable', icon: '🔵' },
  { label: '背景噪声', value: '52.1', unit: 'dB', trend: 'stable', icon: '🔊' },
]

// ================================================================
// 公共设备
// ================================================================

export const equipment: Equipment[] = [
  { id: 'eq1', name: '主供电网', status: 'online', value: '12.8', unit: 'kW', icon: '⚡' },
  { id: 'eq2', name: '液冷循环', status: 'warning', value: '3.1', unit: 'L/min', icon: '❄️' },
  { id: 'eq3', name: '空气净化', status: 'online', value: '99.2', unit: '%', icon: '🌬️' },
  { id: 'eq4', name: '通信链路', status: 'online', value: '256', unit: 'Mbps', icon: '📡' },
  { id: 'eq5', name: '姿态控制', status: 'online', value: '0.01', unit: '°/s', icon: '🛰️' },
]

// ================================================================
// 电力分配
// ================================================================

export const arbitrationAllocations: ArbitrationAllocation[] = [
  {
    id: 'power-1',
    sourceName: '主供电网',
    sourceTotal: 12.8,
    sourceUnit: 'kW',
    targets: [
      { moduleId: 'life-science', moduleName: '生命科学舱', percentage: 28, currentValue: 3.58, unit: 'kW', color: '#3b82f6' },
      { moduleId: 'fluid-physics', moduleName: '流体物理舱', percentage: 18, currentValue: 2.30, unit: 'kW', color: '#06b6d4' },
      { moduleId: 'material-exp', moduleName: '材料实验舱', percentage: 15, currentValue: 1.92, unit: 'kW', color: '#f59e0b' },
      { moduleId: 'earth-observe', moduleName: '对地观测舱', percentage: 22, currentValue: 2.82, unit: 'kW', color: '#10b981' },
      { moduleId: 'bio-experiment', moduleName: '生物技术舱', percentage: 12, currentValue: 1.54, unit: 'kW', color: '#8b5cf6' },
      { moduleId: 'combustion', moduleName: '燃烧科学舱', percentage: 5, currentValue: 0.64, unit: 'kW', color: '#ef4444' },
    ],
  },
]

// ================================================================
// 文档
// ================================================================

export const documents: DocumentItem[] = [
  { id: 'doc1', name: '天宫空间站微重力实验手册_v4.2.pdf', status: 'processed', uploadTime: '2026-05-10 09:15', size: '4.2MB', contentSummary: '包含6个实验舱的标准操作程序(SOP)，涵盖安全规范、设备操作、数据管理等内容。', chunksCount: 128 },
  { id: 'doc2', name: '微重力燃烧物理基础.txt', status: 'processed', uploadTime: '2026-05-08 14:30', size: '2.1MB', contentSummary: '燃烧科学舱实验理论基础，包括火焰结构、Soot生成机理、对流与辐射传热等。', chunksCount: 64 },
  { id: 'doc3', name: '蛋白质太空结晶实验方案.pdf', status: 'processed', uploadTime: '2026-05-06 11:20', size: '1.8MB', contentSummary: '生物技术舱蛋白质结晶实验方案，含结晶条件优化、晶体质控标准。', chunksCount: 52 },
  { id: 'doc4', name: '高光谱遥感数据处理指南.pdf', status: 'processing', uploadTime: '2026-05-15 16:45', size: '6.5MB', chunksCount: null },
  { id: 'doc5', name: '间充质干细胞培养SOP_v2.pdf', status: 'processed', uploadTime: '2026-05-12 08:00', size: '890KB', contentSummary: '生命科学舱间充质干细胞培养标准操作规程，含细胞复苏、传代、冻存等流程。', chunksCount: 28 },
]

// ================================================================
// 活跃任务追踪
// ================================================================

export const activeTaskTrackers: ActiveTaskTracker[] = [
  { id: 'tracker-1', moduleId: 'life-science', moduleName: '生命科学舱', icon: '🧬', currentStep: '细胞接种', currentStepIndex: 3, totalSteps: 7, status: 'running' },
  { id: 'tracker-2', moduleId: 'fluid-physics', moduleName: '流体物理舱', icon: '🌊', currentStep: '液相注入 || 高速摄像配置 (并行)', currentStepIndex: 2, totalSteps: 5, status: 'running' },
  { id: 'tracker-3', moduleId: 'earth-observe', moduleName: '对地观测舱', icon: '🌍', currentStep: '可见-近红外 || 短波红外成像 (并行)', currentStepIndex: 3, totalSteps: 5, status: 'running' },
  { id: 'tracker-4', moduleId: 'bio-experiment', moduleName: '生物技术舱', icon: '🧫', currentStep: 'SDS-PAGE电泳分离 (异常中断)', currentStepIndex: 2, totalSteps: 4, status: 'error', blockedReason: '电泳仪电流骤降保护触发' },
]
