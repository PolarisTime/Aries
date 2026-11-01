import { randomUUID } from 'node:crypto'
import type { APIRequestContext } from '@playwright/test'
import { e2eApiBaseUrl, getPasswordSession } from './api-key'
import { buildSuffix } from './business-e2e'

/**
 * E2E 数据前置（hermetic fixtures）。
 *
 * <p>目标：用例不再假设共享开发库里有「别人留下的」客户/供应商/结算主体/单据；
 * 每个用例经真实 API 自己造齐最小前置数据，并在 `finally` 里清理。命名统一带
 * `E2E-FIX-<runSuffix>` 前缀，便于人工排查与按前缀批量清理。</p>
 *
 * <p>清理口径（产品规则决定，必须遵守）：</p>
 * <ol>
 *   <li>子资源先删、父资源后删：收款/出库 → 销售订单 → 入库 → 采购订单 → 项目 → 客户/供应商/仓库 → 结算主体；</li>
 *   <li>受保护状态（已审核/完成入库/完成销售/已确认）必须先走状态接口回退到草稿，再 DELETE；</li>
 *   <li>清理**不静默吞失败**：失败项会被收集并以 `[e2e-fixtures]` 前缀 warn，调用方应在
 *       `finally` 里 `await fixtures.cleanup()`；确实无法删除的（如已审核收款单、被单据引用的商品资料）
 *       属于后端产品约束，逐类在下方注释说明。</li>
 * </ol>
 *
 * <p><b>已知不可清理项（后端约束，不是 fixture 偷懒）</b>：</p>
 * <ul>
 *   <li>已审核收款单/付款单：`StatusConstants.ALLOWED_RECEIPT_STATUS` 只有草稿↔已审核单向创建、
 *       没有回退迁移，DELETE 又被 `PROTECTED_DOCUMENT_STATUS` 拦住 → 已审核后不可清理。
 *       因此 fixture 只造**草稿**收/付款单；需要「已审核」的场景由用例自身承担（会在报告里注明）。</li>
 *   <li>商品资料：一旦被采购订单/入库/销售订单引用，`DELETE /materials` 会因 `po_purchase_order_item`
 *       等引用被拒（即使单据已删）。故 fixture 商品资料是**常驻复用**的一份（brand/spec 固定为
 *       `E2E-FIXTURE`），不随 run 增长，也不在 cleanup 里删除。</li>
 *   <li>付款单：当前后端缺陷（`fm_payment.business_type` NOT NULL 但实体已不映射）导致新建必失败，
 *       fixture 会抛出带后端原文的错误；等 leo 修复后自动可用。</li>
 * </ul>
 */

const FIXTURE_MATERIAL_BRAND = 'E2E-FIXTURE'
const FIXTURE_MATERIAL_SPEC = 'E2E-FIXTURE'
const FIXTURE_REMARK = 'E2E-FIXTURE'

interface TrackedRecord {
  path: string
  id: string
  label: string
  /** 删除前需要依次回退到的状态（按顺序 PATCH，例如 完成销售 → 交付核定 → 已审核 → 草稿）。 */
  reverseStatuses?: string[]
  /** 常驻复用资源（跨 run 共享，不参与 cleanup）。 */
  persistent?: boolean
}

export interface SettlementCompanyFixture {
  id: string
  companyName: string
  accountId: string
}

export interface CustomerFixture {
  id: string
  customerCode: string
  customerName: string
}

export interface SupplierFixture {
  id: string
  supplierCode: string
  supplierName: string
}

export interface WarehouseFixture {
  id: string
  warehouseCode: string
  warehouseName: string
}

export interface MaterialFixture {
  id: string
  materialCode: string
  brand: string
  category: string
  material: string
  spec: string
  length: string
  unit: string
}

export interface ProjectFixture {
  id: string
  projectCode: string
  projectName: string
}

export interface SalesChainFixture {
  purchaseOrder: { id: string; orderNo: string }
  purchaseInbound: { id: string; inboundNo: string }
  salesOrder: { id: string; orderNo: string }
  salesOutbound: { id: string; outboundNo: string }
}

export interface CarrierFixture {
  id: string
  carrierCode: string
  carrierName: string
}

export interface StableMasterData {
  company: SettlementCompanyFixture
  customer: CustomerFixture
  supplier: SupplierFixture
  warehouse: WarehouseFixture
  material: MaterialFixture
  project: ProjectFixture
  carrier: CarrierFixture
}

export interface CustomerStatementCandidateFixture {
  id: string
  orderNo: string
  customerId: string
  customerName: string
  projectId: string
  projectName: string
  settlementCompanyId: string | null
}

interface ApiResult {
  ok: boolean
  status: number
  data: Record<string, unknown> | null
  text: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown): string {
  return value == null ? '' : String(value)
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function todayIso(offsetDays = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function dateTimeIso(offsetDays = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 一次 run 的 fixture 上下文：内部维护「已创建资源」栈，`cleanup()` 逆序清理。
 *
 * <p>用 `await createE2eFixtures(request)` 获取；所有 create* 方法都会把资源登记到栈里，
 * 用例只需 `finally { await fixtures.cleanup() }`。</p>
 */
export class E2eFixtures {
  readonly prefix: string
  readonly request: APIRequestContext
  private readonly tracked: TrackedRecord[] = []
  private readonly cleanupFailures: string[] = []
  private materialPromise: Promise<MaterialFixture> | null = null

  constructor(request: APIRequestContext) {
    this.request = request
    this.prefix = `E2E-FIX-${buildSuffix()}`
  }

  private async call(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<ApiResult> {
    const session = await getPasswordSession(this.request)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.accessToken}`,
    }
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json'
      headers['X-Idempotency-Key'] = randomUUID()
    }
    const response = await this.request.fetch(`${e2eApiBaseUrl()}${path}`, {
      method,
      headers,
      data: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    let data: Record<string, unknown> | null = null
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : null
    } catch {
      data = null
    }
    return { ok: response.ok(), status: response.status(), data, text }
  }

  /** 创建失败直接抛错（带后端原文），让用例红而不是静默跳过。 */
  private async mustCreate(
    path: string,
    body: unknown,
    label: string,
    options: { persistent?: boolean } = {},
  ): Promise<Record<string, unknown>> {
    const result = await this.call('POST', path, body)
    if (!result.ok || !result.data) {
      throw new Error(
        `[e2e-fixtures] 创建 ${label} 失败：POST ${path} -> ${result.status} ${result.text.slice(0, 500)}`,
      )
    }
    const record = asRecord(result.data)
    const id = asString(record.id)
    if (!id) {
      throw new Error(
        `[e2e-fixtures] 创建 ${label} 响应缺少 id：${result.text.slice(0, 300)}`,
      )
    }
    this.tracked.push({ path, id, label, persistent: options.persistent })
    return record
  }

  private async generateCode(moduleKey: string): Promise<string> {
    const result = await this.call(
      'POST',
      `/master-data/code-issuances/${moduleKey}`,
    )
    if (!result.ok || !result.data) {
      throw new Error(
        `[e2e-fixtures] 签发 ${moduleKey} 编码失败：${result.status} ${result.text.slice(0, 300)}`,
      )
    }
    return asString(result.data.code)
  }

  private async getJson(path: string): Promise<Record<string, unknown>> {
    const result = await this.call('GET', path)
    if (!result.ok || !result.data) {
      throw new Error(
        `[e2e-fixtures] GET ${path} 失败：${result.status} ${result.text.slice(0, 300)}`,
      )
    }
    return result.data
  }

  /** 结算主体 + 一个「通用」结算账户（收/付款前置）。 */
  async createSettlementCompany(): Promise<SettlementCompanyFixture> {
    const companyName = `${this.prefix}结算主体`
    const created = await this.mustCreate(
      '/company-settings',
      {
        companyName,
        taxNo: `${this.prefix}TAX`,
        settlementAccounts: [
          {
            accountName: `${this.prefix}账户`,
            bankName: '测试银行',
            bankAccount: `6222${this.prefix.slice(-12)}`,
            usageType: '通用',
            status: '正常',
          },
        ],
        status: '正常',
        remark: this.prefix,
      },
      '结算主体',
    )
    const detail = await this.getJson(`/company-settings/${created.id}`)
    const account = asArray(detail.settlementAccounts)[0]
    const accountId = asString(account?.id)
    if (!accountId) {
      throw new Error(`[e2e-fixtures] 结算主体 ${created.id} 没有可用结算账户`)
    }
    return { id: asString(created.id), companyName, accountId }
  }

  async createCustomer(): Promise<CustomerFixture> {
    const customerCode = await this.generateCode('customer')
    const customerName = `${this.prefix}客户`
    const created = await this.mustCreate(
      '/customers',
      {
        customerCode,
        customerName,
        contactName: 'E2E',
        contactPhone: '13800000001',
        city: '测试市',
        settlementMode: '月结',
        status: '正常',
        remark: this.prefix,
      },
      '客户',
    )
    return { id: asString(created.id), customerCode, customerName }
  }

  async createSupplier(): Promise<SupplierFixture> {
    const supplierCode = await this.generateCode('supplier')
    const supplierName = `${this.prefix}供应商`
    const created = await this.mustCreate(
      '/suppliers',
      {
        supplierCode,
        supplierName,
        shortName: `${this.prefix}供`,
        contactName: 'E2E',
        contactPhone: '13800000002',
        city: '测试市',
        status: '正常',
        remark: this.prefix,
        brands: [],
      },
      '供应商',
    )
    return { id: asString(created.id), supplierCode, supplierName }
  }

  async createWarehouse(): Promise<WarehouseFixture> {
    const warehouseCode = await this.generateCode('warehouse')
    const warehouseName = `${this.prefix}仓库`
    const created = await this.mustCreate(
      '/warehouses',
      {
        warehouseCode,
        warehouseName,
        warehouseType: '自营仓',
        contactName: 'E2E',
        contactPhone: '13800000003',
        address: '测试地址',
        status: '正常',
        remark: this.prefix,
      },
      '仓库',
    )
    return { id: asString(created.id), warehouseCode, warehouseName }
  }

  /**
   * 商品资料（常驻复用，不删除）：被单据引用后后端拒绝删除（见文件头说明）。
   * 用固定 brand/spec 作为稳定标识，先查后建，全库只保留一份。
   */
  async ensureMaterial(): Promise<MaterialFixture> {
    if (!this.materialPromise) {
      this.materialPromise = this.resolveMaterial()
    }
    return this.materialPromise
  }

  private async resolveMaterial(): Promise<MaterialFixture> {
    const existing = await this.call(
      'GET',
      `/materials?page=0&size=10&keyword=${encodeURIComponent(FIXTURE_MATERIAL_BRAND)}`,
    )
    if (existing.ok && existing.data) {
      const match = asArray(existing.data.content).find(
        (row) => asString(row.spec) === FIXTURE_MATERIAL_SPEC,
      )
      if (match) {
        return this.materialFromRecord(match)
      }
    }
    const materialCode = await this.generateCode('material')
    const created = await this.call('POST', '/materials', {
      materialCode,
      brand: FIXTURE_MATERIAL_BRAND,
      material: '盘螺',
      category: '盘螺',
      spec: FIXTURE_MATERIAL_SPEC,
      length: '12米',
      unit: '吨',
      quantityUnit: '件',
      pieceWeightTon: 0.001,
      piecesPerBundle: 1,
      unitPrice: 100,
      remark: FIXTURE_REMARK,
      materialType: '实体商品',
      status: '正常',
    })
    if (!created.ok || !created.data) {
      throw new Error(
        `[e2e-fixtures] 创建常驻商品资料失败：${created.status} ${created.text.slice(0, 300)}`,
      )
    }
    return this.materialFromRecord(asRecord(created.data))
  }

  private materialFromRecord(record: Record<string, unknown>): MaterialFixture {
    return {
      id: asString(record.id),
      materialCode: asString(record.materialCode),
      brand: asString(record.brand),
      category: asString(record.category),
      material: asString(record.material),
      spec: asString(record.spec),
      length: asString(record.length),
      unit: asString(record.unit),
    }
  }

  async createProject(
    customer: CustomerFixture,
    company: SettlementCompanyFixture,
  ): Promise<ProjectFixture> {
    const projectCode = await this.generateCode('project')
    const projectName = `${this.prefix}项目`
    const created = await this.mustCreate(
      '/projects',
      {
        projectCode,
        projectName,
        projectNameAbbr: `${this.prefix}项`,
        projectAddress: '测试地址',
        projectManager: 'E2E',
        customerId: customer.id,
        customerCode: customer.customerCode,
        settlementCompanyId: company.id,
        settlementCompanyName: company.companyName,
        status: '正常',
        remark: this.prefix,
      },
      '项目',
    )
    return { id: asString(created.id), projectCode, projectName }
  }

  private purchaseOrderItem(
    material: MaterialFixture,
    warehouse: WarehouseFixture,
  ) {
    return {
      materialId: material.id,
      materialCode: material.materialCode,
      brand: material.brand,
      category: material.category,
      material: material.material,
      spec: material.spec,
      length: material.length,
      unit: material.unit,
      warehouseId: warehouse.id,
      warehouseName: warehouse.warehouseName,
      batchNo: `B${this.prefix.slice(-10)}`,
      quantity: 10,
      quantityUnit: '件',
      pieceWeightTon: 0.001,
      piecesPerBundle: 1,
      weightTon: 0.01,
      unitPrice: 100,
      amount: 1000,
    }
  }

  /**
   * 最小销售链：采购订单(已审核) → 采购入库(完成入库) → 销售订单(已审核) → 销售出库(已审核)
   * → 完成销售（客户对账单候选因此出现）。清理时按相反顺序回退状态并删除。
   */
  async createCompletedSalesChain(options: {
    customer: CustomerFixture
    project: ProjectFixture
    supplier: SupplierFixture
    warehouse: WarehouseFixture
    material: MaterialFixture
    company: SettlementCompanyFixture
    /** 常驻复用（完成销售的单据按后端状态机不可回退/不可删除，只能跨 run 复用）。 */
    persistent?: boolean
  }): Promise<SalesChainFixture> {
    const { customer, project, supplier, warehouse, material, company } =
      options
    const persistent = options.persistent ?? false
    const purchaseOrder = await this.mustCreate(
      '/purchase-orders',
      {
        supplierId: supplier.id,
        supplierCode: supplier.supplierCode,
        supplierName: supplier.supplierName,
        orderDate: dateTimeIso(),
        buyerName: 'E2E',
        settlementCompanyId: company.id,
        status: '草稿',
        remark: this.prefix,
        items: [this.purchaseOrderItem(material, warehouse)],
        audit: true,
      },
      '采购订单',
    )
    this.tracked.at(-1)!.reverseStatuses = ['草稿']
    this.tracked.at(-1)!.persistent = persistent

    const orderItem = asArray(purchaseOrder.items)[0]
    const purchaseInbound = await this.mustCreate(
      '/purchase-inbounds',
      {
        purchaseOrderNo: asString(purchaseOrder.orderNo),
        supplierId: supplier.id,
        supplierCode: supplier.supplierCode,
        supplierName: supplier.supplierName,
        warehouseId: warehouse.id,
        warehouseName: warehouse.warehouseName,
        inboundDate: todayIso(),
        settlementMode: '过磅',
        status: '草稿',
        remark: this.prefix,
        items: [
          {
            materialId: material.id,
            materialCode: material.materialCode,
            brand: material.brand,
            category: material.category,
            material: material.material,
            spec: material.spec,
            length: material.length,
            unit: material.unit,
            sourcePurchaseOrderItemId: asString(orderItem?.id),
            warehouseId: warehouse.id,
            warehouseName: warehouse.warehouseName,
            batchNo: `B${this.prefix.slice(-10)}`,
            quantity: 10,
            quantityUnit: '件',
            pieceWeightTon: 0.001,
            piecesPerBundle: 1,
            weightTon: 0.01,
            weighWeightTon: 0.01,
            unitPrice: 100,
            amount: 1000,
            settlementMode: '过磅',
          },
        ],
        audit: true,
      },
      '采购入库',
    )
    this.tracked.at(-1)!.reverseStatuses = ['草稿']
    this.tracked.at(-1)!.persistent = persistent

    const inboundItem = asArray(purchaseInbound.items)[0]
    const salesOrder = await this.mustCreate(
      '/sales-orders',
      {
        purchaseInboundNo: asString(purchaseInbound.inboundNo),
        purchaseOrderNo: asString(purchaseOrder.orderNo),
        customerId: customer.id,
        customerCode: customer.customerCode,
        customerName: customer.customerName,
        projectId: project.id,
        projectName: project.projectName,
        settlementCompanyId: company.id,
        settlementCompanyName: company.companyName,
        deliveryDate: todayIso(-1),
        orderDate: todayIso(-3),
        salesName: 'E2E',
        status: '草稿',
        remark: this.prefix,
        items: [
          {
            materialId: material.id,
            materialCode: material.materialCode,
            brand: material.brand,
            category: material.category,
            material: material.material,
            spec: material.spec,
            length: material.length,
            unit: material.unit,
            sourceInboundItemId: asString(inboundItem?.id),
            warehouseId: warehouse.id,
            warehouseName: warehouse.warehouseName,
            batchNo: `B${this.prefix.slice(-10)}`,
            quantity: 10,
            quantityUnit: '件',
            pieceWeightTon: 0.001,
            piecesPerBundle: 1,
            weightTon: 0.01,
            unitPrice: 100,
            amount: 1000,
          },
        ],
        audit: true,
      },
      '销售订单',
    )
    this.tracked.at(-1)!.reverseStatuses = ['草稿']
    this.tracked.at(-1)!.persistent = persistent

    const salesOrderItem = asArray(salesOrder.items)[0]
    const salesOutbound = await this.mustCreate(
      '/sales-outbounds',
      {
        salesOrderNo: asString(salesOrder.orderNo),
        customerId: customer.id,
        customerName: customer.customerName,
        projectId: project.id,
        projectName: project.projectName,
        warehouseId: warehouse.id,
        warehouseName: warehouse.warehouseName,
        outboundDate: todayIso(-1),
        status: '草稿',
        remark: this.prefix,
        items: [
          {
            sourceNo: asString(salesOrder.orderNo),
            sourceSalesOrderItemId: asString(salesOrderItem?.id),
            quantity: 10,
            quantityUnit: '件',
            pieceWeightTon: 0.001,
            piecesPerBundle: 1,
            weightTon: 0.01,
            unitPrice: 100,
            amount: 1000,
          },
        ],
        audit: true,
      },
      '销售出库',
    )
    this.tracked.at(-1)!.reverseStatuses = ['草稿']
    this.tracked.at(-1)!.persistent = persistent

    // 出库审核后销售订单进入「交付核定」，调用 completions 推进到「完成销售」（对账候选池要求该状态）。
    const completed = await this.call(
      'POST',
      `/sales-orders/${asString(salesOrder.id)}/completions`,
    )
    if (!completed.ok) {
      throw new Error(
        `[e2e-fixtures] 完成销售失败：${completed.status} ${completed.text.slice(0, 300)}`,
      )
    }
    const salesOrderTracked = this.tracked
      .slice()
      .reverse()
      .find((item) => item.label === '销售订单')
    if (salesOrderTracked) {
      salesOrderTracked.reverseStatuses = ['交付核定', '已审核', '草稿']
      salesOrderTracked.persistent = persistent
    }

    return {
      purchaseOrder: {
        id: asString(purchaseOrder.id),
        orderNo: asString(purchaseOrder.orderNo),
      },
      purchaseInbound: {
        id: asString(purchaseInbound.id),
        inboundNo: asString(purchaseInbound.inboundNo),
      },
      salesOrder: {
        id: asString(salesOrder.id),
        orderNo: asString(salesOrder.orderNo),
      },
      salesOutbound: {
        id: asString(salesOutbound.id),
        outboundNo: asString(salesOutbound.outboundNo),
      },
    }
  }

  /** 客户对账单候选（需要链路上的销售订单已到「完成销售」且有已审核出库）。 */
  async findCustomerStatementCandidates(
    customerId: string,
  ): Promise<CustomerStatementCandidateFixture[]> {
    const payload = await this.getJson(
      `/customer-statements/candidates?page=0&size=20&customerId=${encodeURIComponent(customerId)}`,
    )
    return asArray(payload.content).map((row) => ({
      id: asString(row.id),
      orderNo: asString(row.orderNo),
      customerId: asString(row.customerId),
      customerName: asString(row.customerName),
      projectId: asString(row.projectId),
      projectName: asString(row.projectName),
      settlementCompanyId: row.settlementCompanyId
        ? asString(row.settlementCompanyId)
        : null,
    }))
  }

  /**
   * 收款单：默认草稿（可删）。`audit: true` 时建已审核单据——后端状态机不可回退、
   * DELETE 受保护，会产生**不可清理**的已知例外（每个用例至多 1 条，README 已登记）。
   */
  async createDraftReceipt(options: {
    customer: CustomerFixture
    company: SettlementCompanyFixture
    amount?: number
    audit?: boolean
  }): Promise<{ id: string; receiptNo: string }> {
    const { customer, company, amount = 100, audit = false } = options
    const created = await this.mustCreate(
      '/receipts',
      {
        counterpartyType: '客户',
        counterpartyId: customer.id,
        counterpartyCode: customer.customerCode,
        counterpartyName: customer.customerName,
        customerId: customer.id,
        customerCode: customer.customerCode,
        customerName: customer.customerName,
        settlementCompanyId: company.id,
        settlementCompanyName: company.companyName,
        accountId: company.accountId,
        receiptDate: todayIso(),
        payType: '转账',
        amount,
        status: '草稿',
        operatorName: 'E2E',
        remark: this.prefix,
        items: [],
        audit,
      },
      '收款单',
      // 已审核收款单按后端状态机不可回退/删除：登记为常驻（不参与 cleanup），
      // 用例侧以 `cleanup-uncleanable` annotation 显式说明。
      { persistent: audit },
    )
    return {
      id: asString(created.id),
      receiptNo: asString(created.receiptNo),
    }
  }

  /**
   * 草稿付款单（可删）。
   *
   * <p>注意：当前后端有缺陷（`fm_payment.business_type` NOT NULL 但实体已不映射），
   * 新建付款单必抛 422；fixture 会把后端原文透出，等 leo 修复后自动恢复。</p>
   */
  async createDraftPayment(options: {
    supplier: SupplierFixture
    company: SettlementCompanyFixture
    amount?: number
  }): Promise<{ id: string; paymentNo: string }> {
    const { supplier, company, amount = 100 } = options
    const created = await this.mustCreate(
      '/payments',
      {
        counterpartyType: '供应商',
        counterpartyId: supplier.id,
        counterpartyCode: supplier.supplierCode,
        counterpartyName: supplier.supplierName,
        supplierCode: supplier.supplierCode,
        supplierName: supplier.supplierName,
        settlementCompanyId: company.id,
        settlementCompanyName: company.companyName,
        accountId: company.accountId,
        paymentDate: todayIso(),
        payType: '转账',
        amount,
        status: '草稿',
        operatorName: 'E2E',
        remark: this.prefix,
        items: [],
        audit: false,
      },
      '付款单',
    )
    return {
      id: asString(created.id),
      paymentNo: asString(created.paymentNo),
    }
  }

  private async findFixtureRecord(
    path: string,
    matcher: (record: Record<string, unknown>) => boolean,
  ): Promise<Record<string, unknown> | null> {
    const payload = await this.call(
      'GET',
      `${path}?page=0&size=20&keyword=${encodeURIComponent(FIXTURE_REMARK)}`,
    )
    if (!payload.ok || !payload.data) {
      return null
    }
    return asArray(payload.data.content).find(matcher) ?? null
  }

  /**
   * 跨 run 复用的稳定主数据（不参与 cleanup）。
   *
   * <p>为什么不能每 run 新建再删：后端主数据的删除保护会检查**软删除后仍存在的**单据引用
   * （`po_purchase_order_item.warehouse_id`、`po_purchase_order.supplier_id`、`md_project.customer_id` 等），
   * 一旦被链路上的单据引用，即使单据已删，主数据也永远删不掉。因此 fixture 的客户/供应商/仓库/
   * 项目/结算主体/商品资料统一用固定标识 `E2E-FIXTURE` **先查后建、全库只保留一份**；
   * 每个 run 只创建并删除「单据类」资源（采购/入库/销售/出库/收款/对账单），这样 run 之间不累积主数据。</p>
   */
  async ensureStableMasterData(): Promise<StableMasterData> {
    const company = await this.ensureStableCompany()
    const customer = await this.ensureStableCustomer(company)
    const supplier = await this.ensureStableSupplier()
    const warehouse = await this.ensureStableWarehouse()
    const material = await this.ensureMaterial()
    const project = await this.ensureStableProject(customer, company)
    const carrier = await this.ensureStableCarrier(company)
    return {
      company,
      customer,
      supplier,
      warehouse,
      material,
      project,
      carrier,
    }
  }

  private async ensureStableCompany(): Promise<SettlementCompanyFixture> {
    const existing = await this.findFixtureRecord(
      '/company-settings',
      (row) => asString(row.companyName) === `${FIXTURE_REMARK}结算主体`,
    )
    if (existing) {
      const accounts = asArray(existing.settlementAccounts)
      const account = accounts.find((item) => asString(item.status) !== '停用')
      if (account && asString(account.id)) {
        return {
          id: asString(existing.id),
          companyName: asString(existing.companyName),
          accountId: asString(account.id),
        }
      }
    }
    const companyName = `${FIXTURE_REMARK}结算主体`
    const created = await this.mustCreate(
      '/company-settings',
      {
        companyName,
        taxNo: `${FIXTURE_REMARK}TAX`,
        settlementAccounts: [
          {
            accountName: `${FIXTURE_REMARK}账户`,
            bankName: '测试银行',
            bankAccount: '6222E2EFIXTURE',
            usageType: '通用',
            status: '正常',
          },
        ],
        status: '正常',
        remark: FIXTURE_REMARK,
      },
      '结算主体',
      { persistent: true },
    )
    const detail = await this.getJson(`/company-settings/${created.id}`)
    const accountId = asString(asArray(detail.settlementAccounts)[0]?.id)
    return { id: asString(created.id), companyName, accountId }
  }

  private async ensureStableCustomer(
    _company: SettlementCompanyFixture,
  ): Promise<CustomerFixture> {
    const existing = await this.findFixtureRecord(
      '/customers',
      (row) => asString(row.customerName) === `${FIXTURE_REMARK}客户`,
    )
    if (existing) {
      return {
        id: asString(existing.id),
        customerCode: asString(existing.customerCode),
        customerName: asString(existing.customerName),
      }
    }
    const customerCode = await this.generateCode('customer')
    const customerName = `${FIXTURE_REMARK}客户`
    const created = await this.mustCreate(
      '/customers',
      {
        customerCode,
        customerName,
        contactName: 'E2E',
        contactPhone: '13800000001',
        city: '测试市',
        settlementMode: '月结',
        status: '正常',
        remark: FIXTURE_REMARK,
      },
      '客户',
      { persistent: true },
    )
    return { id: asString(created.id), customerCode, customerName }
  }

  private async ensureStableSupplier(): Promise<SupplierFixture> {
    const existing = await this.findFixtureRecord(
      '/suppliers',
      (row) => asString(row.supplierName) === `${FIXTURE_REMARK}供应商`,
    )
    if (existing) {
      return {
        id: asString(existing.id),
        supplierCode: asString(existing.supplierCode),
        supplierName: asString(existing.supplierName),
      }
    }
    const supplierCode = await this.generateCode('supplier')
    const supplierName = `${FIXTURE_REMARK}供应商`
    const created = await this.mustCreate(
      '/suppliers',
      {
        supplierCode,
        supplierName,
        shortName: `${FIXTURE_REMARK}供`,
        contactName: 'E2E',
        contactPhone: '13800000002',
        city: '测试市',
        status: '正常',
        remark: FIXTURE_REMARK,
        brands: [],
      },
      '供应商',
      { persistent: true },
    )
    return { id: asString(created.id), supplierCode, supplierName }
  }

  private async ensureStableCarrier(
    company: SettlementCompanyFixture,
  ): Promise<CarrierFixture> {
    const existing = await this.findFixtureRecord(
      '/carriers',
      (row) => asString(row.carrierName) === `${FIXTURE_REMARK}物流方`,
    )
    if (existing) {
      return {
        id: asString(existing.id),
        carrierCode: asString(existing.carrierCode),
        carrierName: asString(existing.carrierName),
      }
    }
    const carrierCode = await this.generateCode('carrier')
    const carrierName = `${FIXTURE_REMARK}物流方`
    const created = await this.mustCreate(
      '/carriers',
      {
        carrierCode,
        carrierName,
        contactName: 'E2E',
        contactPhone: '13800000004',
        vehicleType: '重型货车',
        priceMode: '按吨',
        defaultSettlementCompanyId: company.id,
        status: '正常',
        remark: FIXTURE_REMARK,
      },
      '物流方',
      { persistent: true },
    )
    return {
      id: asString(created.id),
      carrierCode,
      carrierName,
    }
  }

  private async ensureStableWarehouse(): Promise<WarehouseFixture> {
    const existing = await this.findFixtureRecord(
      '/warehouses',
      (row) => asString(row.warehouseName) === `${FIXTURE_REMARK}仓库`,
    )
    if (existing) {
      return {
        id: asString(existing.id),
        warehouseCode: asString(existing.warehouseCode),
        warehouseName: asString(existing.warehouseName),
      }
    }
    const warehouseCode = await this.generateCode('warehouse')
    const warehouseName = `${FIXTURE_REMARK}仓库`
    const created = await this.mustCreate(
      '/warehouses',
      {
        warehouseCode,
        warehouseName,
        warehouseType: '自营仓',
        contactName: 'E2E',
        contactPhone: '13800000003',
        address: '测试地址',
        status: '正常',
        remark: FIXTURE_REMARK,
      },
      '仓库',
      { persistent: true },
    )
    return { id: asString(created.id), warehouseCode, warehouseName }
  }

  private async ensureStableProject(
    customer: CustomerFixture,
    company: SettlementCompanyFixture,
  ): Promise<ProjectFixture> {
    const existing = await this.findFixtureRecord(
      '/projects',
      (row) => asString(row.projectName) === `${FIXTURE_REMARK}项目`,
    )
    if (existing) {
      return {
        id: asString(existing.id),
        projectCode: asString(existing.projectCode),
        projectName: asString(existing.projectName),
      }
    }
    const projectCode = await this.generateCode('project')
    const projectName = `${FIXTURE_REMARK}项目`
    const created = await this.mustCreate(
      '/projects',
      {
        projectCode,
        projectName,
        projectNameAbbr: `${FIXTURE_REMARK}项`,
        projectAddress: '测试地址',
        projectManager: 'E2E',
        customerId: customer.id,
        customerCode: customer.customerCode,
        settlementCompanyId: company.id,
        settlementCompanyName: company.companyName,
        status: '正常',
        remark: FIXTURE_REMARK,
      },
      '项目',
      { persistent: true },
    )
    return { id: asString(created.id), projectCode, projectName }
  }

  /**
   * 根据资源当前状态推导「回退到草稿」的状态链（受保护状态不能直接 DELETE）。
   * 后端状态机是有限图，这里只覆盖 fixture 会创建的主流程单据。
   */
  private async resolveReverseStatuses(
    path: string,
    id: string,
  ): Promise<string[]> {
    const chains: Record<string, Record<string, string[]>> = {
      '/purchase-orders': {
        完成采购: ['已审核', '草稿'],
        已审核: ['草稿'],
      },
      '/purchase-inbounds': {
        完成入库: ['草稿'],
        已审核: ['草稿'],
      },
      '/sales-orders': {
        完成销售: ['交付核定', '已审核', '草稿'],
        交付核定: ['已审核', '草稿'],
        已审核: ['草稿'],
      },
      '/sales-outbounds': {
        已审核: ['草稿'],
      },
      '/sales-returns': {
        已审核: ['草稿'],
      },
      '/customer-statements': {
        已确认: ['待确认'],
      },
      '/freight-statements': {
        已审核: ['草稿'],
      },
      '/freight-bills': {
        已审核: ['草稿'],
      },
    }
    const byPath = chains[path]
    if (!byPath) {
      return []
    }
    const detail = await this.call('GET', `${path}/${id}`)
    if (!detail.ok || !detail.data) {
      return []
    }
    return byPath[asString(detail.data.status)] ?? []
  }

  /**
   * 确保「客户对账单候选」存在：优先复用已有候选；没有才补齐一条常驻销售链。
   * 候选来自「完成销售 + 已审核出库」，这两个状态按后端状态机不可回退，只能跨 run 复用。
   */
  async ensureCustomerStatementCandidates(): Promise<{
    master: StableMasterData
    candidates: CustomerStatementCandidateFixture[]
  }> {
    const master = await this.ensureStableMasterData()
    let candidates = await this.findCustomerStatementCandidates(
      master.customer.id,
    )
    if (candidates.length === 0) {
      await this.createCompletedSalesChain({ ...master, persistent: true })
      candidates = await this.findCustomerStatementCandidates(
        master.customer.id,
      )
    }
    if (candidates.length === 0) {
      throw new Error(
        '[e2e-fixtures] 已创建销售链但客户对账单候选仍为空（检查后端候选池状态/出库审核）',
      )
    }
    // 新链 id 更大：优先返回最新候选，避免命中历史链（日期可能落在列表默认账期窗口之外）。
    candidates.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
    return { master, candidates }
  }

  /**
   * 通用「回退受保护状态 → 删除」助手，供用例清理自己创建的、不属于 fixture 的单据
   * （例如 UI 上生成的对账单）。
   */
  async deleteDocument(
    path: string,
    id: string,
    label: string,
  ): Promise<string[]> {
    const failures: string[] = []
    for (const status of await this.resolveReverseStatuses(path, id)) {
      const patched = await this.call('PATCH', `${path}/${id}/status`, {
        status,
      })
      if (!patched.ok) {
        failures.push(
          `回退 ${label}(${id}) 到「${status}」失败：${patched.status} ${patched.text.slice(0, 200)}`,
        )
        return failures
      }
    }
    const deleted = await this.call('DELETE', `${path}/${id}`)
    if (!deleted.ok && deleted.status !== 404) {
      failures.push(
        `删除 ${label}(${id}) 失败：${deleted.status} ${deleted.text.slice(0, 200)}`,
      )
    }
    return failures
  }

  /** 物流单可导入的销售订单候选（fixture 自建的完成销售订单应命中）。 */
  async findFreightBillCandidates(): Promise<
    Array<{ orderNo: string; customerName: string }>
  > {
    const payload = await this.getJson(
      '/freight-bills/sales-order-candidates?page=0&size=20&keyword=',
    )
    return asArray(payload.content).map((row) => ({
      orderNo: asString(row.orderNo),
      customerName: asString(row.customerName),
    }))
  }

  /**
   * 逆序清理全部已创建资源：先回退受保护状态，再 DELETE。
   *
   * <p>失败项不吞：warn 出 `[e2e-fixtures] 清理失败 …`，用例应把 cleanup 放在 finally。
   * 返回失败列表便于断言/上报。</p>
   */
  async cleanup(): Promise<string[]> {
    this.cleanupFailures.length = 0
    for (const item of this.tracked.slice().reverse()) {
      if (item.persistent) {
        continue
      }
      const reverseStatuses =
        item.reverseStatuses ??
        (await this.resolveReverseStatuses(item.path, item.id))
      for (const status of reverseStatuses) {
        const patched = await this.call(
          'PATCH',
          `${item.path}/${item.id}/status`,
          { status },
        )
        if (!patched.ok) {
          this.cleanupFailures.push(
            `回退 ${item.label}(${item.id}) 到「${status}」失败：${patched.status} ${patched.text.slice(0, 200)}`,
          )
          break
        }
      }
      if (
        this.cleanupFailures.some((failure) => failure.includes(`(${item.id})`))
      ) {
        continue
      }
      const deleted = await this.call('DELETE', `${item.path}/${item.id}`)
      if (!deleted.ok && deleted.status !== 404) {
        this.cleanupFailures.push(
          `删除 ${item.label}(${item.id}) 失败：${deleted.status} ${deleted.text.slice(0, 200)}`,
        )
      }
    }
    if (this.cleanupFailures.length > 0) {
      console.warn(
        `[e2e-fixtures] ${this.cleanupFailures.length} 项清理失败（前缀 ${this.prefix}）：\n${this.cleanupFailures.join('\n')}`,
      )
    }
    return [...this.cleanupFailures]
  }

  /** 当前已登记但尚未清理的资源（排查用）。 */
  get trackedRecords(): ReadonlyArray<Readonly<TrackedRecord>> {
    return this.tracked
  }
}

export async function createE2eFixtures(
  request: APIRequestContext,
): Promise<E2eFixtures> {
  return new E2eFixtures(request)
}
