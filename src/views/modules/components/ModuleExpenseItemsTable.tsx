import { Checkbox, Input, InputNumber, Select, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DocumentChargeItemDraft } from '@/views/modules/module-editor-draft-adapter'

interface MaterialOption {
  label: string
  value: string
  unit?: string
  materialType?: string
}

interface ChargeNameSelectProps {
  item: DocumentChargeItemDraft
  materialOptions: MaterialOption[]
  onChange: (patch: Partial<DocumentChargeItemDraft>) => void
  onCreateExpense: (name: string) => Promise<void>
  t: (key: string, values?: Record<string, unknown>) => string
}

/**
 * 费用名称下拉：过滤附加费用类主数据；输入不存在项时展示快捷创建入口，
 * 创建成功后静默写入商品资料并回填当前行。
 */
function ChargeNameSelect({
  item,
  materialOptions,
  onChange,
  onCreateExpense,
  t,
}: ChargeNameSelectProps) {
  const [searchText, setSearchText] = useState('')
  const [creating, setCreating] = useState(false)

  const matched = materialOptions.find(
    (option) => option.value === (item.materialId ?? ''),
  )

  const handleCreate = async () => {
    const name = searchText.trim()
    if (!name || creating) {
      return
    }
    setCreating(true)
    try {
      await onCreateExpense(name)
      // 创建后由父组件回填 materialId/unit，这里仅清空搜索态。
      setSearchText('')
    } finally {
      setCreating(false)
    }
  }

  const showQuickCreate = Boolean(
    searchText.trim() &&
      !materialOptions.some((option) => option.label === searchText.trim()),
  )

  return (
    <Select
      showSearch
      value={matched ? matched.value : undefined}
      placeholder={t('modules.expense.chargeNamePlaceholder')}
      style={{ width: '100%' }}
      options={[
        ...materialOptions.map((option: MaterialOption) => ({
          label: option.label,
          value: option.value,
          unit: option.unit,
        })),
        ...(showQuickCreate
          ? [
              {
                label: `+ ${t('modules.expense.quickCreate', {
                  name: searchText.trim(),
                })}`,
                value: '__quick_create__',
              },
            ]
          : []),
      ]}
      onSearch={setSearchText}
      onSelect={(value) => {
        if (value === '__quick_create__') {
          void handleCreate()
          return
        }
        const option = materialOptions.find(
          (candidate) => candidate.value === value,
        )
        onChange({
          materialId: value,
          chargeName: option?.label ?? '',
          unit: option?.unit || item.unit,
        })
      }}
      dropdownRender={(menu) => (
        <>
          {menu}
          {showQuickCreate ? (
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-blue-600 hover:bg-gray-50"
              onClick={() => {
                void handleCreate()
              }}
            >
              + {t('modules.expense.quickCreate', { name: searchText.trim() })}
            </button>
          ) : null}
        </>
      )}
      notFoundContent={
        <div className="px-3 py-2 text-gray-500">
          {t('modules.expense.noChargeOptions')}
        </div>
      }
    />
  )
}

export interface ModuleExpenseItemsTableProps {
  expenseItems: DocumentChargeItemDraft[]
  materialOptions: MaterialOption[]
  selectedItemIds: string[]
  totalExpenseAmount: number | null
  onSelectedChange: (itemId: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onChange: (index: number, patch: Partial<DocumentChargeItemDraft>) => void
  onCreateExpense: (name: string) => Promise<void>
  onDelete: (index: number) => void
  onRemoveSelected: () => void
}

/** 单据附加费用精简表（Tab 2）：6 列布局 + 快捷创建 + 费用合计。 */
export function ModuleExpenseItemsTable({
  expenseItems,
  materialOptions,
  selectedItemIds,
  totalExpenseAmount,
  onSelectedChange,
  onSelectAll,
  onChange,
  onCreateExpense,
  onDelete,
  onRemoveSelected,
}: ModuleExpenseItemsTableProps) {
  const { t } = useTranslation()

  return (
    <div className="overflow-auto rounded border border-gray-200 bg-gray-50">
      <div className="grid items-center gap-4 bg-gray-100 px-3 py-2 text-base font-medium text-gray-600">
        <span className="flex items-center">
          <Checkbox
            checked={
              expenseItems.length > 0 &&
              selectedItemIds.length === expenseItems.length
            }
            onChange={(event) => onSelectAll(event.target.checked)}
            aria-label={t('modules.expense.selectAllAriaLabel')}
          />
        </span>
        <span>#</span>
        <span>{t('modules.expense.chargeName')}</span>
        <span>{t('modules.expense.amount')}</span>
        <span>{t('modules.expense.unit')}</span>
        <span>{t('modules.expense.remark')}</span>
      </div>
      {selectedItemIds.length ? (
        <div className="border-b border-gray-200 px-3 py-2">
          <button
            type="button"
            className="text-red-500 hover:text-red-700"
            onClick={onRemoveSelected}
          >
            {t('modules.expense.removeSelected')} ({selectedItemIds.length})
          </button>
        </div>
      ) : null}
      {expenseItems.map((item, index) => (
        <div
          key={item.id ?? `new-${index}`}
          className="grid items-center gap-4 border-b border-gray-200 px-3 py-2"
        >
          <Checkbox
            checked={selectedItemIds.includes(item.id ?? '')}
            onChange={(event) =>
              onSelectedChange(item.id ?? '', event.target.checked)
            }
          />
          <span className="text-center text-gray-600">{index + 1}</span>
          <ChargeNameSelect
            item={item}
            materialOptions={materialOptions}
            onChange={(patch) => onChange(index, patch)}
            onCreateExpense={onCreateExpense}
            t={t}
          />
          <InputNumber
            value={item.amount}
            min={0}
            precision={2}
            className="w-full"
            onChange={(value) =>
              onChange(index, { amount: typeof value === 'number' ? value : 0 })
            }
          />
          <Input
            value={item.unit ?? ''}
            placeholder={t('modules.expense.unitPlaceholder')}
            onChange={(event) => onChange(index, { unit: event.target.value })}
          />
          <Input
            value={item.remark ?? ''}
            onChange={(event) =>
              onChange(index, { remark: event.target.value })
            }
          />
          <button
            type="button"
            className="text-red-500 hover:text-red-700"
            onClick={() => onDelete(index)}
            aria-label={t('modules.expense.deleteRowAriaLabel', {
              index: index + 1,
            })}
          >
            🗑
          </button>
        </div>
      ))}
      {!expenseItems.length ? (
        <div className="px-3 py-6 text-center text-gray-500">
          {t('modules.expense.emptyHint')}
        </div>
      ) : null}
      {expenseItems.length ? (
        <div className="flex justify-end gap-4 border-t border-gray-200 px-3 py-2">
          <Typography.Text>
            {t('modules.expense.totalAmount')}：
            <Typography.Text strong>
              {(totalExpenseAmount ?? 0).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography.Text>
          </Typography.Text>
        </div>
      ) : null}
    </div>
  )
}
