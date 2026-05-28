/**
 * 共享记忆模块
 *
 * 用于演示多智能体系统中的历史任务经验复用：只检索与当前请求相关的
 * 少量记忆，并注入本轮 system prompt，避免把完整历史无差别塞进上下文。
 */

export type SharedMemoryLabel = '成功' | '失败'

export interface SharedMemoryRecord {
  id: string
  taskInstruction: string
  agentExecutions: string[]
  label: SharedMemoryLabel
  keywords: string[]
}

export interface SharedMemorySearchResult extends SharedMemoryRecord {
  score: number
  summary: string
}

export const SHARED_MEMORY_RECORDS: SharedMemoryRecord[] = [
  {
    id: 'mem-life-co2-failed',
    taskInstruction: '生命科学舱 CO2 异常导致 MSC 诱导培养任务中断',
    agentExecutions: [
      '实验设计智能体：维持 37.0°C、5% CO2 的细胞培养方案，计划 14 天连续监测。',
      '资源调度智能体：培养箱与显微成像设备串行占用，CO2 传感器校准任务被排到实验启动后。',
      '安全监察智能体：CO2 读数升至 7.8%，超过安全阈值后触发任务暂停。',
      '数据分析智能体：确认 pH 漂移与细胞贴壁率下降相关，建议先恢复气体闭环再重启。',
    ],
    label: '失败',
    keywords: ['生命科学舱', 'CO2', 'CO₂', '异常', '培养', '细胞', 'MSC', '中断', '气体', '安全'],
  },
  {
    id: 'mem-bio-sds-page-failed',
    taskInstruction: '生物技术舱 SDS-PAGE 电泳缓冲液分离异常',
    agentExecutions: [
      '实验设计智能体：设计蛋白质电泳分离流程，目标分辨 20-120 kDa 条带。',
      '资源调度智能体：电泳槽与低温样品架并行准备，凝胶成像安排在电泳结束后。',
      '安全监察智能体：检查电压、电流与缓冲液温度，发现缓冲液离子强度偏离设定。',
      '数据分析智能体：条带拖尾且分离界面弥散，判定缓冲液配比和预冷不足为主因。',
    ],
    label: '失败',
    keywords: ['生物技术舱', 'SDS-PAGE', '蛋白质', '电泳', '缓冲液', '分离', '凝胶', '条带', '异常'],
  },
  {
    id: 'mem-material-cooling-warn',
    taskInstruction: '材料实验舱冷却回路温度偏高，合金凝固曲线出现漂移',
    agentExecutions: [
      '实验设计智能体：执行 Zr 基合金熔融与快速冷却流程。',
      '资源调度智能体：高温炉、冷却回路和显微成像设备按串行依赖调度。',
      '安全监察智能体：发现冷却回路入口温度高于 28°C，建议降低炉体功率并延迟浇注。',
      '数据分析智能体：凝固平台时间延长，标记该批次为部分有效样本。',
    ],
    label: '失败',
    keywords: ['材料实验舱', '材料', '冷却', '回路', '温度', '偏高', '合金', '凝固', '功率'],
  },
  {
    id: 'mem-fluid-fc72-waiting',
    taskInstruction: '流体物理舱 FC-72 液滴注入实验进入资源等待',
    agentExecutions: [
      '实验设计智能体：规划 FC-72 液滴注入、界面追踪和蒸发速率测量。',
      '资源调度智能体：注射泵与高速相机被燃烧科学舱占用，任务进入等待队列。',
      '安全监察智能体：确认舱内压力稳定，等待期间维持样品温度 22°C。',
      '数据分析智能体：建议记录等待时长，避免后续把资源延迟误判为物理滞后。',
    ],
    label: '失败',
    keywords: ['流体物理舱', 'FC-72', '液滴', '注入', '资源', '等待', '注射泵', '高速相机'],
  },
  {
    id: 'mem-combustion-camera-success',
    taskInstruction: '燃烧科学舱高速摄像参数配置成功',
    agentExecutions: [
      '实验设计智能体：设定壬烷液滴点火与火焰传播观测方案。',
      '资源调度智能体：将高速摄像与光谱采集设置为并行组，点火前完成同步触发。',
      '安全监察智能体：确认 O2 浓度 21%、舱压 1 atm、功率余量满足约束。',
      '数据分析智能体：采集 2000 fps 图像序列，火焰半径提取稳定。',
    ],
    label: '成功',
    keywords: ['燃烧科学舱', '燃烧', '高速摄像', '摄像', '参数', '点火', '火焰', '成功'],
  },
  {
    id: 'mem-earth-spectral-calibration-success',
    taskInstruction: '对地观测舱光谱载荷标定成功',
    agentExecutions: [
      '实验设计智能体：规划 VNIR/SWIR 光谱载荷暗场、白板和星上交叉标定。',
      '资源调度智能体：将姿态稳定窗口与载荷标定串行绑定，避开通信高峰。',
      '安全监察智能体：确认载荷温度、功耗与姿态机动速率均在阈值内。',
      '数据分析智能体：标定后信噪比达到 205@550 nm，满足高光谱反演要求。',
    ],
    label: '成功',
    keywords: ['对地观测舱', '光谱', '载荷', '标定', '遥感', '高光谱', 'VNIR', 'SWIR', '成功'],
  },
  {
    id: 'mem-bio-protein-crystal-success',
    taskInstruction: '生物技术舱蛋白样品预处理与低温转运成功',
    agentExecutions: [
      '实验设计智能体：确认蛋白样品离心、缓冲液置换和低温暂存步骤。',
      '资源调度智能体：低温样品架与离心模块串行执行，避免样品反复冻融。',
      '安全监察智能体：监控样品架温度 4°C、舱内功率和门锁状态。',
      '数据分析智能体：样品浓度 CV 为 4.2%，满足后续电泳和结晶筛选要求。',
    ],
    label: '成功',
    keywords: ['生物技术舱', '蛋白', '样品', '预处理', '低温', '缓冲液', '电泳', '结晶'],
  },
  {
    id: 'mem-life-incubator-success',
    taskInstruction: '生命科学舱细胞培养箱气体闭环恢复成功',
    agentExecutions: [
      '实验设计智能体：保留原培养目标，增加气体闭环校验作为前置步骤。',
      '资源调度智能体：先释放成像设备，再调度 CO2 传感器校准和培养箱复核。',
      '安全监察智能体：CO2 稳定回落至 5.1%，温度维持 36.9-37.1°C。',
      '数据分析智能体：恢复后 6 小时细胞形态稳定，建议延长观察窗口。',
    ],
    label: '成功',
    keywords: ['生命科学舱', 'CO2', 'CO₂', '气体', '闭环', '恢复', '培养箱', '细胞', '校准'],
  },
]

const MEMORY_TRIGGER_KEYWORDS = [
  '实验',
  '设计',
  '方案',
  '步骤',
  '参数',
  '调整',
  '优化',
  '异常',
  '故障',
  '告警',
  '处理',
  '中断',
  '怎么',
  '如何',
]

function normalizeText(text: string) {
  return text.toLowerCase().replace(/co₂/g, 'co2')
}

function tokenize(text: string) {
  const normalized = normalizeText(text)
  return [
    ...new Set([
      ...normalized.match(/[a-z0-9][a-z0-9+-]*/g) ?? [],
      ...normalized.match(/[\u4e00-\u9fa5]{2,}/g) ?? [],
    ]),
  ]
}

export function shouldRetrieveSharedMemory(query: string) {
  const normalized = normalizeText(query)
  return MEMORY_TRIGGER_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)))
}

function summarizeExecution(executions: string[]) {
  return executions
    .slice(0, 2)
    .map((item) => item.replace(/^.*?智能体：/, ''))
    .join('；')
}

export function retrieveSharedMemories(query: string, limit = 3): SharedMemorySearchResult[] {
  if (!shouldRetrieveSharedMemory(query)) return []

  const normalizedQuery = normalizeText(query)
  const queryTokens = tokenize(query)

  return SHARED_MEMORY_RECORDS
    .map((memory) => {
      const haystack = normalizeText([
        memory.taskInstruction,
        ...memory.agentExecutions,
        ...memory.keywords,
        memory.label,
      ].join(' '))
      const keywordScore = memory.keywords.reduce((score, keyword) => {
        return normalizedQuery.includes(normalizeText(keyword)) ? score + 4 : score
      }, 0)
      const tokenScore = queryTokens.reduce((score, token) => {
        return haystack.includes(token) ? score + Math.min(3, token.length) : score
      }, 0)
      return {
        ...memory,
        score: keywordScore + tokenScore,
        summary: summarizeExecution(memory.agentExecutions),
      }
    })
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function formatSharedMemoriesForPrompt(memories: SharedMemorySearchResult[]) {
  if (memories.length === 0) {
    return '## 共享记忆检索结果\n未检索到高度相关历史记忆。'
  }

  const body = memories.map((memory, index) => {
    const executions = memory.agentExecutions.map((item) => `[智能体执行] ${item}`).join('\n')
    return [
      `### 记忆 ${index + 1}`,
      `[任务指令] ${memory.taskInstruction}`,
      executions,
      `标签：${memory.label}`,
    ].join('\n')
  }).join('\n\n')

  return `## 共享记忆检索结果\n${body}`
}

export function withSharedMemoryPrompt(systemPrompt: string, memories: SharedMemorySearchResult[]) {
  return `${systemPrompt}\n\n${formatSharedMemoriesForPrompt(memories)}`
}
