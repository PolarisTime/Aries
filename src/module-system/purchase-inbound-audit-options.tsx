import {
  Input,
  Select,
  Space,
  Table,
  type TableColumnsType,
  Typography,
} from 'antd'
import { useState } from 'react'
import type { PurchaseInboundAuditCommandInput } from '@/api/document-flow-commands'
import type { MaterialCategoryOption } from '@/api/material-categories'
import { fetchMaterialCategories } from '@/api/material-categories'
import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import { toRoundedNumber } from '@/module-system/module-editor-shared'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'

const DEFAULT_TOLERANCE_PERCENT = 5

const REASON_OPTIONS = [
  { value: 'TRANSPORT_LOSS', label: '运输损耗' },
  { value: 'HANDLING_LOSS', label: '装卸损耗' },
  { value: 'MEASUREMENT_DIFFERENCE', label: '计量差异' },
  { value: 'SUPPLIER_CONFIRMED', label: '供应商确认' },
  { value: 'MOISTURE_OR_IMPURITY_CHANGE', label: '水分或杂质变化' },
  { value: 'THEORETICAL_WEIGHT_DEVIATION', label: '理论重量偏差' },
  { value: 'OTHER', label: '其他' },
] as const

interface OverToleranceLine {
  inboundItemId: string
  lineNo: number
  materialLabel: string
  direction: '上差' | '下差'
  actualPercent: number
  limitPercent: number
}

interface ConfirmationDraft {
  reasonCode?: string
  remark: string
}

interface AuditOptionsDraft {
  confirmations: Record<string, ConfirmationDraft>
}

interface Props {
  lines: OverToleranceLine[]
  onChange: (value: AuditOptionsDraft) => void
}

function normalizeTolerancePercent(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0
    ? toRoundedNumber(parsed, 2)
    : DEFAULT_TOLERANCE_PERCENT
}

function materialLabel(item: ModuleLineItem, lineNo: number) {
  return (
    [item.materialCode, item.brand, item.material, item.spec]
      .map((value) => asString(value).trim())
      .filter(Boolean)
      .join(' / ') || `第 ${lineNo} 行`
  )
}

function categoryRuleMap(options: MaterialCategoryOption[]) {
  return new Map(
    options
      .map((option) => [asString(option.value).trim(), option] as const)
      .filter(([category]) => Boolean(category)),
  )
}

export function resolvePurchaseInboundOverToleranceLines(
  record: ModuleRecord,
  categoryOptions: MaterialCategoryOption[],
): OverToleranceLine[] {
  const rules = categoryRuleMap(categoryOptions)
  const items = Array.isArray(record.items) ? record.items : []

  return items.flatMap((item, index) => {
    const lineNo = Number(item.lineNo || index + 1)
    const category = asString(item.category).trim()
    const rule = rules.get(category)
    const purchaseWeighRequired = Boolean(rule?.purchaseWeighRequired)
    const weighSettlement = asString(item.settlementMode).trim() === '过磅'

    if (purchaseWeighRequired !== weighSettlement) {
      throw new Error(
        `第 ${lineNo} 行品类过磅规则已变化，请退回草稿重新保存后再审核`,
      )
    }
    if (!weighSettlement) {
      return []
    }

    const quantity = Number(item.quantity || 0)
    const pieceWeightTon = Number(item.pieceWeightTon || 0)
    const rawActualWeight = item.weighWeightTon
    if (
      rawActualWeight === undefined ||
      rawActualWeight === null ||
      rawActualWeight === ''
    ) {
      throw new Error(`第 ${lineNo} 行需填写过磅重量`)
    }
    const actualWeightTon = toRoundedNumber(
      rawActualWeight,
      INTERNAL_WEIGHT_PRECISION,
    )
    if (actualWeightTon < 0 || (quantity > 0 && actualWeightTon === 0)) {
      throw new Error(`第 ${lineNo} 行过磅重量必须大于 0`)
    }

    const theoreticalWeightTon = toRoundedNumber(
      quantity * pieceWeightTon,
      INTERNAL_WEIGHT_PRECISION,
    )
    if (theoreticalWeightTon <= 0) {
      return []
    }

    const difference = toRoundedNumber(
      actualWeightTon - theoreticalWeightTon,
      INTERNAL_WEIGHT_PRECISION,
    )
    const actualPercent = toRoundedNumber(
      (Math.abs(difference) * 100) / theoreticalWeightTon,
      4,
    )
    const limitPercent = normalizeTolerancePercent(
      difference > 0
        ? rule?.purchaseWeighOverTolerancePercent
        : rule?.purchaseWeighUnderTolerancePercent,
    )
    if (actualPercent <= limitPercent) {
      return []
    }

    const inboundItemId = asString(item.id).trim()
    if (!inboundItemId) {
      throw new Error(`第 ${lineNo} 行缺少稳定明细 ID，无法提交超差确认`)
    }
    return [
      {
        inboundItemId,
        lineNo,
        materialLabel: materialLabel(item, lineNo),
        direction: difference > 0 ? '上差' : '下差',
        actualPercent,
        limitPercent,
      } satisfies OverToleranceLine,
    ]
  })
}

function buildAuditInput(
  lines: OverToleranceLine[],
  draft: AuditOptionsDraft,
): PurchaseInboundAuditCommandInput {
  const overToleranceConfirmations = lines.map((line) => {
    const confirmation = draft.confirmations[line.inboundItemId]
    const reasonCode = asString(confirmation?.reasonCode).trim()
    const remark = asString(confirmation?.remark).trim()
    if (!reasonCode) {
      throw new Error(`第 ${line.lineNo} 行必须选择超差原因`)
    }
    if (reasonCode === 'OTHER' && !remark) {
      throw new Error(`第 ${line.lineNo} 行选择其他原因时必须填写备注`)
    }
    return {
      inboundItemId: line.inboundItemId,
      reasonCode,
      ...(remark ? { remark } : {}),
    }
  })
  return {
    overToleranceConfirmations,
  }
}

function PurchaseInboundAuditOptions({ lines, onChange }: Props) {
  const [confirmations, setConfirmations] = useState<
    Record<string, ConfirmationDraft>
  >({})

  const updateConfirmation = (
    inboundItemId: string,
    patch: Partial<ConfirmationDraft>,
  ) => {
    setConfirmations((current) => {
      const next = {
        ...current,
        [inboundItemId]: {
          reasonCode: current[inboundItemId]?.reasonCode,
          remark: current[inboundItemId]?.remark || '',
          ...patch,
        },
      }
      onChange({ confirmations: next })
      return next
    })
  }

  const columns: TableColumnsType<OverToleranceLine> = [
    {
      title: '行号',
      dataIndex: 'lineNo',
      width: 64,
      align: 'center',
    },
    {
      title: '物料',
      dataIndex: 'materialLabel',
      width: 190,
      ellipsis: true,
    },
    {
      title: '差异',
      width: 150,
      render: (_, line) =>
        `${line.direction} ${line.actualPercent}% / 允许 ${line.limitPercent}%`,
    },
    {
      title: '超差原因',
      width: 180,
      render: (_, line) => (
        <Select
          aria-label={`第 ${line.lineNo} 行超差原因`}
          value={confirmations[line.inboundItemId]?.reasonCode}
          options={[...REASON_OPTIONS]}
          placeholder="选择原因"
          style={{ width: '100%' }}
          onChange={(reasonCode) =>
            updateConfirmation(line.inboundItemId, { reasonCode })
          }
        />
      ),
    },
    {
      title: '备注',
      width: 210,
      render: (_, line) => (
        <Input
          aria-label={`第 ${line.lineNo} 行超差备注`}
          value={confirmations[line.inboundItemId]?.remark || ''}
          maxLength={255}
          placeholder={
            confirmations[line.inboundItemId]?.reasonCode === 'OTHER'
              ? '必填'
              : '选填'
          }
          onChange={(event) =>
            updateConfirmation(line.inboundItemId, {
              remark: event.target.value,
            })
          }
        />
      ),
    },
  ]

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {lines.length ? (
        <Table
          rowKey="inboundItemId"
          size="small"
          columns={columns}
          dataSource={lines}
          pagination={false}
          scroll={{ x: 794, y: 320 }}
        />
      ) : (
        <Typography.Text type="secondary">当前没有超差明细</Typography.Text>
      )}
    </Space>
  )
}

export async function requestPurchaseInboundAuditInput(
  record: ModuleRecord,
): Promise<PurchaseInboundAuditCommandInput | null> {
  const latestCategoryOptions = await fetchMaterialCategories()
  const lines = resolvePurchaseInboundOverToleranceLines(
    record,
    latestCategoryOptions,
  )
  let draft: AuditOptionsDraft = {
    confirmations: {},
  }

  return new Promise((resolve) => {
    modal.confirm({
      title: '审核采购入库',
      content: (
        <PurchaseInboundAuditOptions
          lines={lines}
          onChange={(next) => {
            draft = next
          }}
        />
      ),
      width: 900,
      okText: '确认审核',
      cancelText: '取消',
      maskClosable: false,
      onOk: () => {
        try {
          resolve(buildAuditInput(lines, draft))
        } catch (error) {
          const validationError =
            error instanceof Error ? error : new Error('请补充超差确认信息')
          message.warning(validationError.message)
          return Promise.reject(validationError)
        }
      },
      onCancel: () => resolve(null),
    })
  })
}
