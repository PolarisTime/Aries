import { useMemo } from 'react'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'
import {
  estimateSheetTextWidth,
  SHEET_WIDTH_BASE_FONT_SIZE,
  sheetColumnWidths,
  tonProgressLineWidth,
} from './core'
import {
  maxRemainingTonTextWidth,
  maxTonProgressTextWidth,
} from './ton-progress-text'

/** 无采购订单数据时的占位: 稳定引用, 避免每次渲染都触发重算。 */
const NO_TONNAGE_RECORDS: readonly PurchaseOrderTonnageRecord[] = []
const NO_LOCAL_TON: ReadonlyMap<string, number> = new Map()
const NO_EXTRA_REMAINING_TEXTS: readonly string[] = []
/** 两列的表头文案(用于把表头宽度算进列宽下限)。 */
export interface SheetTonHeaderTexts {
  issued: string
  unopened: string
}

/**
 * 单据表格列宽(随个人设置字号自适应, 未开吨位列再按单据实际内容兜底)。
 *
 * <p>字号是列宽的主要依据: 个人设置的 `fontSize` 同时驱动 antd 主题 token
 * (`ConfigProvider.theme.fontSize`)与 `--app-font-size`, 表格里文字的宽度随之变化,
 * 因此列宽必须用同一个值等比换算, 否则字号调大后「材质 / 规格 / 长度」「供应商简称」
 * 等列会被裁断。</p>
 *
 * <p>已开/未开两列是例外: 它们的数字与品牌固定 11px(不随字号缩放), 宽度完全按本单据真实
 * 出现的吨位位数与品牌名长度定(见 `tonTextWidths`), 因此内容短时不留空白、长吨位或长品牌
 * 也不会被省略号收尾。</p>
 *
 * <p>用 zustand store 而不是读 `--app-font-size` 的原因: store 是字号的真源且订阅式,
 * 用户保存设置的同一帧就会重算列宽, 不需要 MutationObserver 或读样式造成的额外布局抖动。</p>
 */
export function useSheetColumnWidths(
  tonnageRecords: readonly PurchaseOrderTonnageRecord[] = NO_TONNAGE_RECORDS,
  localTonByItemId: ReadonlyMap<string, number> = NO_LOCAL_TON,
  headerTexts?: SheetTonHeaderTexts,
  /**
   * 多行关联行的「剩余未开吨位」候选文案: 这些行在列上按关联行合计渲染, 合计值可能比任何
   * 单条明细行候选更宽, 不补进来就会被省略号收尾(见 maxRemainingTonTextWidth)。
   */
  extraRemainingTexts: readonly string[] = NO_EXTRA_REMAINING_TEXTS,
  /**
   * 超开短文案生成器(如「超开 10.02 吨」): 超开行在同一格里多一段文案, 不补进列宽会被省略号收尾。
   * 由调用方注入带翻译的实现, 本 hook 不持有语言。
   */
  formatOverText?: (overTon: number) => string,
) {
  const fontSize = useUiSettingsStore(
    (state) => state.settings?.fontSize ?? SHEET_WIDTH_BASE_FONT_SIZE,
  )
  const issuedHeader = headerTexts?.issued ?? ''
  const unopenedHeader = headerTexts?.unopened ?? ''
  const tonTextWidths = useMemo(
    () => ({
      issued: maxRemainingTonTextWidth(
        tonnageRecords,
        localTonByItemId,
        extraRemainingTexts,
        formatOverText,
      ),
      unopened: maxTonProgressTextWidth(
        tonnageRecords,
        localTonByItemId,
        (parts) => tonProgressLineWidth(parts.primary, parts.brand),
      ),
      // 表头跟着个人字号缩放, 内容固定 11px ⇒ 表头常常是更宽的一方
      issuedHeader: estimateSheetTextWidth(issuedHeader, fontSize),
      unopenedHeader: estimateSheetTextWidth(unopenedHeader, fontSize),
    }),
    [
      tonnageRecords,
      localTonByItemId,
      extraRemainingTexts,
      formatOverText,
      issuedHeader,
      unopenedHeader,
      fontSize,
    ],
  )
  return useMemo(
    () => sheetColumnWidths(fontSize, tonTextWidths),
    [fontSize, tonTextWidths],
  )
}
