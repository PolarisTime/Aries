import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Checkbox, Input, InputNumber, Select, Table } from 'antd'
import type { ModuleChargeItem, ModuleLineItem } from '@/types/module-page'

interface Props {
  moduleKey: string
  items: ModuleLineItem[]
  chargeItems: ModuleChargeItem[]
  canEdit: boolean
  onAddChargeItem: () => void
  onChangeChargeItems: (items: ModuleChargeItem[]) => void
}

const chargeDirectionOptions = [
  { label: '应收', value: 'RECEIVABLE' },
  { label: '应付', value: 'PAYABLE' },
  { label: '内部', value: 'INTERNAL' },
]

function toFiniteNumber(value: unknown) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : 0
}

function getSettlementDirection(moduleKey: string) {
  if (moduleKey === 'sales-order' || moduleKey === 'sales-outbound') {
    return 'RECEIVABLE'
  }
  if (
    moduleKey === 'purchase-order' ||
    moduleKey === 'purchase-inbound' ||
    moduleKey === 'freight-bill'
  ) {
    return 'PAYABLE'
  }
  return ''
}

function getTotalLabel(direction: string) {
  if (direction === 'RECEIVABLE') return '应收合计'
  if (direction === 'PAYABLE') return '应付合计'
  return '结算合计'
}

function formatAmount(value: number) {
  return value.toFixed(2)
}

export function ModuleEditorChargeSection({
  moduleKey,
  items,
  chargeItems,
  canEdit,
  onAddChargeItem,
  onChangeChargeItems,
}: Props) {
  const settlementDirection = getSettlementDirection(moduleKey)
  const productAmount = items.reduce(
    (sum, item) => sum + toFiniteNumber(item.amount),
    0,
  )
  const chargeAmount = chargeItems.reduce((sum, item) => {
    if (item.billable === false) return sum
    if (settlementDirection && item.chargeDirection !== settlementDirection) {
      return sum
    }
    return sum + toFiniteNumber(item.amount)
  }, 0)
  const totalAmount = productAmount + chargeAmount

  const updateChargeItem = (
    index: number,
    patch: Partial<ModuleChargeItem>,
  ) => {
    onChangeChargeItems(
      chargeItems.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    )
  }

  const removeChargeItem = (index: number) => {
    onChangeChargeItems(
      chargeItems.filter((_, currentIndex) => currentIndex !== index),
    )
  }

  const columns: TableColumnsType<ModuleChargeItem> = [
    {
      title: '费用名称',
      dataIndex: 'chargeName',
      key: 'chargeName',
      width: 180,
      render: (value, _record, index) => (
        <Input
          aria-label="费用名称"
          value={String(value ?? '')}
          disabled={!canEdit}
          onChange={(event) =>
            updateChargeItem(index, { chargeName: event.target.value })
          }
        />
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (value, _record, index) => (
        <InputNumber
          aria-label="费用金额"
          className="w-full"
          min={0}
          precision={2}
          value={
            value == null || value === '' ? undefined : toFiniteNumber(value)
          }
          disabled={!canEdit}
          onChange={(nextValue) =>
            updateChargeItem(index, { amount: nextValue ?? '' })
          }
        />
      ),
    },
    {
      title: '方向',
      dataIndex: 'chargeDirection',
      key: 'chargeDirection',
      width: 140,
      render: (value, _record, index) => (
        <Select
          aria-label="费用方向"
          className="w-full"
          value={String(
            value || getSettlementDirection(moduleKey) || 'PAYABLE',
          )}
          options={chargeDirectionOptions}
          disabled={!canEdit}
          onChange={(nextValue) =>
            updateChargeItem(index, { chargeDirection: nextValue })
          }
        />
      ),
    },
    {
      title: '计入结算',
      dataIndex: 'billable',
      key: 'billable',
      width: 110,
      align: 'center',
      render: (value, _record, index) => (
        <Checkbox
          aria-label="计入结算"
          checked={value !== false}
          disabled={!canEdit}
          onChange={(event) =>
            updateChargeItem(index, { billable: event.target.checked })
          }
        />
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 180,
      render: (value, _record, index) => (
        <Input
          aria-label="费用备注"
          value={String(value ?? '')}
          disabled={!canEdit}
          onChange={(event) =>
            updateChargeItem(index, { remark: event.target.value })
          }
        />
      ),
    },
  ]

  if (canEdit) {
    columns.push({
      title: '操作',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_value, _record, index) => (
        <Button
          aria-label="删除费用"
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => removeChargeItem(index)}
        />
      ),
    })
  }

  return (
    <div className="module-items-panel mt-6">
      <div className="editor-items-head">
        <div className="editor-items-title-block editor-items-title-row">
          <h3 className="detail-section-title">其他费用</h3>
          {canEdit ? (
            <div className="editor-items-actions">
              <Button
                type="primary"
                className="overlay-action-button"
                icon={<PlusOutlined />}
                onClick={onAddChargeItem}
              >
                新增费用
              </Button>
            </div>
          ) : null}
          <div className="editor-items-summary editor-items-summary-inline">
            <span>商品金额 {formatAmount(productAmount)}</span>
            <span>其他费用 {formatAmount(chargeAmount)}</span>
            <span>
              {getTotalLabel(settlementDirection)} {formatAmount(totalAmount)}
            </span>
          </div>
        </div>
      </div>
      <div className="editor-items-summary editor-items-summary-mobile">
        <span>商品金额 {formatAmount(productAmount)}</span>
        <span>其他费用 {formatAmount(chargeAmount)}</span>
        <span>
          {getTotalLabel(settlementDirection)} {formatAmount(totalAmount)}
        </span>
      </div>
      <Table
        rowKey={(record, index) => String(record.id || index)}
        dataSource={chargeItems}
        columns={columns}
        pagination={false}
        size="small"
        tableLayout="fixed"
        locale={{ emptyText: '暂无费用' }}
      />
    </div>
  )
}
