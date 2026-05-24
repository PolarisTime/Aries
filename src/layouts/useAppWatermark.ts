import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { listSystemSettings } from '@/api/system-settings'
import { QUERY_KEYS } from '@/constants/query-keys'

interface WatermarkConfig {
  enabled: boolean
  text: string | undefined
  fontSize: number
  color: string
  rotate: number
  density: number
}

export function useAppWatermark(currentUserLoginName: string): WatermarkConfig {
  const { data: systemSettings = [] } = useQuery({
    queryKey: QUERY_KEYS.generalSetting,
    queryFn: async () => {
      try {
        return await listSystemSettings()
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
  const fontSize =
    Number(
      systemSettings.find(
        (s) => String(s.settingCode).trim() === 'SYS_WATERMARK_FONT_SIZE',
      )?.sampleNo,
    ) || 18
  const rotate = Number(
    systemSettings.find(
      (s) => String(s.settingCode).trim() === 'SYS_WATERMARK_ROTATE',
    )?.sampleNo,
  )
  const color = String(
    systemSettings.find(
      (s) => String(s.settingCode).trim() === 'SYS_WATERMARK_COLOR',
    )?.sampleNo || 'rgba(0,0,0,0.08)',
  ).trim()
  const density =
    Number(
      systemSettings.find(
        (s) => String(s.settingCode).trim() === 'SYS_WATERMARK_DENSITY',
      )?.sampleNo,
    ) || 200

  const text = useMemo(() => {
    if (!enabled) return undefined
    const raw = String(contentSetting?.sampleNo || '').trim()
    const template = raw && raw !== 'ON' ? raw : '{username}  {time}'
    const now = new Date()
    return template
      .replace(/\{username\}/g, currentUserLoginName)
      .replace(/\{time\}/g, now.toLocaleString('zh-CN', { hour12: false }))
      .replace(/\{date\}/g, now.toLocaleDateString('zh-CN'))
  }, [enabled, contentSetting?.sampleNo, currentUserLoginName])

  return { enabled, text, fontSize, color, rotate, density }
}
