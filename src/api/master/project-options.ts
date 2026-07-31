import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'
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
  }),
)

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

    return {
      id,
      value: id,
      customerId,
      projectCode,
      projectName,
      label: projectName || `#${id}`,
      ...(customerCode ? { customerCode } : {}),
      ...(projectNameAbbr ? { projectNameAbbr } : {}),
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
