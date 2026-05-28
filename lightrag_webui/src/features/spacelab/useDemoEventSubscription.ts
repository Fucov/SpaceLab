import { useEffect } from 'react'
import { subscribeDemoEvents, type DemoEvent } from './demoEventBus'
import { useSpaceLabStore } from './store'

const PROCESSED_EVENT_IDS_KEY = 'tiangong-demo-processed-event-ids'
const MAX_STORED_EVENT_IDS = 80

const processedEventIds = new Set<string>()

function loadProcessedEventIds() {
  if (processedEventIds.size > 0 || typeof window === 'undefined') return
  try {
    const ids = JSON.parse(window.sessionStorage.getItem(PROCESSED_EVENT_IDS_KEY) || '[]')
    if (Array.isArray(ids)) {
      ids.filter((id): id is string => typeof id === 'string').forEach((id) => processedEventIds.add(id))
    }
  } catch {
    // Session storage is only a StrictMode/refresh guard; in-memory de-dupe still works.
  }
}

function rememberEventId(eventId: string) {
  processedEventIds.add(eventId)
  if (typeof window === 'undefined') return
  try {
    const ids = [...processedEventIds].slice(-MAX_STORED_EVENT_IDS)
    window.sessionStorage.setItem(PROCESSED_EVENT_IDS_KEY, JSON.stringify(ids))
  } catch {
    // Ignore private-mode storage failures.
  }
}

function hasHandled(eventId: string) {
  loadProcessedEventIds()
  return processedEventIds.has(eventId)
}

function handleSubmittedExperiment(event: DemoEvent) {
  const store = useSpaceLabStore.getState()

  store.receiveDemoExperimentTask({
    eventId: event.eventId,
    moduleId: event.moduleId,
    moduleName: event.moduleName,
    title: event.title,
    steps: event.steps,
    executionMode: event.executionMode,
    gateSummary: event.gateSummary,
  })
  store.selectModule(event.moduleId)
  store.executeExperiment(event.moduleId, event.steps)

  window.setTimeout(() => {
    const current = useSpaceLabStore.getState().selectedModuleId
    if (current === event.moduleId) {
      useSpaceLabStore.getState().selectModule(null)
    }
  }, 3000)
}

export function useDemoEventSubscription() {
  useEffect(() => {
    loadProcessedEventIds()

    return subscribeDemoEvents((event) => {
      if (event.source !== 'tablet') return
      if (hasHandled(event.eventId)) return

      rememberEventId(event.eventId)

      if (event.type === 'EXPERIMENT_SUBMITTED') {
        handleSubmittedExperiment(event)
        return
      }

      if (event.type === 'EMERGENCY_STOP') {
        useSpaceLabStore.getState().emergencyStop()
      }
    })
  }, [])
}
