import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { TFunction } from 'i18next'
import i18next from 'i18next'
import { readRequestError } from '@/api/core/request-errors'
import type { SalesContractUpsertPayload } from '@/api/sales/sales-contracts'
import type {
  SalesContractResponse,
  SalesContractStatus,
} from '@/shared/schemas/sales-contract'
import { asString } from '@/utils/type-narrowing'

/**
 * 销售合同状态(后端定稿): 草稿 / 审核 / 签发 / 归档 / 作废。
 * 流转 草稿 → 审核 → 签发 → 归档; 作废仅自 草稿 / 审核 / 归档, 签发不可作废。
 */
export const SALES_CONTRACT_STATUS = {
  DRAFT: '草稿',
  REVIEWED: '审核',
  ISSUED: '签发',
  ARCHIVED: '归档',
  VOIDED: '作废',
} as const

const SALES_CONTRACT_STATUS_LABEL_KEY: Record<SalesContractStatus, string> = {
  [SALES_CONTRACT_STATUS.DRAFT]: 'modules.status.draft',
  [SALES_CONTRACT_STATUS.REVIEWED]: 'modules.status.reviewed',
  [SALES_CONTRACT_STATUS.ISSUED]: 'modules.status.issued',
  [SALES_CONTRACT_STATUS.ARCHIVED]: 'modules.status.archived',
  [SALES_CONTRACT_STATUS.VOIDED]: 'modules.status.voided',
}

export const SALES_CONTRACT_STATUS_OPTIONS = [
  {
    label: i18next.t(
      SALES_CONTRACT_STATUS_LABEL_KEY[SALES_CONTRACT_STATUS.DRAFT],
    ),
    value: SALES_CONTRACT_STATUS.DRAFT,
  },
  {
    label: i18next.t(
      SALES_CONTRACT_STATUS_LABEL_KEY[SALES_CONTRACT_STATUS.REVIEWED],
    ),
    value: SALES_CONTRACT_STATUS.REVIEWED,
  },
  {
    label: i18next.t(
      SALES_CONTRACT_STATUS_LABEL_KEY[SALES_CONTRACT_STATUS.ISSUED],
    ),
    value: SALES_CONTRACT_STATUS.ISSUED,
  },
  {
    label: i18next.t(
      SALES_CONTRACT_STATUS_LABEL_KEY[SALES_CONTRACT_STATUS.ARCHIVED],
    ),
    value: SALES_CONTRACT_STATUS.ARCHIVED,
  },
  {
    label: i18next.t(
      SALES_CONTRACT_STATUS_LABEL_KEY[SALES_CONTRACT_STATUS.VOIDED],
    ),
    value: SALES_CONTRACT_STATUS.VOIDED,
  },
] as const

/** 状态展示用 i18n key; 未知状态返回 undefined。 */
export function getSalesContractStatusLabelKey(
  status: string,
): string | undefined {
  return SALES_CONTRACT_STATUS_LABEL_KEY[status as SalesContractStatus]
}

export type SalesContractStatusActionKind =
  | 'audit'
  | 'issue'
  | 'archive'
  | 'void'

export interface SalesContractCapabilities {
  canEdit: boolean
  canDelete: boolean
  /** 草稿 → 审核。 */
  canAudit: boolean
  /** 审核 → 签发。 */
  canIssue: boolean
  /** 签发 → 归档。 */
  canArchive: boolean
  /** 作废: 仅 草稿 / 审核 / 归档 可用, 签发不可作废。 */
  canVoid: boolean
}

/**
 * 命令式状态机(与后端 StatusConstants.SALES_CONTRACT_TRANSITIONS 对齐):
 * 草稿可编辑/删除/审核/作废; 审核可签发/作废; 签发仅可归档(不可作废);
 * 归档可作废; 作废为终态只读。实际权限仍由后端 SALES_CONTRACTS_* 权限点兜底。
 */
export function resolveSalesContractCapabilities(
  record: Pick<SalesContractResponse, 'status'> | undefined,
): SalesContractCapabilities {
  const status = asString(record?.status).trim()
  if (status === SALES_CONTRACT_STATUS.DRAFT) {
    return {
      canEdit: true,
      canDelete: true,
      canAudit: true,
      canIssue: false,
      canArchive: false,
      canVoid: true,
    }
  }
  if (status === SALES_CONTRACT_STATUS.REVIEWED) {
    return {
      canEdit: false,
      canDelete: false,
      canAudit: false,
      canIssue: true,
      canArchive: false,
      canVoid: true,
    }
  }
  if (status === SALES_CONTRACT_STATUS.ISSUED) {
    return {
      canEdit: false,
      canDelete: false,
      canAudit: false,
      canIssue: false,
      canArchive: true,
      canVoid: false,
    }
  }
  if (status === SALES_CONTRACT_STATUS.ARCHIVED) {
    return {
      canEdit: false,
      canDelete: false,
      canAudit: false,
      canIssue: false,
      canArchive: false,
      canVoid: true,
    }
  }
  return {
    canEdit: false,
    canDelete: false,
    canAudit: false,
    canIssue: false,
    canArchive: false,
    canVoid: false,
  }
}

export function getStatusActionTarget(
  kind: SalesContractStatusActionKind,
): SalesContractStatus {
  switch (kind) {
    case 'audit':
      return SALES_CONTRACT_STATUS.REVIEWED
    case 'issue':
      return SALES_CONTRACT_STATUS.ISSUED
    case 'archive':
      return SALES_CONTRACT_STATUS.ARCHIVED
    case 'void':
      return SALES_CONTRACT_STATUS.VOIDED
  }
}

/** 状态动作对应的按钮 i18n key。 */
export function getStatusActionLabelKey(
  kind: SalesContractStatusActionKind,
): string {
  switch (kind) {
    case 'audit':
      return 'modules.statusActions.audit'
    case 'issue':
      return 'modules.salesContract.issue'
    case 'archive':
      return 'modules.salesContract.archive'
    case 'void':
      return 'modules.salesContract.void'
  }
}

export interface SalesContractFormValues {
  contractNo: string
  name: string
  customerId: string
  projectId: string
  signDate?: Dayjs | string | null
  startDate?: Dayjs | string | null
  endDate?: Dayjs | string | null
  totalAmount?: number | string | null
  totalTonnage?: number | string | null
  remark?: string
}

function toDateOnly(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined
  }
  const parsed = dayjs(value as string)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : undefined
}

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function buildSalesContractFormValues(
  record: SalesContractResponse | null,
): SalesContractFormValues {
  if (!record) {
    return {
      contractNo: '',
      name: '',
      customerId: '',
      projectId: '',
      signDate: null,
      startDate: null,
      endDate: null,
      totalAmount: undefined,
      totalTonnage: undefined,
      remark: '',
    }
  }
  return {
    contractNo: asString(record.contractNo).trim(),
    name: asString(record.name).trim(),
    customerId: asString(record.customerId),
    projectId: asString(record.projectId),
    signDate: toDateOnly(record.signDate) ?? null,
    startDate: toDateOnly(record.startDate) ?? null,
    endDate: toDateOnly(record.endDate) ?? null,
    totalAmount: record.totalAmount,
    totalTonnage: record.totalTonnage,
    remark: asString(record.remark),
  }
}

/**
 * 构造新增/整体替换载荷。
 * 合同编号为空时不提交(由后端生成); 客户/项目名称由后端回填快照, 不进入请求体。
 */
export function buildSalesContractUpsertPayload(
  values: SalesContractFormValues,
): SalesContractUpsertPayload {
  const contractNo = asString(values.contractNo).trim()
  const signDate = toDateOnly(values.signDate)
  const startDate = toDateOnly(values.startDate)
  const endDate = toDateOnly(values.endDate)
  const remark = asString(values.remark).trim()
  return {
    ...(contractNo ? { contractNo } : {}),
    name: asString(values.name).trim(),
    customerId: asString(values.customerId).trim(),
    projectId: asString(values.projectId).trim(),
    signDate: signDate ?? '',
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    totalAmount: toFiniteNumber(values.totalAmount),
    totalTonnage: toFiniteNumber(values.totalTonnage),
    ...(remark ? { remark } : {}),
  }
}

/** 结束日期不得早于开始日期；两者都填写时校验。 */
export function isSalesContractDateRangeValid(values: {
  startDate?: unknown
  endDate?: unknown
}): boolean {
  const start = toDateOnly(values.startDate)
  const end = toDateOnly(values.endDate)
  if (!start || !end) {
    return true
  }
  return !dayjs(end).isBefore(dayjs(start), 'day')
}

/**
 * 判断写操作是否命中资源版本前置条件错误:
 * 412 版本不匹配 / 428 缺少版本前置条件。
 */
export function isSalesContractVersionConflict(error: unknown): boolean {
  const { status, code } = readRequestError(error)
  return status === 412 || status === 428 || code === 4120 || code === 4280
}

/** 表单级校验（供 UI 与单测共用）；返回错误文案，通过时返回 null。 */
export function validateSalesContractForm(
  values: Partial<SalesContractFormValues>,
  t: TFunction,
): string | null {
  if (!asString(values.name).trim()) {
    return t('modules.formField.inputRequired', {
      label: t('modules.salesContract.name'),
    })
  }
  if (!asString(values.customerId).trim()) {
    return t('modules.formField.selectRequired', {
      label: t('modules.salesContract.customer'),
    })
  }
  if (!asString(values.projectId).trim()) {
    return t('modules.formField.selectRequired', {
      label: t('modules.salesContract.project'),
    })
  }
  if (!toDateOnly(values.signDate)) {
    return t('modules.formField.selectRequired', {
      label: t('modules.salesContract.signDate'),
    })
  }
  for (const [key, labelKey] of [
    ['totalAmount', 'modules.salesContract.totalAmount'],
    ['totalTonnage', 'modules.salesContract.totalTonnage'],
  ] as const) {
    const raw = values[key]
    if (raw === null || raw === undefined || raw === '') {
      return t('modules.formField.inputRequired', {
        label: t(labelKey),
      })
    }
    if (!Number.isFinite(Number(raw)) || Number(raw) < 0) {
      return t('modules.formField.nonNegative', {
        label: t(labelKey),
      })
    }
  }
  if (!isSalesContractDateRangeValid(values)) {
    return t('modules.salesContract.dateRangeInvalid')
  }
  return null
}
