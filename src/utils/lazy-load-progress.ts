import { useSyncExternalStore } from 'react'

type LazyTaskStatus = 'pending' | 'fulfilled' | 'rejected'

interface LazyTask {
  id: number
  label: string
  status: LazyTaskStatus
}

export interface LazyLoadProgressSnapshot {
  activeCount: number
  completedCount: number
  failedCount: number
  finishedCount: number
  percent: number
  totalCount: number
  currentLabel: string
  visible: boolean
}

const COMPLETE_HOLD_MS = 500
const RESET_AFTER_HIDE_MS = 800
const MIN_ACTIVE_PERCENT = 8

const emptySnapshot: LazyLoadProgressSnapshot = {
  activeCount: 0,
  completedCount: 0,
  failedCount: 0,
  finishedCount: 0,
  percent: 0,
  totalCount: 0,
  currentLabel: '',
  visible: false,
}

const tasks = new Map<number, LazyTask>()
const listeners = new Set<() => void>()
const trackedOnceKeys = new Set<string>()
const preloadedTaskPromises = new Map<string, Promise<unknown>>()
const fulfilledPreloadedTasks = new Set<string>()

let nextTaskId = 0
let visible = false
let snapshot = emptySnapshot
let hideTimer: ReturnType<typeof window.setTimeout> | null = null
let resetTimer: ReturnType<typeof window.setTimeout> | null = null

function clearTimer(timer: ReturnType<typeof window.setTimeout> | null) {
  if (timer) {
    window.clearTimeout(timer)
  }
}

function buildSnapshot(): LazyLoadProgressSnapshot {
  if (tasks.size === 0) return emptySnapshot

  const taskList = Array.from(tasks.values())
  const activeTasks = taskList.filter((task) => task.status === 'pending')
  const completedCount = taskList.filter(
    (task) => task.status === 'fulfilled',
  ).length
  const failedCount = taskList.filter(
    (task) => task.status === 'rejected',
  ).length
  const finishedCount = completedCount + failedCount
  const totalCount = taskList.length
  const actualPercent = Math.round((finishedCount / totalCount) * 100)
  const percent =
    activeTasks.length > 0
      ? Math.max(MIN_ACTIVE_PERCENT, actualPercent)
      : actualPercent
  const currentLabel =
    activeTasks.at(-1)?.label || taskList.at(-1)?.label || '组件'

  return {
    activeCount: activeTasks.length,
    completedCount,
    failedCount,
    finishedCount,
    percent,
    totalCount,
    currentLabel,
    visible,
  }
}

function emit() {
  snapshot = buildSnapshot()
  for (const listener of listeners) {
    listener()
  }
}

function resetBatch() {
  tasks.clear()
  visible = false
  snapshot = emptySnapshot
  emit()
}

function scheduleHideWhenIdle() {
  if (Array.from(tasks.values()).some((task) => task.status === 'pending')) {
    return
  }

  clearTimer(hideTimer)
  hideTimer = window.setTimeout(() => {
    if (Array.from(tasks.values()).some((task) => task.status === 'pending')) {
      return
    }

    visible = false
    emit()

    clearTimer(resetTimer)
    resetTimer = window.setTimeout(resetBatch, RESET_AFTER_HIDE_MS)
  }, COMPLETE_HOLD_MS)
}

function startTask(label: string) {
  clearTimer(hideTimer)
  clearTimer(resetTimer)

  if (!visible && tasks.size > 0) {
    tasks.clear()
  }

  visible = true
  nextTaskId += 1
  const id = nextTaskId
  tasks.set(id, {
    id,
    label,
    status: 'pending',
  })
  emit()
  return id
}

function finishTask(id: number, status: Exclude<LazyTaskStatus, 'pending'>) {
  const task = tasks.get(id)
  if (!task || task.status !== 'pending') return

  tasks.set(id, { ...task, status })
  emit()
  scheduleHideWhenIdle()
}

export function trackLoadTask<T>(
  label: string,
  loader: () => Promise<T>,
): Promise<T> {
  const taskId = startTask(label)
  return loader().then(
    (module) => {
      finishTask(taskId, 'fulfilled')
      return module
    },
    (error: unknown) => {
      finishTask(taskId, 'rejected')
      throw error
    },
  )
}

export function trackLoadTaskOnce<T>(
  key: string,
  label: string,
  loader: () => Promise<T>,
): Promise<T> {
  if (trackedOnceKeys.has(key)) {
    return loader()
  }

  trackedOnceKeys.add(key)
  return trackLoadTask(label, loader)
}

export function trackLazyLoad<T>(
  label: string,
  loader: () => Promise<T>,
): Promise<T> {
  const preloaded = preloadedTaskPromises.get(label) as Promise<T> | undefined
  if (preloaded && fulfilledPreloadedTasks.has(label)) {
    return preloaded
  }
  if (preloaded) {
    return trackLoadTask(label, () => preloaded)
  }
  return trackLoadTask(label, loader)
}

export function preloadLazyLoad<T>(
  label: string,
  loader: () => Promise<T>,
): Promise<T> {
  const existing = preloadedTaskPromises.get(label) as Promise<T> | undefined
  if (existing) return existing

  const promise = loader().then(
    (module) => {
      fulfilledPreloadedTasks.add(label)
      return module
    },
    (error: unknown) => {
      preloadedTaskPromises.delete(label)
      fulfilledPreloadedTasks.delete(label)
      throw error
    },
  )
  preloadedTaskPromises.set(label, promise)
  return promise
}

export function subscribeLazyLoadProgress(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getLazyLoadProgressSnapshot() {
  return snapshot
}

export function useLazyLoadProgress() {
  return useSyncExternalStore(
    subscribeLazyLoadProgress,
    getLazyLoadProgressSnapshot,
    getLazyLoadProgressSnapshot,
  )
}
