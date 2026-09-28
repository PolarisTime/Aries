import { useMemo } from 'react'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'
import { SHEET_WIDTH_BASE_FONT_SIZE, sheetColumnWidths } from './core'

/**
 * 单据表格列宽(随个人设置字号自适应)。
 *
 * <p>字号是列宽的唯一样例来源: 个人设置的 `fontSize` 同时驱动 antd 主题 token
 * (`ConfigProvider.theme.fontSize`)与 `--app-font-size`, 表格里文字的宽度随之变化,
 * 因此列宽必须用同一个值等比换算, 否则字号调大后「材质 / 规格 / 长度」「供应商简称」
 * 等列会被裁断。</p>
 *
 * <p>用 zustand store 而不是读 `--app-font-size` 的原因: store 是字号的真源且订阅式,
 * 用户保存设置的同一帧就会重算列宽, 不需要 MutationObserver 或读样式造成的额外布局抖动。</p>
 */
export function useSheetColumnWidths() {
  const fontSize = useUiSettingsStore(
    (state) => state.settings?.fontSize ?? SHEET_WIDTH_BASE_FONT_SIZE,
  )
  return useMemo(() => sheetColumnWidths(fontSize), [fontSize])
}
