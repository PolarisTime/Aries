import { useMemo } from 'react'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'
import {
  SHEET_WIDTH_BASE_FONT_SIZE,
  sheetColumnWidths,
  tonProgressLineWidth,
} from './core'
import { maxTonProgressTextWidth } from './ton-progress-text'

/** 无采购订单数据时的占位: 稳定引用, 避免每次渲染都触发重算。 */
const NO_TONNAGE_RECORDS: readonly PurchaseOrderTonnageRecord[] = []
const NO_LOCAL_TON: ReadonlyMap<string, number> = new Map()

/**
 * 单据表格列宽(随个人设置字号自适应, 未开吨位列再按单据实际内容兜底)。
 *
 * <p>字号是列宽的主要依据: 个人设置的 `fontSize` 同时驱动 antd 主题 token
 * (`ConfigProvider.theme.fontSize`)与 `--app-font-size`, 表格里文字的宽度随之变化,
 * 因此列宽必须用同一个值等比换算, 否则字号调大后「材质 / 规格 / 长度」「供应商简称」
 * 等列会被裁断。</p>
 *
 * <p>未开吨位列是例外: 它的数字与品牌「10.19 · 中天」固定 11px(不随字号缩放), 宽度取决于
 * 本单据真实出现的吨位位数(报单吨位 − 已开吨位)与品牌名长度, 因此额外按 `tonnageRecords`
 * 与 `localTonByItemId` 的实际内容定宽(只覆盖本单据会用到的长度), 否则长品牌会被省略号收尾。</p>
 *
 * <p>用 zustand store 而不是读 `--app-font-size` 的原因: store 是字号的真源且订阅式,
 * 用户保存设置的同一帧就会重算列宽, 不需要 MutationObserver 或读样式造成的额外布局抖动。</p>
 */
export function useSheetColumnWidths(
  tonnageRecords: readonly PurchaseOrderTonnageRecord[] = NO_TONNAGE_RECORDS,
  localTonByItemId: ReadonlyMap<string, number> = NO_LOCAL_TON,
) {
  const fontSize = useUiSettingsStore(
    (state) => state.settings?.fontSize ?? SHEET_WIDTH_BASE_FONT_SIZE,
  )
  const tonProgressTextWidth = useMemo(
    () =>
      maxTonProgressTextWidth(tonnageRecords, localTonByItemId, (parts) =>
        tonProgressLineWidth(parts.primary, parts.brand),
      ),
    [tonnageRecords, localTonByItemId],
  )
  return useMemo(
    () => sheetColumnWidths(fontSize, tonProgressTextWidth),
    [fontSize, tonProgressTextWidth],
  )
}
