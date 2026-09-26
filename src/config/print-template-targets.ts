import { modulePageMetaMap } from '@/config/module-page-meta'

export interface PrintTemplateTargetOption {
  value: string
  label: string
}

/**
 * 最小翻译契约（key -> 文案）。
 *
 * <p>只依赖这一个调用签名，既能接收 `useTranslation()` 返回的 TFunction，
 * 也能接收组件透传的 `t: (key: string) => string` 属性。</p>
 */
export type PrintTemplateTranslate = (key: string) => string

/**
 * 可打印目标白名单（顺序即下拉顺序）。
 *
 * <p>标题不再在此处翻译：模块注册表只存 i18n key，展示文案必须在渲染期用
 * `t(titleKey)` 解析，否则模块顶层求值会早于 i18n 初始化（生产构建中两者位于
 * 不同 chunk，执行顺序不受 main.tsx 的 import 顺序保证）而得到 undefined。</p>
 */
export const printTemplateTargetKeys = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'sales-return',
  'freight-bill',
  'customer-statement',
  'freight-statement',
  'receipt',
  'payment',
] as const

const printTemplateTargetKeySet = new Set<string>(printTemplateTargetKeys)

/** 该模块是否支持打印模板（白名单判定，替代旧的 `key in map` 写法）。 */
export function isPrintTemplateTarget(moduleKey: string): boolean {
  return printTemplateTargetKeySet.has(moduleKey)
}

/** 打印目标标题；不在白名单时返回 undefined。 */
export function getPrintTemplateTargetTitle(
  moduleKey: string,
  t: PrintTemplateTranslate,
): string | undefined {
  if (!isPrintTemplateTarget(moduleKey)) {
    return undefined
  }
  const config = modulePageMetaMap[moduleKey]
  return config ? t(config.titleKey) : undefined
}

/** 打印目标下拉选项（渲染期调用，随语言切换重新解析）。 */
export function buildPrintTemplateTargetOptions(
  t: PrintTemplateTranslate,
): PrintTemplateTargetOption[] {
  return printTemplateTargetKeys.flatMap((key) => {
    const title = getPrintTemplateTargetTitle(key, t)
    return title ? [{ value: key, label: title }] : []
  })
}
