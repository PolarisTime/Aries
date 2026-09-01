import i18next from 'i18next'
import type {
  ModuleColumnDefinition,
  ModuleItemColumnConfig,
  ModuleItemColumnDefinition,
  ModuleItemColumnKey,
} from '@/types/module-page'
import type { TradeLineItemEditorSemantics } from '@/types/trade-line-item-fields'
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

export interface ResolvedModuleItemColumnConfig<
  PrivateKey extends string = string,
> {
  itemColumnConfig: ModuleItemColumnConfig<PrivateKey>
  itemColumns: ModuleColumnDefinition[]
  detailItemColumns?: ModuleColumnDefinition[]
  saveResultItemColumns?: ModuleColumnDefinition[]
}

/** 保留私有字段字面量类型，让模块投影可以安全引用自己的字段。 */
export function defineItemColumnConfig<const PrivateKey extends string>(
  config: ModuleItemColumnConfig<PrivateKey>,
): ModuleItemColumnConfig<PrivateKey> {
  return config
}

/** 统一解析模块明细列的三个兼容出口，避免 itemColumns 与场景投影手写漂移。 */
export function resolveModuleItemColumnConfig<PrivateKey extends string>(
  config: ModuleItemColumnConfig<PrivateKey>,
): ResolvedModuleItemColumnConfig<PrivateKey> {
  return {
    itemColumnConfig: config,
    itemColumns: resolveItemColumns(config),
    detailItemColumns: resolveItemColumnProjection(
      config,
      config.projections?.detail,
    ),
    saveResultItemColumns: resolveItemColumnProjection(
      config,
      config.projections?.saveResult,
    ),
  }
}

/**
 * 根据模块明细列配置解析出展示用 ModuleColumnDefinition[]。
 *
 * - include 顺序即默认展示顺序，公共目录新增字段不会自动进入未声明模块；
 * - include 同时承载公共字段与模块私有字段，私有字段不会被隐式追加到末尾；
 * - requiredFieldKeys 提供编辑器必填展示语义（区别于后端请求 DTO 校验）；
 * - 未知字段、重复字段、覆盖目标不存在等问题快速失败，不悄悄丢列。
 */
export function resolveItemColumns<PrivateKey extends string = never>(
  config: ModuleItemColumnConfig<PrivateKey>,
): ModuleColumnDefinition[] {
  return resolveColumns(config, undefined)
}

/** 解析场景投影；未声明投影时返回 undefined，由调用方回退到完整列。 */
export function resolveItemColumnProjection<PrivateKey extends string = never>(
  config: ModuleItemColumnConfig<PrivateKey>,
  projection?: ModuleItemColumnKey<PrivateKey>[],
): ModuleColumnDefinition[] | undefined {
  if (!projection || projection.length === 0) {
    return undefined
  }
  return resolveColumns(config, projection)
}

function resolveColumns<PrivateKey extends string>(
  config: ModuleItemColumnConfig<PrivateKey>,
  projection: ModuleItemColumnKey<PrivateKey>[] | undefined,
): ModuleColumnDefinition[] {
  validateConfigTargets(config)
  const requiredSet = new Set(config.requiredFieldKeys ?? [])
  const includeSet = new Set(config.include)
  const privateColumns = config.privateColumns ?? []
  const privateMap = new Map<string, ModuleItemColumnDefinition<PrivateKey>>(
    privateColumns.map((column) => [column.dataIndex, column]),
  )
  const lookupKeys = projection ?? config.include

  const seen = new Set<string>()
  const result: ModuleColumnDefinition[] = []

  for (const key of lookupKeys) {
    if (seen.has(key)) {
      throw new ItemColumnConfigError(`重复明细字段 key: ${key}`)
    }
    seen.add(key)

    const privateColumn = privateMap.get(key)
    if (privateColumn) {
      result.push({
        ...privateColumn,
        ...(requiredSet.has(key) ? { required: true } : {}),
      })
      continue
    }

    const spec = TRADE_LINE_ITEM_FIELD_CATALOG[key as TradeLineItemFieldKey]
    if (!spec) {
      throw new ItemColumnConfigError(`未知明细字段 key: ${key}`)
    }
    if (projection && !includeSet.has(key)) {
      throw new ItemColumnConfigError(`投影字段不在 include 白名单中: ${key}`)
    }

    const publicKey = key as TradeLineItemFieldKey
    const override = config.overrides?.[publicKey]
    const mergedEditor = spec.editor
      ? {
          control: override?.editor?.control ?? spec.editor.control,
          precision: override?.editor?.precision ?? spec.editor.precision,
          min: override?.editor?.min ?? spec.editor.min,
          controls: override?.editor?.controls ?? spec.editor.controls,
        }
      : override?.editor && hasEditorControl(override.editor)
        ? override.editor
        : undefined
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
    if (mergedEditor !== undefined) column.editor = mergedEditor
    if (requiredSet.has(key)) column.required = true
    result.push(column)
  }

  return result
}

function hasEditorControl(
  editor: Partial<TradeLineItemEditorSemantics>,
): editor is TradeLineItemEditorSemantics {
  return editor.control !== undefined
}

function validateConfigTargets<PrivateKey extends string>(
  config: ModuleItemColumnConfig<PrivateKey>,
): void {
  const includeSet = new Set(config.include)
  const privateColumns = config.privateColumns ?? []
  const privateKeys = new Set<string>()
  for (const column of privateColumns) {
    if (privateKeys.has(column.dataIndex)) {
      throw new ItemColumnConfigError(`重复私有字段 key: ${column.dataIndex}`)
    }
    privateKeys.add(column.dataIndex)
    if (
      TRADE_LINE_ITEM_FIELD_CATALOG[column.dataIndex as TradeLineItemFieldKey]
    ) {
      throw new ItemColumnConfigError(
        `私有字段与白名单冲突（与公共字段冲突）: ${column.dataIndex}`,
      )
    }
    if (!includeSet.has(column.dataIndex)) {
      throw new ItemColumnConfigError(
        `私有字段不在 include 白名单中: ${column.dataIndex}`,
      )
    }
  }
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
