export type LabModuleStatus = 'standby' | 'running' | 'completed' | 'error' | 'paused'

export interface LabModule {
  id: string
  name: string
  icon: string
  status: LabModuleStatus
  currentTask: string
  progress: number
  eta: string
  temperature: number
  co2: number
  humidity: number
  pressure: number
  dagSteps: DagStep[]
  taskQueue: TaskQueueItem[]
  history: HistoryExperiment[]
}

export interface DagStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  duration?: string
}

export interface TaskQueueItem {
  id: string
  name: string
  assignee: string
  scheduledTime: string
  priority: 'high' | 'medium' | 'low'
}

export interface HistoryExperiment {
  id: string
  name: string
  date: string
  result: 'success' | 'failed' | 'partial'
  summary: string
  dataPoints: number
}

export interface AlertLogEntry {
  id: string
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR'
  source: string
  message: string
}

export interface ComputeNode {
  id: string
  name: string
  cpuUsage: number
  gpuUsage: number
  memoryUsage: number
  cpuTemp: number
  gpuTemp: number
}

export interface GlobalParam {
  label: string
  value: string
  unit: string
  trend: 'up' | 'down' | 'stable'
  icon: string
}

export interface Equipment {
  id: string
  name: string
  status: 'online' | 'offline' | 'warning'
  value: string
  unit: string
  icon: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface DocumentItem {
  id: string
  name: string
  status: 'processing' | 'processed' | 'error'
  uploadTime: string
  size: string
}
