import { useRuntimeConfig } from '@/hooks/useRuntimeConfig'

export interface WatermarkConfig {
  enabled: boolean
  text: string | string[] | undefined
  fontSize: number
  color: string
  rotate: number
  density: number
  width: number
  height: number
}

export function buildWatermarkContent(
  template: string,
  currentUserLoginName: string,
  now = new Date(),
): string | string[] {
  const rendered = template
    .replace(/\{username\}/g, currentUserLoginName)
    .replace(/\{time\}/g, now.toLocaleString('zh-CN', { hour12: false }))
    .replace(/\{date\}/g, now.toLocaleDateString('zh-CN'))
  const lines = rendered.split(/\r\n|\r|\n/)
  return lines.length > 1 ? lines : rendered
}

function readFiniteNumber(value: unknown, fallbackValue: number) {
  if (value == null || String(value).trim() === '') return fallbackValue
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallbackValue
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function useAppWatermark(currentUserLoginName: string): WatermarkConfig {
  const { data: runtimeConfig } = useRuntimeConfig()
  const watermark = runtimeConfig?.ui.watermark
  const enabled = watermark?.enabled ?? false
  const fontSize = clampNumber(
    readFiniteNumber(watermark?.fontSize, 18),
    10,
    48,
  )
  const rotate = clampNumber(readFiniteNumber(watermark?.rotate, -22), -90, 90)
  const color = String(watermark?.color || 'rgba(0,0,0,0.08)').trim()
  const density = clampNumber(
    readFiniteNumber(watermark?.density, 200),
    50,
    400,
  )

  const text = (() => {
    if (!enabled) return undefined
    const raw = String(watermark?.content || '').trim()
    const template = raw && raw !== 'ON' ? raw : '{username}  {time}'
    return buildWatermarkContent(template, currentUserLoginName)
  })()

  return {
    enabled,
    text,
    fontSize,
    color: color || 'rgba(0,0,0,0.08)',
    rotate,
    density,
    width: Math.max(120, density),
    height: Math.max(64, fontSize * 4),
  }
}
