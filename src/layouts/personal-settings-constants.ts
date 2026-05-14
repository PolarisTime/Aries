import type { LayoutMode } from '@/layouts/usePersonalSettings'
import type { ThemeMode } from '@/utils/storage'

export const fontSizeOptions = [11, 12, 13, 14, 16, 18]

export const themeModeOptions: Array<{
  value: ThemeMode
  label: string
}> = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
  { value: 'system', label: '跟随系统' },
]

export const layoutModeOptions: Array<{
  value: LayoutMode
  label: string
  description: string
}> = [
  {
    value: 'sider',
    label: '左侧导航',
    description: '保留侧边菜单，更适合高频表格录入和多模块切换。',
  },
  {
    value: 'top',
    label: '顶部导航',
    description: '采用顶部菜单栏，整体风格与当前 Vue 版保持一致。',
  },
]
