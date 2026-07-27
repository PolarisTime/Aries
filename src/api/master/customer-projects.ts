import { z } from 'zod'
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  assertApiSuccess,
} from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import {
  apiResponseSchema,
  exactPageSchema,
  nullResponseSchema,
} from '@/shared/schemas/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

export interface CustomerProject {
  id: EntityId
  projectCode: string
  projectName: string
  projectNameAbbr: string
  projectAddress: string
  projectManager: string
  customerId: EntityId
  customerCode: string
  status: string
  remark: string
}

export interface CustomerProjectInput {
  projectCode: string
  projectName: string
  projectNameAbbr?: string
  projectAddress?: string
  projectManager?: string
  customerId: EntityId
  customerCode: string
  status: string
  remark?: string
}

const rawProjectSchema = z.looseObject({
  id: z.unknown(),
  projectCode: z.unknown(),
  projectName: z.unknown(),
  projectNameAbbr: z.unknown().optional(),
  projectAddress: z.unknown().optional(),
  projectManager: z.unknown().optional(),
  customerId: z.unknown().optional(),
  customerCode: z.unknown(),
  status: z.unknown(),
  remark: z.unknown().optional(),
})

const projectResponseSchema = apiResponseSchema(rawProjectSchema)
const projectPageResponseSchema = apiResponseSchema(
  exactPageSchema(rawProjectSchema),
)

function normalizeProject(
  raw: z.output<typeof rawProjectSchema>,
  fallbackCustomerId: EntityId,
): CustomerProject {
  return {
    id: parseEntityId(raw.id, 'project.id'),
    projectCode: asString(raw.projectCode).trim(),
    projectName: asString(raw.projectName).trim(),
    projectNameAbbr: asString(raw.projectNameAbbr).trim(),
    projectAddress: asString(raw.projectAddress).trim(),
    projectManager: asString(raw.projectManager).trim(),
    customerId: parseEntityId(
      raw.customerId ?? fallbackCustomerId,
      'project.customerId',
    ),
    customerCode: asString(raw.customerCode).trim(),
    status: asString(raw.status).trim(),
    remark: asString(raw.remark).trim(),
  }
}

export async function fetchCustomerProjects(
  customerId: EntityId,
): Promise<CustomerProject[]> {
  const response = assertApiSuccess(
    await apiGet(ENDPOINTS.PROJECTS, projectPageResponseSchema, {
      params: {
        customerId,
        page: 0,
        size: 200,
        sortBy: 'projectCode',
        direction: 'asc',
      },
    }),
    '查询客户项目失败',
  )
  return response.data.content.map((project) =>
    normalizeProject(project, customerId),
  )
}

export async function saveCustomerProject(
  input: CustomerProjectInput,
  projectId?: EntityId,
): Promise<CustomerProject> {
  const path = projectId
    ? `${ENDPOINTS.PROJECTS}/${encodeURIComponent(projectId)}`
    : ENDPOINTS.PROJECTS
  const request = projectId
    ? apiPut(path, projectResponseSchema, input, withIdempotencyKey())
    : apiPost(path, projectResponseSchema, input, withIdempotencyKey())
  const response = assertApiSuccess(await request, '保存客户项目失败')
  return normalizeProject(response.data, input.customerId)
}

export async function deleteCustomerProject(projectId: EntityId) {
  return assertApiSuccess(
    await apiDelete(
      `${ENDPOINTS.PROJECTS}/${encodeURIComponent(projectId)}`,
      nullResponseSchema,
      withIdempotencyKey(),
    ),
    '删除客户项目失败',
  )
}
