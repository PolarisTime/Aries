import { z } from 'zod'
import { apiGet, assertApiSuccess } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { apiResponseSchema } from '@/shared/schemas/api'
import { getApiMessage } from '@/utils/api-messages'

export interface MenuNode {
  menuCode: string
  menuName: string
  parentCode: string | null
  routePath: string | null
  icon: string | null
  sortOrder: number
  menuType: string
  children: MenuNode[]
}

interface RawMenuNode {
  menuCode?: string
  menuName?: string
  parentCode?: string | null
  routePath?: string | null
  icon?: string | null
  sortOrder?: number
  menuType?: string
  children?: RawMenuNode[]
  code?: string
  title?: string
  parentId?: number | null
  path?: string | null
}

const rawMenuNodeSchema: z.ZodType<RawMenuNode> = z.lazy(() =>
  z.object({
    menuCode: z.string().optional(),
    menuName: z.string().optional(),
    parentCode: z.string().nullable().optional(),
    routePath: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    sortOrder: z.number().optional(),
    menuType: z.string().optional(),
    children: z.array(rawMenuNodeSchema).optional(),
    code: z.string().optional(),
    title: z.string().optional(),
    parentId: z.number().nullable().optional(),
    path: z.string().nullable().optional(),
  }),
)

const menuResponseSchema = apiResponseSchema(z.array(rawMenuNodeSchema))

function normalizeMenuNode(
  node: RawMenuNode,
  parentCode: string | null = null,
): MenuNode {
  const menuCode = String(node.menuCode || node.code || '')
  return {
    menuCode,
    menuName: String(node.menuName || node.title || menuCode),
    parentCode: node.parentCode ?? parentCode,
    routePath: node.routePath ?? node.path ?? null,
    icon: node.icon ?? null,
    sortOrder: typeof node.sortOrder === 'number' ? node.sortOrder : 0,
    menuType: String(node.menuType || 'MENU'),
    children: Array.isArray(node.children)
      ? node.children.map((child) => normalizeMenuNode(child, menuCode))
      : [],
  }
}

export async function listSystemMenus() {
  const response = assertApiSuccess(
    await apiGet(ENDPOINTS.SYSTEM_MENUS_TREE, menuResponseSchema),
    getApiMessage('loadMenusFailed'),
  )
  return Array.isArray(response.data)
    ? response.data.map((node) => normalizeMenuNode(node))
    : []
}
