/**
 * AstroAgent OS - Skills 路由与意图识别系统
 *
 * 功能：
 * - 识别用户 query 的类型（实验设计 / 知识问答 / 系统查询 / 数据分析）
 * - 根据类型自动调用对应的 system prompt
 * - 从 LLM 响应中提取结构化数据（DAG 步骤）
 * - 支持在对话中嵌入交互式 DAG 编辑器
 */

import type { DagStepDetail } from './types'

// ================================================================
// Skills 定义
// ================================================================

export interface Skill {
  id: string
  name: string
  description: string
  keywords: string[]
  systemPrompt: string
  icon: string
}

export const SKILLS: Skill[] = [
  {
    id: 'experiment-design',
    name: '实验设计',
    description: '设计太空微重力实验方案，包括步骤规划、参数配置、执行计划',
    keywords: ['实验', '设计', '燃烧', '细胞', '流体', '材料', '结晶', '观测', '培养', '步骤', '方案', '参数', '仪器', '执行'],
    icon: 'flask',
    systemPrompt: `你是一个专业的天宫空间站实验设计助手。请根据用户的需求设计完整的微重力实验方案。

**重要**：当用户请求设计实验步骤时，请以结构化格式返回，格式如下：
1. 先用自然语言描述实验背景和目标
2. 然后在回复末尾添加一个特殊标记用于DAG步骤提取：
   [DAG_STEPS_START]
   步骤1:步骤名称|步骤说明|目标1;目标2|参数1:值1:单位;参数2:值2:单位|前提1;前提2|并行组号
   步骤2:步骤名称|步骤说明|目标1;目标2|参数1:值1:单位|前提1;前提2|并行组号
   [DAG_STEPS_END]

**格式说明**：
- 各字段用 | 分隔
- 目标/参数/前提 用 ; 分隔
- 参数格式: key:value:unit
- 并行组号: 同一数字的步骤可并行执行

**舱室参考**：
- 燃烧科学舱：微重力燃烧、火焰结构、Soot 生成研究
- 生命科学舱：细胞培养、蛋白质结晶、组织工程
- 流体物理舱：微重力流体行为、两相流研究
- 材料科学舱：新材料制备、金属合金研究
- 对地观测舱：高光谱遥感数据处理
- 生物技术舱：生物样本制备、分子生物学实验`,
  },
  {
    id: 'knowledge-qa',
    name: '知识问答',
    description: '回答太空科学、空间站运维、技术原理等问题',
    keywords: ['什么是', '为什么', '原理', '介绍', '解释', '多少', '几个', '有哪些', '如何', '怎么', '是否', '能不能'],
    icon: 'book',
    systemPrompt: `你是一个知识渊博的天宫空间站助手。请简洁、准确地回答用户关于太空科学、空间站技术、科学原理等方面的问题。

**回答风格**：
- 简洁明了，优先使用列表和表格组织信息
- 涉及具体数据时标注来源（参考文档）
- 如需引用文档内容，使用标准 Markdown 格式`,
  },
  {
    id: 'data-analysis',
    name: '数据分析',
    description: '分析实验数据、生成报告、解读图表',
    keywords: ['分析', '数据', '报告', '图表', '趋势', '对比', '结果', '统计', '总结', '评估'],
    icon: 'chart',
    systemPrompt: `你是一个数据分析专家。请帮助用户分析实验数据，生成可视化报告和统计摘要。

**分析维度**：
- 趋势分析：识别数据随时间/条件的变化规律
- 对比分析：比较不同实验条件下的结果差异
- 异常检测：识别数据中的异常点和潜在问题
- 统计摘要：提供均值、标准差、相关性等统计指标

**报告格式**：
- 执行摘要：关键发现和结论
- 详细分析：逐项数据解读
- 建议：根据数据给出操作建议`,
  },
  {
    id: 'system-control',
    name: '系统控制',
    description: '查询系统状态、控制设备、告警处理',
    keywords: ['启动', '停止', '暂停', '恢复', '状态', '告警', '错误', '故障', '监控', '设置'],
    icon: 'control',
    systemPrompt: `你是一个天宫空间站系统控制助手。请协助用户进行设备控制、状态查询和告警处理。

**注意**：敏感操作（如紧急停止、参数修改）需要用户确认。
请始终告知用户操作的影响和风险。`,
  },
]

// ================================================================
// Skills 匹配
// ================================================================

export function detectSkill(query: string): Skill {
  const lowerQuery = query.toLowerCase()

  // 计算每个 skill 的匹配分数
  let bestScore = 0
  let bestSkill = SKILLS[0] // 默认使用实验设计

  for (const skill of SKILLS) {
    let score = 0
    for (const keyword of skill.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score++
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestSkill = skill
    }
  }

  return bestSkill
}

// ================================================================
// DAG 步骤提取
// ================================================================

function makeId(prefix = 'step') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function parseDagStepsFromText(text: string): DagStepDetail[] | null {
  // 查找 DAG_STEPS_START 和 DAG_STEPS_END 之间的内容
  const startMarker = '[DAG_STEPS_START]'
  const endMarker = '[DAG_STEPS_END]'

  const startIdx = text.indexOf(startMarker)
  const endIdx = text.indexOf(endMarker)

  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
    return null
  }

  const stepsText = text.slice(startIdx + startMarker.length, endIdx).trim()
  const lines = stepsText.split('\n').filter((l) => l.trim())
  const steps: DagStepDetail[] = []

  for (const line of lines) {
    const parts = line.split('|')
    if (parts.length < 2) continue

    const namePart = parts[0].trim()
    // 格式: 步骤1:名称 或 名称
    const name = namePart.replace(/^(步骤?\d+:?)\s*/i, '').trim()
    const description = parts[1]?.trim() || ''

    const goals = parts[2]?.split(';').map((g) => g.trim()).filter(Boolean) || []
    const paramsRaw = parts[3]?.split(';').map((p) => p.trim()).filter(Boolean) || []
    const instrumentParams = paramsRaw.map((p) => {
      const [key, value, unit = ''] = p.split(':').map((s) => s.trim())
      return { key, value, unit, editable: true } as import('./types').InstrumentParam
    }).filter((p) => p.key)
    const prerequisites = parts[4]?.split(';').map((p) => p.trim()).filter(Boolean) || []
    const parallelGroup = parseInt(parts[5]?.trim() || '0') || 0

    if (name) {
      steps.push({
        id: makeId(),
        name,
        description,
        instrumentParams,
        goals,
        prerequisites,
        parallelGroup,
      })
    }
  }

  return steps.length > 0 ? steps : null
}

// ================================================================
// 意图分类描述
// ================================================================

export function getSkillLabel(skill: Skill): string {
  const labels: Record<string, string> = {
    'experiment-design': '实验设计',
    'knowledge-qa': '知识问答',
    'data-analysis': '数据分析',
    'system-control': '系统控制',
  }
  return labels[skill.id] || skill.name
}
