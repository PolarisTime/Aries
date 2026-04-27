import type { Page, Route } from '@playwright/test'

export interface MockLoginUser {
  id: number | string
  loginName: string
  userName: string
  roleName?: string
  totpEnabled?: boolean
  menuCodes: string[]
  actionMap: Record<string, string[]>
}

export interface MockModuleRecord {
  id: string
  [key: string]: unknown
}

interface MockApiOptions {
  loginMode?: 'password' | '2fa'
  allowRefresh?: boolean
  user?: Partial<MockLoginUser>
  modules?: Record<string, MockModuleRecord[]>
}

const DEFAULT_USER: MockLoginUser = {
  id: 1001,
  loginName: 'e2e-admin',
  userName: '测试管理员',
  roleName: '系统管理员',
  totpEnabled: true,
  menuCodes: [
    '/dashboard',
    '/materials',
    '/purchase-orders',
    '/purchase-inbounds',
    '/warehouses',
  ],
  actionMap: {
    dashboard: ['VIEW'],
    materials: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    'purchase-orders': ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    'purchase-inbounds': ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    warehouses: ['VIEW'],
  },
}

const DEFAULT_MODULES: Record<string, MockModuleRecord[]> = {
  materials: [
    {
      id: 'mat-001',
      materialCode: 'MAT-001',
      brand: '宝钢',
      material: 'Q235B',
      category: '螺纹钢',
      spec: '18',
      length: '9m',
      unit: '吨',
      quantityUnit: '件',
      pieceWeightTon: 2.5,
      piecesPerBundle: 7,
      unitPrice: 4123.45,
      batchNoEnabled: false,
      remark: '现货',
    },
    {
      id: 'mat-002',
      materialCode: 'MAT-002',
      brand: '沙钢',
      material: 'HRB400E',
      category: '盘螺',
      spec: '8',
      length: '9m',
      unit: '吨',
      quantityUnit: '件',
      pieceWeightTon: 1.25,
      piecesPerBundle: 7,
      unitPrice: 3988,
      batchNoEnabled: true,
      remark: '弹窗选择用商品',
    },
  ],
  warehouses: [
    {
      id: 'wh-001',
      warehouseName: '一号库',
      warehouseType: '成品库',
      status: '正常',
    },
    {
      id: 'wh-002',
      warehouseName: '二号库',
      warehouseType: '中转库',
      status: '正常',
    },
  ],
  'purchase-orders': [
    {
      id: 'po-001',
      orderNo: 'PO-20260426-001',
      supplierName: '江苏沙钢',
      buyerName: '测试管理员',
      orderDate: '2026-04-26',
      totalWeight: 2.5,
      totalAmount: 10308.63,
      status: '草稿',
      remark: 'E2E上级单据',
      items: [
        {
          id: 'po-item-001',
          materialCode: 'MAT-001',
          brand: '宝钢',
          category: '螺纹钢',
          material: 'Q235B',
          spec: '18',
          length: '9m',
          unit: '吨',
          warehouseName: '一号库',
          batchNo: '',
          quantity: 1,
          quantityUnit: '件',
          pieceWeightTon: 2.5,
          piecesPerBundle: 7,
          weightTon: 2.5,
          unitPrice: 4123.45,
          amount: 10308.63,
        },
      ],
    },
  ],
  'purchase-inbounds': [],
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function buildUser(overrides?: Partial<MockLoginUser>) {
  return {
    ...clone(DEFAULT_USER),
    ...clone(overrides || {}),
    menuCodes: clone(overrides?.menuCodes || DEFAULT_USER.menuCodes),
    actionMap: clone(overrides?.actionMap || DEFAULT_USER.actionMap),
  }
}

function buildModules(overrides?: Record<string, MockModuleRecord[]>) {
  return {
    ...clone(DEFAULT_MODULES),
    ...clone(overrides || {}),
  }
}

function success<T>(data: T, message?: string) {
  return {
    code: 0,
    message,
    data,
  }
}

function normalizePath(pathname: string) {
  return pathname.replace(/^\/api/, '') || '/'
}

function toNumber(value: string | null, fallback: number) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function roundNumber(value: number, precision: number) {
  return Number(value.toFixed(precision))
}

function sumItemField(items: unknown[], key: string) {
  return items.reduce((sum, item) => {
    const numeric = Number((item as Record<string, unknown>)?.[key] || 0)
    return Number.isFinite(numeric) ? sum + numeric : sum
  }, 0)
}

function buildDerivedModuleFields(moduleKey: string, payload: Record<string, unknown>) {
  const nextRecord: Record<string, unknown> = {
    ...payload,
  }
  const items = Array.isArray(payload.items) ? payload.items : []

  if (
    [
      'purchase-orders',
      'purchase-inbounds',
      'sales-orders',
      'sales-outbounds',
      'purchase-contracts',
      'sales-contracts',
    ].includes(moduleKey)
  ) {
    nextRecord.totalWeight = roundNumber(sumItemField(items, 'weightTon'), 3)
    nextRecord.totalAmount = roundNumber(sumItemField(items, 'amount'), 2)
  }

  if (moduleKey === 'freight-bills') {
    const totalWeight = roundNumber(sumItemField(items, 'weightTon'), 3)
    nextRecord.totalWeight = totalWeight
    nextRecord.totalFreight = roundNumber(Number(payload.unitPrice || 0) * totalWeight, 2)
    nextRecord.status = payload.status || '未审核'
    nextRecord.deliveryStatus = payload.deliveryStatus || '未送达'
  }

  return nextRecord
}

function getNestedValues(record: unknown): string[] {
  if (record == null) {
    return []
  }
  if (Array.isArray(record)) {
    return record.flatMap((item) => getNestedValues(item))
  }
  if (typeof record === 'object') {
    return Object.values(record as Record<string, unknown>).flatMap((item) => getNestedValues(item))
  }
  return [String(record)]
}

function filterRows(rows: MockModuleRecord[], url: URL) {
  const keyword = String(url.searchParams.get('keyword') || '').trim().toLowerCase()
  if (!keyword) {
    return rows
  }

  return rows.filter((record) =>
    getNestedValues(record).some((value) => value.toLowerCase().includes(keyword)),
  )
}

function toPagedRecords(rows: MockModuleRecord[], url: URL) {
  const page = Math.max(toNumber(url.searchParams.get('page'), 0), 0)
  const size = Math.max(toNumber(url.searchParams.get('size'), 20), 1)
  const filteredRows = filterRows(rows, url)
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / size))
  const start = page * size
  const records = filteredRows.slice(start, start + size)

  return {
    records,
    page,
    size,
    totalElements: filteredRows.length,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
  }
}

function buildDashboardSummary(user: MockLoginUser) {
  return {
    appName: 'Leo ERP',
    companyName: 'Leo 钢贸',
    userName: user.userName,
    loginName: user.loginName,
    roleName: user.roleName || '系统管理员',
    visibleMenuCount: user.menuCodes.length,
    moduleCount: 4,
    actionCount: Object.values(user.actionMap).reduce((sum, actions) => sum + actions.length, 0),
    activeSessionCount: 1,
    totpEnabled: Boolean(user.totpEnabled),
    lastLoginAt: '2026-04-26T09:30:00',
    serverTime: '2026-04-26T10:00:00',
  }
}

function buildMenuTree() {
  return [
    {
      menuCode: 'dashboard',
      menuName: '工作台',
      parentCode: null,
      routePath: '/dashboard',
      icon: 'HomeOutlined',
      sortOrder: 1,
      menuType: 'MENU',
      actions: ['VIEW'],
      children: [],
    },
    {
      menuCode: 'materials',
      menuName: '商品资料',
      parentCode: null,
      routePath: '/materials',
      icon: 'DatabaseOutlined',
      sortOrder: 2,
      menuType: 'MENU',
      actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
      children: [],
    },
    {
      menuCode: 'warehouses',
      menuName: '仓库资料',
      parentCode: null,
      routePath: '/warehouses',
      icon: 'BankOutlined',
      sortOrder: 3,
      menuType: 'MENU',
      actions: ['VIEW'],
      children: [],
    },
    {
      menuCode: 'purchase-orders',
      menuName: '采购订单',
      parentCode: null,
      routePath: '/purchase-orders',
      icon: 'ProfileOutlined',
      sortOrder: 4,
      menuType: 'MENU',
      actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
      children: [],
    },
    {
      menuCode: 'purchase-inbounds',
      menuName: '采购入库',
      parentCode: null,
      routePath: '/purchase-inbounds',
      icon: 'InboxOutlined',
      sortOrder: 5,
      menuType: 'MENU',
      actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
      children: [],
    },
  ]
}

function buildLoginResponse(user: MockLoginUser) {
  return {
    accessToken: 'mock-access-token',
    tokenType: 'Bearer',
    expiresIn: 1800,
    user,
  }
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  })
}

export async function installMockApi(page: Page, options: MockApiOptions = {}) {
  const user = buildUser(options.user)
  const modules = buildModules(options.modules)
  const loginMode = options.loginMode || 'password'
  const allowRefresh = options.allowRefresh ?? false

  await page.context().route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = normalizePath(url.pathname)
    const method = request.method().toUpperCase()

    if (!url.pathname.startsWith('/api/')) {
      await route.continue()
      return
    }

    if (path === '/auth/refresh' && method === 'POST') {
      if (!allowRefresh) {
        await fulfillJson(route, { code: 4010, message: 'refreshToken无效或已过期' }, 401)
        return
      }
      await fulfillJson(route, success(buildLoginResponse(user)))
      return
    }

    if (path === '/auth/login' && method === 'POST') {
      if (loginMode === '2fa') {
        await fulfillJson(route, success({ requires2fa: true, tempToken: 'mock-temp-token' }))
        return
      }
      await fulfillJson(route, success(buildLoginResponse(user)))
      return
    }

    if (path === '/auth/login-2fa' && method === 'POST') {
      await fulfillJson(route, success(buildLoginResponse(user)))
      return
    }

    if (path === '/auth/logout' && method === 'POST') {
      await fulfillJson(route, success(null))
      return
    }

    if (path === '/auth/ping' && method === 'GET') {
      await fulfillJson(route, success('pong'))
      return
    }

    if (path === '/system/menus/tree' && method === 'GET') {
      await fulfillJson(route, success(buildMenuTree()))
      return
    }

    if (path === '/dashboard/summary' && method === 'GET') {
      await fulfillJson(route, success(buildDashboardSummary(user)))
      return
    }

    if (path === '/general-settings/upload-rule' && method === 'GET') {
      await fulfillJson(route, success(null))
      return
    }

    if (path === '/general-settings/upload-rule' && method === 'PUT') {
      await fulfillJson(route, success(request.postDataJSON() || {}, '保存成功'))
      return
    }

    const moduleKey = Object.keys(modules).find((key) => path === `/${key}` || path.startsWith(`/${key}/`))
    if (moduleKey) {
      const rows = modules[moduleKey]

      if (path === `/${moduleKey}` && method === 'GET') {
        await fulfillJson(route, success(toPagedRecords(rows, url)))
        return
      }

      if (path === `/${moduleKey}` && method === 'POST') {
        const payload = (request.postDataJSON() || {}) as Record<string, unknown>
        const nextRecord: MockModuleRecord = {
          ...buildDerivedModuleFields(moduleKey, payload),
          id: String(payload.id || `${moduleKey}-${rows.length + 1}`),
        }
        rows.unshift(clone(nextRecord))
        await fulfillJson(route, success(nextRecord, '保存成功'))
        return
      }

      const recordId = decodeURIComponent(path.slice(moduleKey.length + 2))
      const index = rows.findIndex((item) => String(item.id) === recordId)

      if (method === 'GET' && index >= 0) {
        await fulfillJson(route, success(rows[index]))
        return
      }

      if (method === 'PUT' && index >= 0) {
        const payload = (request.postDataJSON() || {}) as Record<string, unknown>
        const nextRecord: MockModuleRecord = {
          ...rows[index],
          ...buildDerivedModuleFields(moduleKey, payload),
          id: recordId,
        }
        rows[index] = clone(nextRecord)
        await fulfillJson(route, success(nextRecord, '保存成功'))
        return
      }

      if (method === 'DELETE' && index >= 0) {
        rows.splice(index, 1)
        await fulfillJson(route, success(null, '删除成功'))
        return
      }
    }

    await fulfillJson(route, { code: 4040, message: `未模拟接口: ${method} ${path}` }, 404)
  })

  return {
    user,
    modules,
  }
}
