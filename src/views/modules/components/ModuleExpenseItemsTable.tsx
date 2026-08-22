import { HolderOutlined } from '@ant-design/icons'
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

/** 列宽体系与货物明细表格一致（勾选/序号固定，业务列自适应）。 */
const EXPENSE_GRID_COLUMNS = [
  '48px',
  '56px',
  'minmax(180px, 260px)',
  '140px',
  '120px',
  'minmax(160px, 1fr)',
  '64px',
]

export interface ModuleExpenseItemsTableProps {
  expenseItems: DocumentChargeItemDraft[]
  materialOptions: MaterialOption[]
  selectedItemIds: string[]
  onSelectedChange: (itemId: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onChange: (index: number, patch: Partial<DocumentChargeItemDraft>) => void
  onCreateExpense: (name: string) => Promise<void>
  onDelete: (index: number) => void
}

/**
 * 单据附加费用精简表（Tab 2）：横向 Table 布局，
 * 勾选 + 拖拽抓手/序号 + 业务列（费用名称/金额/单位/备注），样式对齐货物明细。
 */
export function ModuleExpenseItemsTable({
  expenseItems,
  materialOptions,
  selectedItemIds,
  onSelectedChange,
  onSelectAll,
  onChange,
  onCreateExpense,
  onDelete,
}: ModuleExpenseItemsTableProps) {
  const { t } = useTranslation()
  const allSelected =
    expenseItems.length > 0 && selectedItemIds.length === expenseItems.length

  const gridStyle = { gridTemplateColumns: EXPENSE_GRID_COLUMNS.join(' ') }

  return (
    <div className="overflow-auto rounded border border-gray-200 bg-gray-50">
      <div
        className="grid items-center gap-4 bg-gray-100 px-3 py-2 font-medium text-gray-600"
        style={gridStyle}
      >
        <span className="flex items-center">
          <Checkbox
            checked={allSelected}
            onChange={(event) => onSelectAll(event.target.checked)}
            aria-label={t('modules.expense.selectAllAriaLabel')}
          />
        </span>
        <span className="flex items-center gap-1 text-gray-400">
          <HolderOutlined />
          <span>#</span>
        </span>
        <span>{t('modules.expense.chargeName')}</span>
        <span className="text-right">{t('modules.expense.amount')}</span>
        <span>{t('modules.expense.unit')}</span>
        <span>{t('modules.expense.remark')}</span>
        <span>{t('common.actions')}</span>
      </div>
      {!expenseItems.length ? (
        <div className="px-3 py-6 text-center text-gray-500">
          {t('modules.expense.emptyHint')}
        </div>
      ) : null}
      {expenseItems.map((item, index) => (
        <div
          key={item.id ?? `new-${index}`}
          className="grid items-center gap-4 border-b border-gray-200 px-3 py-2"
          style={gridStyle}
        >
          <span className="flex items-center">
            <Checkbox
              checked={selectedItemIds.includes(item.id ?? '')}
              onChange={(event) =>
                onSelectedChange(item.id ?? '', event.target.checked)
              }
            />
          </span>
          <span className="flex items-center gap-1 text-gray-400">
            <HolderOutlined />
            <span>{index + 1}</span>
          </span>
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
          <span className="text-center">
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
          </span>
        </div>
      ))}
    </div>
  )
}

export function ExpenseItemsSummaryBar({
  count,
  totalExpenseAmount,
}: {
  count: number
  totalExpenseAmount: number | null
}) {
  const { t } = useTranslation()
  return (
    <Typography.Text className="editor-items-summary-inline">
      {t('modules.expense.rowCount', { count })} ·{' '}
      {t('modules.expense.totalAmount')}：
      <Typography.Text strong>
        {(totalExpenseAmount ?? 0).toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Typography.Text>
    </Typography.Text>
  )
}
