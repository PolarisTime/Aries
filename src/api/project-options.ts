import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { queryClient } from '@/lib/query-client'
import type { ApiResponse } from '@/types/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import type { ModuleRecordInput } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export type ProjectOption = {
  id: EntityId
  value: EntityId
  label: string
  customerId: EntityId
  customerCode?: string
  projectCode: string
  projectName: string
  projectNameAbbr?: string
}

type RawProjectOption = {
  id?: unknown
  value?: unknown
  label?: unknown
  customerId?: unknown
  customerCode?: unknown
  projectCode?: unknown
  projectName?: unknown
  projectNameAbbr?: unknown
}

export function normalizeProjectOptions(
  rows: RawProjectOption[],
): ProjectOption[] {
  return rows.map((row, index) => {
    const id = parseEntityId(row.id, `projects[${index}].project.id`)
    const customerId = parseEntityId(
      row.customerId,
      `projects[${index}].customerId`,
    )
    const projectCode = asString(row.projectCode).trim()
    const projectName = asString(row.projectName).trim()
    const projectNameAbbr = asString(row.projectNameAbbr).trim()
    const customerCode = asString(row.customerCode).trim()

    return {
      id,
      value: id,
      customerId,
      projectCode,
      projectName,
      label:
        projectCode && projectName
          ? `${projectCode} / ${projectName}`
          : projectName
            ? `${projectName} / #${id}`
            : `#${id}`,
      ...(customerCode ? { customerCode } : {}),
      ...(projectNameAbbr ? { projectNameAbbr } : {}),
    }
  })
}

export async function fetchProjectOptions(
  customerId: EntityId,
): Promise<ProjectOption[]> {
  const normalizedCustomerId = parseEntityId(customerId, 'customerId')
  const response = await http.get<ApiResponse<RawProjectOption[]>>(
    ENDPOINTS.PROJECTS_OPTIONS,
    { params: { customerId: normalizedCustomerId } },
  )
  return normalizeProjectOptions(response.data || [])
}

function optionalId(value: unknown, field: string): EntityId | undefined {
  try {
    return parseOptionalEntityId(value, field)
  } catch {
    return undefined
  }
}

export function getCustomerProjectOptions(
  form?: ModuleRecordInput,
): ProjectOption[] {
  const customerIdentity =
    form?.customerId ??
    (asString(form?.counterpartyType).trim() === '客户'
      ? form?.counterpartyId
      : undefined)
  const customerId = optionalId(customerIdentity, 'customerId')
  if (!customerId) {
    return []
  }
  return (
    queryClient.getQueryData<ProjectOption[]>(
      QUERY_KEYS.masterOptions.project(customerId),
    ) || []
  )
}

export function findProjectOption(
  projectId: unknown,
  customerId: unknown,
): ProjectOption | undefined {
  const normalizedProjectId = optionalId(projectId, 'projectId')
  const normalizedCustomerId = optionalId(customerId, 'customerId')
  if (!normalizedProjectId || !normalizedCustomerId) {
    return undefined
  }
  return getCustomerProjectOptions({ customerId: normalizedCustomerId }).find(
    (row) =>
      row.id === normalizedProjectId && row.customerId === normalizedCustomerId,
  )
}
