import type { TableProps } from 'antd'
import { asString } from '@/utils/type-narrowing'

type SelectionTranslator = (
  key: string,
  options?: Record<string, unknown>,
) => string

/** 从记录里挑一个读屏可辨认的业务标识(名称/编码/单号), 都没有时退回主键。 */
export function describeSelectionRow(record: unknown): string {
  const source = (record ?? {}) as Record<string, unknown>
  return (
    asString(source.name) ||
    asString(source.code) ||
    asString(source.no) ||
    asString(source.orderNo) ||
    asString(source.id)
  )
}

/**
 * 列表行选择复选框的可访问名(zh/en)。
 *
 * <p>antd v6 把表头 `Select all` 与行内 `Select row N` 写成硬编码英文, 不随
 * `ConfigProvider` 的 locale 切换(真机中文界面下读屏播报英文)。这里用 rowSelection 的
 * `getTitleCheckboxProps` / `getCheckboxProps` 覆盖成本项目 i18n 文案, 并在行名里带上
 * 业务标识(单号/编码/名称), 让读屏用户能分辨具体是哪一行。</p>
 */
export function buildSelectionA11yProps<T>(
  t: SelectionTranslator,
  describeRow: (record: T) => string = describeSelectionRow,
): Pick<
  NonNullable<TableProps<T>['rowSelection']>,
  'getCheckboxProps' | 'getTitleCheckboxProps'
> {
  return {
    getTitleCheckboxProps: () => ({
      'aria-label': t('common.table.selectAllRows'),
    }),
    getCheckboxProps: (record: T) => {
      const label = describeRow(record)
      return {
        'aria-label': label
          ? t('common.table.selectRowNamed', { label })
          : t('common.table.selectRow'),
      }
    },
  }
}
