import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { Permission } from '@/shared/schemas'
import { permissionSchema } from '@/shared/schemas/role'

const permissionListSchema = z.array(permissionSchema)

export function listPermissions(signal?: AbortSignal): Promise<Permission[]> {
  return apiGet(ENDPOINTS.PERMISSIONS, permissionListSchema, { signal })
}
