import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { readRequestError } from '@/api/core/request-errors'
import type {
  ProjectOpeningBalanceRecord,
  ProjectOpeningBalanceStatus,
  ProjectOpeningBalanceType,
  ProjectOpeningBalanceUpsertPayload,
} from '@/api/finance/project-opening-balances'
import { hasPermission } from '@/utils/permission'
import { asString } from '@/utils/type-narrowing'

export const PROJECT_OPENING_BALANCE_PERMISSIONS = {
  READ: 'project-opening-balances:read',
  CREATE: 'project-opening-balances:create',
  UPDATE: 'project-opening-balances:update',
  DELETE: 'project-opening-balances:delete',
  CONFIRM: 'project-opening-balances:confirm',
} as const

export interface ProjectOpeningBalanceCapabilities {
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canConfirm: boolean
}

export function resolveOpeningBalanceCapabilities(
  permissions: readonly string[] | null | undefined,
): ProjectOpeningBalanceCapabilities {
  return {
    canCreate: hasPermission(
      permissions,
      PROJECT_OPENING_BALANCE_PERMISSIONS.CREATE,
    ),
    canUpdate: hasPermission(
      permissions,
      PROJECT_OPENING_BALANCE_PERMISSIONS.UPDATE,
    ),
    canDelete: hasPermission(
      permissions,
      PROJECT_OPENING_BALANCE_PERMISSIONS.DELETE,
    ),
    canConfirm: hasPermission(
      permissions,
      PROJECT_OPENING_BALANCE_PERMISSIONS.CONFIRM,
    ),
  }
}

export interface ProjectOpeningBalanceFormValues {
  balanceNo?: string
  projectId: string
  balanceType: ProjectOpeningBalanceType
  cutoffDate?: Dayjs | string
  openingAmount?: number
  legacyDocNo?: string
  remark?: string
}

export function buildOpeningBalanceFormValues(
  record: ProjectOpeningBalanceRecord | null,
  defaultProjectId?: string,
): ProjectOpeningBalanceFormValues {
  if (!record) {
    return {
      balanceNo: '',
      projectId: defaultProjectId || '',
      balanceType: 'RECEIVABLE',
      cutoffDate: undefined,
      openingAmount: undefined,
      legacyDocNo: '',
      remark: '',
    }
  }
  return {
    balanceNo: record.balanceNo,
    projectId: record.projectId,
    balanceType: record.balanceType,
    cutoffDate: record.cutoffDate ? dayjs(record.cutoffDate) : undefined,
    openingAmount: record.openingAmount,
    legacyDocNo: record.legacyDocNo ?? '',
    remark: record.remark ?? '',
  }
}

export function buildOpeningBalancePayload(
  values: ProjectOpeningBalanceFormValues,
  confirm: boolean,
): ProjectOpeningBalanceUpsertPayload {
  const cutoffDate = dayjs.isDayjs(values.cutoffDate)
    ? values.cutoffDate.format('YYYY-MM-DD')
    : asString(values.cutoffDate).trim()
  const balanceNo = asString(values.balanceNo).trim()
  const legacyDocNo = asString(values.legacyDocNo).trim()
  const remark = asString(values.remark).trim()

  return {
    ...(balanceNo ? { balanceNo } : {}),
    projectId: asString(values.projectId).trim(),
    balanceType: values.balanceType,
    cutoffDate,
    openingAmount: Number(values.openingAmount ?? 0),
    ...(legacyDocNo ? { legacyDocNo } : {}),
    ...(remark ? { remark } : {}),
    confirm,
  }
}

export function isOpeningBalanceVersionConflict(error: unknown): boolean {
  const { status, code } = readRequestError(error)
  return status === 412 || status === 428 || code === 4120 || code === 4280
}

export function isDraftOpeningBalance(
  status: ProjectOpeningBalanceStatus,
): boolean {
  return status === 'DRAFT'
}

export function canUnlockOpeningBalance(
  record: ProjectOpeningBalanceRecord,
): boolean {
  return record.status === 'CONFIRMED' && record.settledAmount <= 0
}
