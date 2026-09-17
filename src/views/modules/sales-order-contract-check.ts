import type { TFunction } from 'i18next'
import type { SalesContractCheck } from '@/api/sales/sales-contracts'
import { formatAmount, formatWeight } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'

export interface SalesOrderContractCheckParams {
  projectId: string
  amount: number
  tonnage: number
  excludeOrderId?: string
}

export interface SalesOrderContractCheckDeps {
  fetchCheck: (
    params: SalesOrderContractCheckParams,
  ) => Promise<SalesContractCheck>
  /** 返回 true 表示“仍然保存”，false 表示“返回修改”。 */
  confirm: (options: {
    title: string
    content: string[]
    okText: string
    cancelText: string
  }) => Promise<boolean>
  warn: (messageText: string) => void
}

export type SalesOrderContractCheckDecision = 'continue' | 'abort'

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * 从销售订单编辑器草稿提取合同校验入参。
 * 未选择项目时返回 null，调用方应直接跳过校验。
 */
export function buildSalesOrderContractCheckParams(
  record: Record<string, unknown>,
): SalesOrderContractCheckParams | null {
  const projectId = asString(record.projectId).trim()
  if (!projectId) {
    return null
  }
  const excludeOrderId = asString(record.id).trim()
  return {
    projectId,
    amount: toFiniteNumber(record.totalAmount),
    tonnage: toFiniteNumber(record.totalWeight),
    ...(excludeOrderId ? { excludeOrderId } : {}),
  }
}

/** 仅在存在有效合同且金额或吨位任一超限时提示。 */
export function shouldWarnSalesOrderContract(
  check: SalesContractCheck | null | undefined,
): boolean {
  if (!check?.hasContract) {
    return false
  }
  return check.exceededAmount > 0 || check.exceededTonnage > 0
}

/** 构造确认框展示行，供弹层与单测共用。 */
export function buildSalesOrderContractCheckLines(
  check: SalesContractCheck,
  t: TFunction,
): string[] {
  const lines = [
    t('modules.salesContractCheck.contractAmount', {
      value: formatAmount(check.contractAmount),
    }),
    t('modules.salesContractCheck.usedAmount', {
      value: formatAmount(check.usedAmount),
    }),
    t('modules.salesContractCheck.remainingAmount', {
      value: formatAmount(check.remainingAmount),
    }),
    t('modules.salesContractCheck.contractTonnage', {
      value: formatWeight(check.contractTonnage),
    }),
    t('modules.salesContractCheck.usedTonnage', {
      value: formatWeight(check.usedTonnage),
    }),
    t('modules.salesContractCheck.remainingTonnage', {
      value: formatWeight(check.remainingTonnage),
    }),
  ]
  if (check.exceededAmount > 0) {
    lines.push(
      t('modules.salesContractCheck.exceededAmount', {
        value: formatAmount(check.exceededAmount),
      }),
    )
  }
  if (check.exceededTonnage > 0) {
    lines.push(
      t('modules.salesContractCheck.exceededTonnage', {
        value: formatWeight(check.exceededTonnage),
      }),
    )
  }
  const backendMessage = check.message.trim()
  if (backendMessage) {
    lines.push(backendMessage)
  }
  return lines
}

/**
 * 销售订单保存前的合同额度校验。
 * 任何校验失败都只提示、不阻断（返回 'continue'）；仅当用户主动选择
 * “返回修改”时返回 'abort'。
 */
export async function runSalesOrderContractCheck(
  record: Record<string, unknown>,
  t: TFunction,
  deps: SalesOrderContractCheckDeps,
): Promise<SalesOrderContractCheckDecision> {
  const params = buildSalesOrderContractCheckParams(record)
  if (!params) {
    return 'continue'
  }

  let check: SalesContractCheck
  try {
    check = await deps.fetchCheck(params)
  } catch {
    deps.warn(t('modules.salesContractCheck.checkFailed'))
    return 'continue'
  }

  if (!shouldWarnSalesOrderContract(check)) {
    return 'continue'
  }

  const confirmed = await deps.confirm({
    title: t('modules.salesContractCheck.title'),
    content: buildSalesOrderContractCheckLines(check, t),
    okText: t('modules.salesContractCheck.stillSave'),
    cancelText: t('modules.salesContractCheck.backToEdit'),
  })
  return confirmed ? 'continue' : 'abort'
}
