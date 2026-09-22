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
  /** 网价浮动方向: ADD加价/SUBTRACT减价; 空表示不浮动。 */
  priceFloatMode?: ProjectPriceFloatMode
  /** 网价固定浮动幅度(元/吨)。 */
  priceFloatValue?: number
}

export type ProjectPriceFloatMode = 'ADD' | 'SUBTRACT'

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
  priceFloatMode?: unknown
  priceFloatValue?: unknown
}

type RawProjectPageRow = {
  id: unknown
  projectName: unknown
  projectNameAbbr?: unknown
}

const projectOptionsResponseSchema = z.array(
  z.object({
    id: z.string(),
    value: z.string(),
    label: z.string(),
    customerId: z.string(),
    customerCode: z.string(),
    projectCode: z.string(),
    projectName: z.string(),
    projectNameAbbr: z.string().nullable().optional(),
    settlementCompanyId: z.string().nullable().optional(),
    settlementCompanyName: z.string().nullable().optional(),
    priceFloatMode: z.string().nullable().optional(),
    priceFloatValue: z.union([z.string(), z.number()]).nullable().optional(),
  }),
)

const projectPageResponseSchema = exactPageSchema(
  z.looseObject({
    id: z.string(),
    projectName: z.string(),
    projectNameAbbr: z.string().nullable().optional(),
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
    const priceFloatMode = asString(row.priceFloatMode).trim()
    const priceFloatValueNum = Number(row.priceFloatValue)

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
      ...(priceFloatMode === 'ADD' || priceFloatMode === 'SUBTRACT'
        ? { priceFloatMode }
        : {}),
      ...(Number.isFinite(priceFloatValueNum)
        ? { priceFloatValue: priceFloatValueNum }
        : {}),
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

const PROJECT_OPTIONS_PAGE_SIZE = 200

export async function fetchProjectAbbreviationOptions(
  signal?: AbortSignal,
): Promise<ProjectAbbreviationOption[]> {
  const fetchPage = (page: number) =>
    apiGet(ENDPOINTS.PROJECTS, projectPageResponseSchema, {
      params: {
        page,
        size: PROJECT_OPTIONS_PAGE_SIZE,
        sortBy: 'projectCode',
        direction: 'asc',
        status: '正常',
      },
      signal,
    })

  // 项目下拉必须覆盖全部启用项目：按总页数拉全，避免只取首页截断后选不到。
  const firstPage = await fetchPage(0)
  const restPages = await Promise.all(
    Array.from({ length: Math.max(firstPage.totalPages - 1, 0) }, (_, index) =>
      fetchPage(index + 1),
    ),
  )
  const rows = [firstPage, ...restPages].flatMap((page) => page.content)
  return toProjectAbbreviationOptions(rows)
}
