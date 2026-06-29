import { useQuery } from '@tanstack/react-query'

import { listClientSettings } from '@/api/system-settings'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { ModuleRecord } from '@/types/module-page'

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

function findSettingValue(systemSettings: ModuleRecord[], settingCode: string) {
  return systemSettings.find(
    (s) => String(s.settingCode).trim() === settingCode,
  )?.sampleNo
}

function readFiniteNumber(
  systemSettings: ModuleRecord[],
  settingCode: string,
  fallbackValue: number,
) {
  const rawValue = findSettingValue(systemSettings, settingCode)
  if (rawValue == null || String(rawValue).trim() === '') return fallbackValue
  const value = Number(rawValue)
  return Number.isFinite(value) ? value : fallbackValue
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function useAppWatermark(currentUserLoginName: string): WatermarkConfig {
  const { data: systemSettings = [] } = useQuery({
    queryKey: QUERY_KEYS.clientSettings,
    queryFn: async () => {
      try {
        return await listClientSettings()
      } catch {
        return []
      }
    },
    staleTime: 60_000,
  })

  const enabled = systemSettings.some(
    (s) =>
      String(s.settingCode).trim() === 'UI_WATERMARK_ENABLED' &&
      String(s.status) === '正常',
  )
  const contentSetting = systemSettings.find(
    (s) => String(s.settingCode).trim() === 'SYS_WATERMARK_CONTENT',
  )
  const fontSize = clampNumber(
    readFiniteNumber(systemSettings, 'SYS_WATERMARK_FONT_SIZE', 18),
    10,
    48,
  )
  const rotate = clampNumber(
    readFiniteNumber(systemSettings, 'SYS_WATERMARK_ROTATE', -22),
    -90,
    90,
  )
  const color = String(
    findSettingValue(systemSettings, 'SYS_WATERMARK_COLOR') ||
      'rgba(0,0,0,0.08)',
  ).trim()
  const density = clampNumber(
    readFiniteNumber(systemSettings, 'SYS_WATERMARK_DENSITY', 200),
    50,
    400,
  )

  const text = (() => {
    if (!enabled) return undefined
    const raw = String(contentSetting?.sampleNo || '').trim()
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
