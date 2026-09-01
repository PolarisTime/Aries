import i18next from 'i18next'
import type {
  ModuleColumnDefinition,
  ModuleItemColumnConfig,
} from '@/types/module-page'
import {
  TRADE_LINE_ITEM_FIELD_CATALOG,
  type TradeLineItemFieldKey,
} from './trade-line-item-field-catalog'

export class ItemColumnConfigError extends Error {
  constructor(message: string) {
    super(`[itemColumnConfig] ${message}`)
    this.name = 'ItemColumnConfigError'
  }
}

/**
 * 根据模块明细列配置解析出展示用 ModuleColumnDefinition[]。
 *
 * - include 顺序即默认展示顺序，公共目录新增字段不会自动进入未声明模块；
 * - requiredFieldKeys 提供编辑器必填展示语义（区别于后端请求 DTO 校验）；
 * - 未知字段、重复字段、覆盖目标不存在等问题快速失败，不悄悄丢列。
 */
export function resolveItemColumns(
  config: ModuleItemColumnConfig,
): ModuleColumnDefinition[] {
  return resolveColumns(config, undefined)
}

/**
 * 解析场景投影（详情、保存结果摘要等）。
 * 投影 key 必须属于 include 白名单或模块私有字段；未声明投影时返回 undefined（由调用方回退到完整列）。
 */
export function resolveItemColumnProjection(
  config: ModuleItemColumnConfig,
  projection?: TradeLineItemFieldKey[],
): ModuleColumnDefinition[] | undefined {
  if (!projection || projection.length === 0) {
    return undefined
  }
  return resolveColumns(config, projection)
}

function resolveColumns(
  config: ModuleItemColumnConfig,
  projection: TradeLineItemFieldKey[] | undefined,
): ModuleColumnDefinition[] {
  validateConfigTargets(config)
  const requiredSet = new Set(config.requiredFieldKeys ?? [])
  const includeSet = new Set(config.include)
  const privateColumns = config.privateColumns ?? []
  const privateMap = new Map(
    privateColumns.map((column) => [column.dataIndex, column]),
  )
  // 完整解析：include + 私有字段；场景投影：投影声明集合。
  const lookupKeys: TradeLineItemFieldKey[] = projection ?? [
    ...config.include,
    ...privateColumns.map(
      (column) => column.dataIndex as TradeLineItemFieldKey,
    ),
  ]

  const seen = new Set<string>()
  const result: ModuleColumnDefinition[] = []

  for (const key of lookupKeys) {
    if (seen.has(key)) {
      throw privateMap.has(key)
        ? new ItemColumnConfigError(`私有字段与白名单冲突: ${key}`)
        : new ItemColumnConfigError(`重复明细字段 key: ${key}`)
    }
    seen.add(key)

    const privateColumn = privateMap.get(key)
    if (privateColumn) {
      result.push(privateColumn)
      continue
    }

    const spec = TRADE_LINE_ITEM_FIELD_CATALOG[key]
    if (!spec) {
      throw new ItemColumnConfigError(`未知明细字段 key: ${key}`)
    }
    if (projection && !includeSet.has(key)) {
      throw new ItemColumnConfigError(`投影字段不在 include 白名单中: ${key}`)
    }

    const override = config.overrides?.[key]
    const column: ModuleColumnDefinition = {
      title: i18next.t(override?.labelKey ?? spec.labelKey),
      dataIndex: key,
    }
    const width = override?.width ?? spec.width
    const align = override?.align ?? spec.align
    const type = override?.type ?? spec.type
    if (width !== undefined) column.width = width
    if (align !== undefined) column.align = align
    if (type !== undefined) column.type = type
    if (requiredSet.has(key)) column.required = true
    result.push(column)
  }

  return result
}

function validateConfigTargets(config: ModuleItemColumnConfig): void {
  const includeSet = new Set(config.include)
  for (const key of config.hiddenByDefault ?? []) {
    if (!includeSet.has(key)) {
      throw new ItemColumnConfigError(
        `默认隐藏字段不在 include 白名单中: ${key}`,
      )
    }
  }
  for (const key of config.requiredFieldKeys ?? []) {
    if (!includeSet.has(key)) {
      throw new ItemColumnConfigError(`必填字段不在 include 白名单中: ${key}`)
    }
  }
  for (const key of Object.keys(
    config.overrides ?? {},
  ) as TradeLineItemFieldKey[]) {
    if (!TRADE_LINE_ITEM_FIELD_CATALOG[key]) {
      throw new ItemColumnConfigError(`覆盖目标不存在: ${key}`)
    }
    if (!includeSet.has(key)) {
      throw new ItemColumnConfigError(`覆盖字段不在 include 白名单中: ${key}`)
    }
  }
}
