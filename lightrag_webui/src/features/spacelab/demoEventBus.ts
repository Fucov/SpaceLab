import { backendBaseUrl } from '@/lib/constants'
import type { DagStep } from './types'

export type DemoEventType =
  | 'EXPERIMENT_SUBMITTED'
  | 'EXPERIMENT_STARTED'
  | 'EXPERIMENT_STEP_UPDATED'
  | 'EMERGENCY_STOP'

export type DemoEventSource = 'tablet' | 'main'

export interface DemoEvent {
  eventId: string
  timestamp: number
  type: DemoEventType
  source: DemoEventSource
  moduleId: string
  moduleName: string
  title: string
  steps: DagStep[]
  executionMode: string
  gateSummary?: string
}

type DemoEventHandler = (event: DemoEvent) => void

const CHANNEL_NAME = 'tiangong-demo-events'
const STORAGE_KEY = 'tiangong-demo-event'
const API_EVENTS_URL = `${backendBaseUrl}/spacelab/events`
const API_STREAM_URL = `${backendBaseUrl}/spacelab/events/stream`

const isBrowser = () => typeof window !== 'undefined'

function createEventId() {
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `demo-${Date.now()}-${randomPart}`
}

function isDemoEvent(value: unknown): value is DemoEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<DemoEvent>
  return Boolean(event.eventId && event.type && event.source && event.moduleId)
}

function readEvent(raw: string | null) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return isDemoEvent(parsed) ? parsed : null
  } catch {
    return null
  }
}

async function postToBackend(event: DemoEvent) {
  try {
    await fetch(API_EVENTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  } catch {
    // Demo bus deliberately degrades to browser-local channels when the SSE API is absent.
  }
}

export function publishDemoEvent(event: DemoEvent) {
  if (!isBrowser()) return

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.postMessage(event)
    channel.close()
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(event))
  } catch {
    // Ignore storage quota/private-mode failures; BroadcastChannel or SSE may still work.
  }

  void postToBackend(event)
}

export function publishExperimentSubmitted(input: Omit<DemoEvent, 'eventId' | 'timestamp' | 'type' | 'source'>) {
  publishDemoEvent({
    ...input,
    eventId: createEventId(),
    timestamp: Date.now(),
    type: 'EXPERIMENT_SUBMITTED',
    source: 'tablet',
  })
}

export function subscribeDemoEvents(handler: DemoEventHandler) {
  if (!isBrowser()) return () => {}

  let closed = false
  const cleanups: Array<() => void> = []

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (message) => {
      if (isDemoEvent(message.data)) handler(message.data)
    }
    cleanups.push(() => channel.close())
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    const demoEvent = readEvent(event.newValue)
    if (demoEvent) handler(demoEvent)
  }
  window.addEventListener('storage', onStorage)
  cleanups.push(() => window.removeEventListener('storage', onStorage))

  try {
    const stream = new EventSource(API_STREAM_URL)
    stream.onmessage = (message) => {
      const demoEvent = readEvent(message.data)
      if (demoEvent) handler(demoEvent)
    }
    stream.onerror = () => {
      stream.close()
    }
    cleanups.push(() => stream.close())
  } catch {
    // Same-device demo remains available through BroadcastChannel/localStorage.
  }

  return () => {
    if (closed) return
    closed = true
    cleanups.forEach((cleanup) => cleanup())
  }
}
