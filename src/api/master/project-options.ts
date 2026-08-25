import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { exactPageSchema } from '@/shared/schemas/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
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
  settlementCompanyId?: EntityId
  settlementCompanyName?: string
}

export type ProjectAbbreviationOption = {
  value: EntityId
  label: string
  title: string
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
  settlementCompanyId?: unknown
  settlementCompanyName?: unknown
}

type RawProjectPageRow = {
  id: unknown
  projectName: unknown
  projectNameAbbr?: unknown
}

const projectOptionsResponseSchema = z.array(
  z.object({
    id: z.unknown().optional(),
    value: z.unknown().optional(),
    label: z.unknown().optional(),
    customerId: z.unknown().optional(),
    customerCode: z.unknown().optional(),
    projectCode: z.unknown().optional(),
    projectName: z.unknown().optional(),
    projectNameAbbr: z.unknown().optional(),
    settlementCompanyId: z.unknown().optional(),
    settlementCompanyName: z.unknown().optional(),
  }),
)

const projectPageResponseSchema = exactPageSchema(
  z.looseObject({
    id: z.unknown(),
    projectName: z.unknown(),
    projectNameAbbr: z.unknown().optional(),
  }),
)

export function toProjectAbbreviationOptions(
  rows: RawProjectPageRow[],
): ProjectAbbreviationOption[] {
  return rows.map((row, index) => {
    const value = parseEntityId(row.id, `projects[${index}].id`)
    const projectName = asString(row.projectName).trim()
    const projectNameAbbr = asString(row.projectNameAbbr).trim()
    const label = projectNameAbbr || projectName || `#${value}`

    return {
      value,
      label,
      title: projectName || label,
    }
  })
}

function normalizeProjectOptions(rows: RawProjectOption[]): ProjectOption[] {
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
    const settlementCompanyId = parseOptionalEntityId(
      row.settlementCompanyId,
      `projects[${index}].settlementCompanyId`,
    )
    const settlementCompanyName = asString(row.settlementCompanyName).trim()

    return {
      id,
      value: id,
      customerId,
      projectCode,
      projectName,
      label: projectName || `#${id}`,
      ...(customerCode ? { customerCode } : {}),
      ...(projectNameAbbr ? { projectNameAbbr } : {}),
      ...(settlementCompanyId ? { settlementCompanyId } : {}),
      ...(settlementCompanyName ? { settlementCompanyName } : {}),
    }
  })
}

export async function fetchProjectOptions(
  customerId: EntityId,
): Promise<ProjectOption[]> {
  const normalizedCustomerId = parseEntityId(customerId, 'customerId')
  const response = await apiGet(
    ENDPOINTS.PROJECTS_OPTIONS,
    projectOptionsResponseSchema,
    { params: { customerId: normalizedCustomerId } },
  )
  return normalizeProjectOptions(response)
}

export async function fetchProjectAbbreviationOptions(
  signal?: AbortSignal,
): Promise<ProjectAbbreviationOption[]> {
  const response = await apiGet(ENDPOINTS.PROJECTS, projectPageResponseSchema, {
    params: {
      page: 0,
      size: 200,
      sortBy: 'projectCode',
      direction: 'asc',
      status: '正常',
    },
    signal,
  })
  return toProjectAbbreviationOptions(response.content)
}
