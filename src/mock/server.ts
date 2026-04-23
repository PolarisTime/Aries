import type { TableResponse } from '@/types/api'
import type {
  ApiResponse,
  CaptchaData,
  LoginPayload,
  LoginResponseData,
} from '@/types/auth'
import type {
  MaterialCategoryNode,
  MaterialListSearch,
  MaterialRecord,
} from '@/types/material'
import type {
  PurchaseOrderRecord,
  PurchaseOrderSearch,
  SupplierOption,
} from '@/types/order'
import type { ListQueryOptions } from '@/utils/list'

interface MockMaterialRecord extends MaterialRecord {
  categoryId: number
}

const mockLatency = 180

const mockCaptcha =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='144' height='40'><rect width='100%25' height='100%25' fill='%23eef4ff'/><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%232458e6' font-size='20' font-family='Arial'>AR13</text></svg>"

const materialCategories: MaterialCategoryNode[] = [
  {
    id: 1,
    title: '钢材',
    children: [
      { id: 11, title: '板材' },
      { id: 12, title: '型材' },
      { id: 13, title: '管材' },
    ],
  },
  {
    id: 2,
    title: '有色金属',
    children: [
      { id: 21, title: '铝材' },
      { id: 22, title: '铜材' },
    ],
  },
  {
    id: 3,
    title: '辅料',
    children: [
      { id: 31, title: '紧固件' },
      { id: 32, title: '包装材料' },
    ],
  },
]

const materials: MockMaterialRecord[] = [
  {
    id: 1001,
    categoryId: 11,
    mBarCode: 'M-1001',
    name: '热轧卷板',
    model: 'Q235B',
    standard: '20mm',
    color: '黑色',
    brand: '鞍钢',
    categoryName: '板材',
    unit: '吨',
    stock: 128.36,
    purchaseDecimal: 3860,
    commodityDecimal: 4120,
    wholesaleDecimal: 4010,
    enabled: '1',
  },
  {
    id: 1002,
    categoryId: 11,
    mBarCode: 'M-1002',
    name: '冷轧钢板',
    model: 'SPCC',
    standard: '2mm',
    color: '银灰',
    brand: '首钢',
    categoryName: '板材',
    unit: '吨',
    stock: 64.8,
    purchaseDecimal: 4380,
    commodityDecimal: 4590,
    wholesaleDecimal: 4480,
    enabled: '1',
  },
  {
    id: 1003,
    categoryId: 12,
    mBarCode: 'M-1003',
    name: 'H型钢',
    model: 'HW300',
    standard: '300x300',
    color: '黑色',
    brand: '马钢',
    categoryName: '型材',
    unit: '吨',
    stock: 49.2,
    purchaseDecimal: 4050,
    commodityDecimal: 4360,
    wholesaleDecimal: 4240,
    enabled: '1',
  },
  {
    id: 1004,
    categoryId: 13,
    mBarCode: 'M-1004',
    name: '镀锌圆管',
    model: 'Q195',
    standard: 'DN80',
    color: '银白',
    brand: '友发',
    categoryName: '管材',
    unit: '吨',
    stock: 77.1,
    purchaseDecimal: 4280,
    commodityDecimal: 4560,
    wholesaleDecimal: 4450,
    enabled: '1',
  },
  {
    id: 1005,
    categoryId: 13,
    mBarCode: 'M-1005',
    name: '不锈钢焊管',
    model: '304',
    standard: 'Φ48',
    color: '亮银',
    brand: '青山',
    categoryName: '管材',
    unit: '吨',
    stock: 16.5,
    purchaseDecimal: 13100,
    commodityDecimal: 13600,
    wholesaleDecimal: 13450,
    enabled: '1',
  },
  {
    id: 1006,
    categoryId: 21,
    mBarCode: 'M-1006',
    name: '铝板',
    model: '1060',
    standard: '3mm',
    color: '银白',
    brand: '南山',
    categoryName: '铝材',
    unit: '张',
    stock: 240,
    purchaseDecimal: 180,
    commodityDecimal: 215,
    wholesaleDecimal: 206,
    enabled: '1',
  },
  {
    id: 1007,
    categoryId: 22,
    mBarCode: 'M-1007',
    name: '紫铜排',
    model: 'T2',
    standard: '40x4',
    color: '铜红',
    brand: '江铜',
    categoryName: '铜材',
    unit: '千克',
    stock: 820,
    purchaseDecimal: 68,
    commodityDecimal: 76,
    wholesaleDecimal: 73.5,
    enabled: '0',
  },
  {
    id: 1008,
    categoryId: 31,
    mBarCode: 'M-1008',
    name: '高强螺栓',
    model: '8.8级',
    standard: 'M20',
    color: '黑色',
    brand: '晋亿',
    categoryName: '紧固件',
    unit: '箱',
    stock: 55,
    purchaseDecimal: 128,
    commodityDecimal: 149,
    wholesaleDecimal: 142,
    enabled: '1',
  },
  {
    id: 1009,
    categoryId: 32,
    mBarCode: 'M-1009',
    name: '木托盘',
    model: '双面',
    standard: '1200x1000',
    color: '原木',
    brand: '华东包装',
    categoryName: '包装材料',
    unit: '个',
    stock: 320,
    purchaseDecimal: 46,
    commodityDecimal: 58,
    wholesaleDecimal: 52,
    enabled: '1',
  },
  {
    id: 1010,
    categoryId: 11,
    mBarCode: 'M-1010',
    name: '花纹板',
    model: 'Q235',
    standard: '4mm',
    color: '黑色',
    brand: '包钢',
    categoryName: '板材',
    unit: '张',
    stock: 86,
    purchaseDecimal: 320,
    commodityDecimal: 358,
    wholesaleDecimal: 346,
    enabled: '1',
  },
  {
    id: 1011,
    categoryId: 12,
    mBarCode: 'M-1011',
    name: '角钢',
    model: 'Q235',
    standard: '50x5',
    color: '黑色',
    brand: '唐钢',
    categoryName: '型材',
    unit: '吨',
    stock: 29.4,
    purchaseDecimal: 3920,
    commodityDecimal: 4280,
    wholesaleDecimal: 4170,
    enabled: '1',
  },
  {
    id: 1012,
    categoryId: 21,
    mBarCode: 'M-1012',
    name: '铝型材',
    model: '6063-T5',
    standard: '工业框架',
    color: '银白',
    brand: '凤铝',
    categoryName: '铝材',
    unit: '支',
    stock: 112,
    purchaseDecimal: 92,
    commodityDecimal: 108,
    wholesaleDecimal: 102,
    enabled: '1',
  },
]

const suppliers: SupplierOption[] = [
  { id: 1, supplier: '华东钢贸' },
  { id: 2, supplier: '中联型材' },
  { id: 3, supplier: '友发管业' },
  { id: 4, supplier: '南山铝材' },
  { id: 5, supplier: '江铜金属' },
]

const purchaseOrders: PurchaseOrderRecord[] = [
  {
    id: 5001,
    organId: 1,
    organName: '华东钢贸',
    projectName: 'A1 厂房扩建',
    number: 'CGDD-202604-001',
    linkApply: 'QG-240401',
    linkNumber: 'HT-202604-11',
    materialsList: '热轧卷板 Q235B 20mm / 花纹板 4mm',
    operTimeStr: '2026-04-03 09:15:00',
    userName: '陈峰',
    materialCount: 46.5,
    totalPrice: 188200,
    totalTaxLastMoney: 196410,
    changeAmount: 30000,
    status: '1',
  },
  {
    id: 5002,
    organId: 2,
    organName: '中联型材',
    projectName: 'B3 仓储升级',
    number: 'CGDD-202604-002',
    linkApply: 'QG-240405',
    linkNumber: 'HT-202604-15',
    materialsList: 'H型钢 HW300 / 角钢 50x5',
    operTimeStr: '2026-04-05 14:20:00',
    userName: '李芸',
    materialCount: 31.2,
    totalPrice: 129600,
    totalTaxLastMoney: 135220,
    changeAmount: 20000,
    status: '3',
  },
  {
    id: 5003,
    organId: 3,
    organName: '友发管业',
    projectName: 'C2 管网维护',
    number: 'CGDD-202604-003',
    linkApply: 'QG-240409',
    linkNumber: 'HT-202604-18',
    materialsList: '镀锌圆管 DN80 / 不锈钢焊管 Φ48',
    operTimeStr: '2026-04-08 10:36:00',
    userName: '孙涛',
    materialCount: 18.4,
    totalPrice: 152800,
    totalTaxLastMoney: 159390,
    changeAmount: 40000,
    status: '0',
  },
  {
    id: 5004,
    organId: 4,
    organName: '南山铝材',
    projectName: 'D5 门窗项目',
    number: 'CGDD-202604-004',
    linkApply: 'QG-240412',
    linkNumber: 'HT-202604-21',
    materialsList: '铝板 1060 3mm / 铝型材 6063-T5',
    operTimeStr: '2026-04-11 16:10:00',
    userName: '周晴',
    materialCount: 360,
    totalPrice: 42800,
    totalTaxLastMoney: 44230,
    changeAmount: 10000,
    status: '2',
  },
  {
    id: 5005,
    organId: 5,
    organName: '江铜金属',
    projectName: 'E7 配电改造',
    number: 'CGDD-202604-005',
    linkApply: 'QG-240416',
    linkNumber: 'HT-202604-24',
    materialsList: '紫铜排 T2 40x4',
    operTimeStr: '2026-04-15 13:48:00',
    userName: '刘娜',
    materialCount: 820,
    totalPrice: 55760,
    totalTaxLastMoney: 57542,
    changeAmount: 15000,
    status: '9',
  },
  {
    id: 5006,
    organId: 1,
    organName: '华东钢贸',
    projectName: 'A1 厂房扩建',
    number: 'CGDD-202604-006',
    linkApply: 'QG-240420',
    linkNumber: 'HT-202604-26',
    materialsList: '冷轧钢板 SPCC 2mm',
    operTimeStr: '2026-04-18 08:25:00',
    userName: '陈峰',
    materialCount: 12,
    totalPrice: 52560,
    totalTaxLastMoney: 54137,
    changeAmount: 8000,
    status: '1',
  },
]

function wait(ms = mockLatency) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizeKeyword(value?: string) {
  return String(value || '').trim().toLowerCase()
}

function includesKeyword(value: unknown, keyword?: string) {
  const normalizedKeyword = normalizeKeyword(keyword)
  if (!normalizedKeyword) {
    return true
  }

  return String(value || '').toLowerCase().includes(normalizedKeyword)
}

function paginateRows<T>(
  rows: T[],
  { currentPage, pageSize }: ListQueryOptions,
): TableResponse<T> {
  const start = Math.max(currentPage - 1, 0) * pageSize
  return {
    code: 200,
    data: {
      rows: rows.slice(start, start + pageSize),
      total: rows.length,
    },
  }
}

export async function mockGetCheckcodeFlag() {
  await wait(80)
  return '0'
}

export async function mockGetCaptcha(): Promise<ApiResponse<CaptchaData>> {
  await wait(80)

  return {
    code: 200,
    data: {
      uuid: 'mock-captcha',
      base64: mockCaptcha,
    },
  }
}

export async function mockLogin(
  payload: LoginPayload,
): Promise<ApiResponse<LoginResponseData>> {
  await wait()

  if (!payload.loginName.trim()) {
    return {
      code: 400,
      data: {
        msgTip: 'login failed',
      },
      message: '请输入用户名',
    }
  }

  if (!payload.password.trim()) {
    return {
      code: 400,
      data: {
        msgTip: 'login failed',
      },
      message: '请输入密码',
    }
  }

  return {
    code: 200,
    data: {
      msgTip: 'user can login',
      token: `mock-token-${Date.now()}`,
      user: {
        id: 1,
        loginName: payload.loginName.trim(),
        username:
          payload.loginName.trim() === 'admin' ? '系统管理员' : '前端设计账号',
        roleName: 'mock-admin',
      },
      pwdSimple: false,
    },
  }
}

export async function mockLogout() {
  await wait(60)
  return {
    code: 200,
  }
}

export async function mockGetMaterialCategoryTree() {
  await wait()
  return clone(materialCategories)
}

export async function mockListMaterials(
  search: MaterialListSearch,
  options: ListQueryOptions,
) {
  await wait()

  const rows = materials
    .filter((item) => {
      const matchesCategory = search.categoryId
        ? item.categoryId === Number(search.categoryId)
        : true
      const matchesKeyword =
        includesKeyword(item.mBarCode, search.materialParam) ||
        includesKeyword(item.name, search.materialParam) ||
        includesKeyword(item.brand, search.materialParam)
      const matchesModel = includesKeyword(item.model, search.model)
      const matchesStandard = includesKeyword(item.standard, search.standard)
      const matchesEnabled = search.enabled
        ? String(item.enabled) === String(search.enabled)
        : true

      return (
        matchesCategory &&
        matchesKeyword &&
        matchesModel &&
        matchesStandard &&
        matchesEnabled
      )
    })
    .map(({ categoryId, ...record }) => {
      void categoryId
      return record
    })

  return paginateRows(rows, options)
}

export async function mockListPurchaseOrders(
  search: PurchaseOrderSearch,
  options: ListQueryOptions,
) {
  await wait()

  const rows = purchaseOrders.filter((item) => {
    const matchesNumber = includesKeyword(item.number, search.number)
    const matchesMaterial = includesKeyword(
      item.materialsList,
      search.materialParam,
    )
    const matchesSupplier = search.organId
      ? Number(item.organId) === Number(search.organId)
      : true
    const matchesStatus = search.status
      ? String(item.status) === String(search.status)
      : true

    return matchesNumber && matchesMaterial && matchesSupplier && matchesStatus
  })

  return paginateRows(rows, options)
}

export async function mockSearchSuppliers(keyword?: string) {
  await wait(120)

  return clone(
    suppliers
      .filter((item) => includesKeyword(item.supplier, keyword))
      .slice(0, 20),
  )
}
