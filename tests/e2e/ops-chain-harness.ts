import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
} from '@playwright/test'
import {
  clearCachedAuthSession,
  fetchCollection,
  fetchDetail,
  primeApiKeySession,
} from './support/api-key'

const NAV_TIMEOUT = 30_000

export interface CreatedDoc {
  id: string
  no: string
  status: string
  record: Record<string, unknown>
}

let remarkCounter = 0

/** 生成带唯一前缀的备注，用于在真实后端中定位本次测试创建的记录。 */
export function buildRemark(label: string) {
  remarkCounter += 1
  return `E2E-B-${Date.now()}-${label}-${remarkCounter}`
}

// ---------------------------------------------------------------------------
// 会话与导航
// ---------------------------------------------------------------------------

/** 强制使用全新登录会话（清掉缓存 cookie，避免刷新令牌轮换复用冲突）。 */
export async function relogin(page: Page) {
  clearCachedAuthSession()
  await primeApiKeySession(page)
}

/** 硬跳转：仅在确需整页加载时使用，登录失效时重新登录重试。 */
export async function hardGoto(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  if (/\/login(?:\?|$)/.test(page.url())) {
    await relogin(page)
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
  }
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: NAV_TIMEOUT })
}

const MENU_GROUP: Record<string, string> = {
  '/purchase-order': '采购',
  '/purchase-inbound': '采购',
  '/sales-order': '销售',
  '/sales-outbound': '销售',
  '/sales-return': '销售',
}

const PAGE_TITLE: Record<string, string> = {
  '/purchase-order': '采购订单',
  '/purchase-inbound': '采购入库',
  '/sales-order': '销售订单',
  '/sales-outbound': '销售出库',
  '/sales-return': '销售退货单',
}

/**
 * 通过顶部菜单在 SPA 内切换业务模块，避免整页重载触发刷新令牌轮换导致会话失效。
 */
export async function spaGoto(page: Page, path: string) {
  const group = MENU_GROUP[path]
  const title = PAGE_TITLE[path]
  if (!group || !title) {
    await hardGoto(page, path)
    return
  }
  // 共享账号并发活跃会话上限为 3，其他测试进程登录会驱逐旧会话。
  // 每次模块切换前重新登录，保证当前会话是最新会话，降低被并发会话挤掉导致 401 的概率。
  await relogin(page)
  if (!page.url().includes(path)) {
    await page
      .getByRole('menuitem', { name: group, exact: true })
      .first()
      .click()
    await page.waitForTimeout(500)
    const target = page
      .locator(
        '.ant-menu-submenu-popup:visible .ant-menu-item, .ant-menu-popup:visible .ant-menu-item',
      )
      .filter({ hasText: title })
      .first()
    await expect(target).toBeVisible({ timeout: 15_000 })
    await target.click()
  }
  await expect(page.getByRole('heading', { name: title }).first()).toBeVisible({
    timeout: NAV_TIMEOUT,
  })
  await expect(page.locator('table:visible').first()).toBeVisible({
    timeout: NAV_TIMEOUT,
  })
}

// ---------------------------------------------------------------------------
// 列表与编辑器通用交互
// ---------------------------------------------------------------------------

export function moduleKeyword(page: Page) {
  return page
    .locator(
      'input[name="keyword"]:visible, input[aria-label="关键字"]:visible, input[placeholder="关键字"]:visible',
    )
    .first()
}

/** 在业务列表按单号搜索并等待列表请求返回。 */
export async function searchList(page: Page, keyword: string) {
  await expect(page.locator('table:visible').first()).toBeVisible({
    timeout: NAV_TIMEOUT,
  })
  const input = moduleKeyword(page)
  await expect(input).toBeVisible({ timeout: NAV_TIMEOUT })
  await input.fill(keyword)
  await input.press('Enter')
  await page.waitForTimeout(1_200)
}

export function gridRow(page: Page, keyword: string) {
  return page
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: keyword })
    .first()
}

/** 打开 antd Select 并选中下拉中的第一项。 */
export async function pickFirst(page: Page, trigger: Locator) {
  await trigger.scrollIntoViewIfNeeded().catch(() => {})
  await trigger.click({ timeout: 20_000 })
  const dropdown = page.locator('.ant-select-dropdown:visible').last()
  await expect(dropdown).toBeVisible({ timeout: 15_000 })
  const option = dropdown.locator('.ant-select-item-option').first()
  await expect(option).toBeVisible({ timeout: 15_000 })
  await option.click({ force: true })
  await expect(dropdown)
    .toBeHidden({ timeout: 15_000 })
    .catch(() => {})
}

/** antd DatePicker 选择今天。 */
export async function pickToday(page: Page, input: Locator) {
  await input.click()
  const dropdown = page.locator('.ant-picker-dropdown:visible').last()
  await expect(dropdown).toBeVisible({ timeout: 15_000 })
  await dropdown.locator('td.ant-picker-cell-today').first().click()
  await expect(dropdown)
    .toBeHidden({ timeout: 15_000 })
    .catch(() => {})
}

async function closeSaveResult(page: Page) {
  const saveResult = page.locator('.save-result-overlay').first()
  await expect(saveResult).toBeVisible({ timeout: NAV_TIMEOUT })
  const text = await saveResult.innerText()
  await saveResult
    .getByRole('button', { name: /关\s*闭/ })
    .first()
    .click()
  await expect(saveResult)
    .toBeHidden({ timeout: 15_000 })
    .catch(() => {})
  return text
}

function overlayAction(scope: Locator, label: RegExp) {
  return scope
    .locator('button.overlay-action-button')
    .filter({ hasText: label })
    .first()
}

/** 编辑器“保存”：保存后关闭回执并返回回执文本。 */
export async function saveEditor(page: Page, scope: Locator) {
  await overlayAction(scope, /^保\s*存$/).click()
  return closeSaveResult(page)
}

/** 编辑器“保存并审核”：处理审核确认弹层后关闭回执。 */
export async function saveAndAuditEditor(page: Page, scope: Locator) {
  await overlayAction(scope, /保存并审核/).click()
  const confirm = page.getByRole('button', { name: '确定审核' }).first()
  if (await confirm.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await confirm.click()
  }
  return closeSaveResult(page)
}

/** 交付核定编辑器“确认核定”，触发完成销售命令。 */
export async function confirmDeliveryVerification(page: Page, scope: Locator) {
  await overlayAction(scope, /确认核定/).click()
  const confirm = page.getByRole('button', { name: /^确认核定$/ }).first()
  await expect(confirm).toBeVisible({ timeout: 15_000 })
  await confirm.click()
  return closeSaveResult(page)
}

export async function openRowEditor(page: Page, no: string) {
  const row = gridRow(page, no)
  await expect(row).toBeVisible({ timeout: NAV_TIMEOUT })
  await row.dblclick()
  const overlay = page.locator('.workspace-overlay-panel').first()
  await expect(overlay).toBeVisible({ timeout: NAV_TIMEOUT })
  return overlay
}

/** 从已打开的上游选择浮层中选择第一条候选并确认导入。 */
export async function importFirstParent(
  page: Page,
  editorOverlay: Locator,
  buttonName: RegExp,
  keyword?: string,
) {
  await editorOverlay.getByRole('button', { name: buttonName }).first().click()
  const selector = page.locator('.workspace-overlay-panel:visible').last()
  await expect(selector).toBeVisible({ timeout: NAV_TIMEOUT })
  await page.waitForTimeout(600)
  if (keyword) {
    const input = selector.locator('input[name="keyword"]:visible').first()
    if (await input.count()) {
      await input.fill(keyword)
      await input.press('Enter')
      await page.waitForTimeout(1_500)
    }
  }
  const candidate = selector
    .locator('tbody tr:not(.ant-table-measure-row)')
    .first()
  await expect(candidate).toBeVisible({ timeout: NAV_TIMEOUT })
  await candidate.click()
  await selector
    .getByRole('button', { name: /确认导入/ })
    .first()
    .click()
  await page.waitForTimeout(1_200)
  return page.locator('.workspace-overlay-panel:visible').last()
}

// ---------------------------------------------------------------------------
// 真实后端校验（API 侧）
// ---------------------------------------------------------------------------

function newest(records: Array<Record<string, unknown>>) {
  return [...records].sort((a, b) => {
    const left = String(a.id ?? '')
    const right = String(b.id ?? '')
    if (left.length !== right.length) return left.length - right.length
    return left < right ? -1 : left > right ? 1 : 0
  })
}

async function pollCollection(
  request: APIRequestContext,
  apiPath: string,
  predicate: (record: Record<string, unknown>) => boolean,
  timeoutMs = 20_000,
) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const { ok, status, records } = await fetchCollection(request, apiPath, {
      page: 0,
      size: 100,
    })
    if (ok) {
      const match = newest(records.filter(predicate))
      if (match.length) return match[match.length - 1]
    } else if (status === 401) {
      // 并发会话被驱逐时，清缓存让下一次调用重新登录。
      clearCachedAuthSession()
    }
    await new Promise((resolve) => setTimeout(resolve, 600))
  }
  return null
}

export async function findByRemark(
  request: APIRequestContext,
  apiPath: string,
  remark: string,
  noKey: string,
): Promise<CreatedDoc | null> {
  const match = await pollCollection(
    request,
    apiPath,
    (record) => String(record.remark ?? '') === remark,
  )
  if (!match) return null
  return {
    id: String(match.id),
    no: String(match[noKey] ?? ''),
    status: String(match.status ?? ''),
    record: match,
  }
}

export async function findByField(
  request: APIRequestContext,
  apiPath: string,
  key: string,
  value: string,
  noKey: string,
): Promise<CreatedDoc | null> {
  const match = await pollCollection(
    request,
    apiPath,
    (record) => String(record[key] ?? '') === value,
  )
  if (!match) return null
  return {
    id: String(match.id),
    no: String(match[noKey] ?? ''),
    status: String(match.status ?? ''),
    record: match,
  }
}

export async function waitForStatus(
  request: APIRequestContext,
  apiPath: string,
  id: string,
  expected: string,
  timeoutMs = 30_000,
) {
  const deadline = Date.now() + timeoutMs
  let last = ''
  while (Date.now() < deadline) {
    const { ok, status, record } = await fetchDetail(request, apiPath, id)
    if (ok && record) {
      last = String(record.status ?? '')
      if (last === expected) return
    } else if (status === 401) {
      clearCachedAuthSession()
    }
    await new Promise((resolve) => setTimeout(resolve, 700))
  }
  throw new Error(
    `记录 ${id} 未在 ${timeoutMs}ms 内进入状态「${expected}」，实际「${last}」`,
  )
}

export async function readStatus(
  request: APIRequestContext,
  apiPath: string,
  id: string,
) {
  const { ok, record } = await fetchDetail(request, apiPath, id)
  return ok && record ? String(record.status ?? '') : ''
}

// ---------------------------------------------------------------------------
// 业务链准备（真实 UI 操作）
// ---------------------------------------------------------------------------

export interface PurchaseOrderOptions {
  remark: string
  quantity?: number
  unitPrice?: number
}

/** 共享账号并发会话上限较小；失败时重新登录并重试同一高层步骤。 */
async function withRetry<T>(
  page: Page,
  attempts: number,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < attempts - 1) {
        const message = error instanceof Error ? error.message : String(error)
        console.log(
          `[harness] ${label} 第 ${attempt + 1} 次失败，重登录重试：${message.slice(0, 120)}`,
        )
        await relogin(page)
      }
    }
  }
  throw lastError
}

/** 新建采购订单草稿，返回后端持久化记录（含单号与 id）。 */
export async function createPurchaseOrderDraft(
  page: Page,
  options: PurchaseOrderOptions,
): Promise<CreatedDoc> {
  const existing = await findByRemark(
    page.request,
    'purchase-order',
    options.remark,
    'orderNo',
  )
  if (existing) return existing

  return withRetry(page, 3, '新建采购订单', async () => {
    const already = await findByRemark(
      page.request,
      'purchase-order',
      options.remark,
      'orderNo',
    )
    if (already) return already

    await spaGoto(page, '/purchase-order')
    await page.getByRole('button', { name: /新增/ }).first().click()
    const overlay = page.locator('.workspace-overlay-panel').first()
    await expect(overlay).toBeVisible({ timeout: NAV_TIMEOUT })

    await pickFirst(page, overlay.locator('#module-form-supplierid'))
    await pickToday(page, overlay.locator('#module-form-orderdate'))
    if (
      !(await overlay
        .locator('#module-form-settlementcompanyid')
        .inputValue()
        .catch(() => ''))
    ) {
      await pickFirst(page, overlay.locator('#module-form-settlementcompanyid'))
    }
    await overlay.locator('#module-form-remark').fill(options.remark)

    const row = overlay.locator('tbody tr:not(.ant-table-measure-row)').first()
    await pickFirst(page, row.locator('.ant-select').nth(0))
    await page.waitForTimeout(300)
    await pickFirst(page, row.locator('.ant-select').nth(1))
    await page.waitForTimeout(300)
    const quantity = String(options.quantity ?? 5)
    const unitPrice = String(options.unitPrice ?? 100)
    const qtyInput = row.locator(
      'input[data-module-editor-number-column="quantity"]',
    )
    await qtyInput.fill(quantity)
    await qtyInput.blur()
    const priceInput = row.locator(
      'input[data-module-editor-number-column="unitPrice"]',
    )
    await priceInput.fill(unitPrice)
    await priceInput.blur()
    await page.waitForTimeout(300)

    const resultText = await saveEditor(page, overlay)
    expect(resultText).toContain('保存成功')

    const created = await findByRemark(
      page.request,
      'purchase-order',
      options.remark,
      'orderNo',
    )
    if (!created) throw new Error('采购订单保存后未能检索到记录')
    return created
  })
}

/** 进入模块列表、按单号检索并打开编辑器审核（幂等，已审核则跳过）。 */
export async function auditRecordFromList(
  page: Page,
  moduleKey: string,
  no: string,
  expected = '已审核',
) {
  return withRetry(page, 3, `审核 ${moduleKey} ${no}`, async () => {
    const found = await findByNo(page.request, moduleKey, no)
    if (found && found.status === expected) return
    await spaGoto(page, ROUTE_BY_MODULE[moduleKey])
    await searchList(page, no)
    const overlay = await openRowEditor(page, no)
    const resultText = await saveAndAuditEditor(page, overlay)
    expect(resultText).toContain('保存成功')
    if (found) {
      await waitForStatus(page.request, moduleKey, found.id, expected, 45_000)
    }
  })
}

/** 由已审核采购订单新建采购入库（导入明细）并审核。 */
export async function createPurchaseInboundFromOrder(
  page: Page,
  purchaseOrderNo: string,
  remark: string,
) {
  const existing = await findByRemark(
    page.request,
    'purchase-inbound',
    remark,
    'inboundNo',
  )
  if (existing) return existing

  return withRetry(page, 3, '新建采购入库', async () => {
    const already = await findByRemark(
      page.request,
      'purchase-inbound',
      remark,
      'inboundNo',
    )
    if (already) return already
    await spaGoto(page, '/purchase-inbound')
    await page.getByRole('button', { name: /新增/ }).first().click()
    const overlay = page.locator('.workspace-overlay-panel').first()
    await expect(overlay).toBeVisible({ timeout: NAV_TIMEOUT })
    const editor = await importFirstParent(
      page,
      overlay,
      /导入采购订单明细/,
      purchaseOrderNo,
    )
    if (
      (await editor
        .locator('#module-form-inbounddate')
        .inputValue()
        .catch(() => '')) === ''
    ) {
      await pickToday(page, editor.locator('#module-form-inbounddate'))
    }
    await editor.locator('#module-form-remark').fill(remark)
    const resultText = await saveAndAuditEditor(page, editor)
    expect(resultText).toContain('保存成功')
    const created = await findByRemark(
      page.request,
      'purchase-inbound',
      remark,
      'inboundNo',
    )
    if (!created) throw new Error('采购入库保存后未能检索到记录')
    return created
  })
}

/** 由销售订单新建销售出库（导入明细）并审核；quantity 传入可部分出库。 */
export async function createSalesOutboundFromOrder(
  page: Page,
  salesOrderNo: string,
  remark: string,
  quantity?: number,
): Promise<CreatedDoc> {
  const existing = await findByRemark(
    page.request,
    'sales-outbound',
    remark,
    'outboundNo',
  )
  if (existing) return existing

  return withRetry(page, 3, '新建销售出库', async () => {
    const already = await findByRemark(
      page.request,
      'sales-outbound',
      remark,
      'outboundNo',
    )
    if (already) return already
    await spaGoto(page, '/sales-outbound')
    await page.getByRole('button', { name: /新增/ }).first().click()
    const overlay = page.locator('.workspace-overlay-panel').first()
    await expect(overlay).toBeVisible({ timeout: NAV_TIMEOUT })
    await pickToday(page, overlay.locator('#module-form-outbounddate'))
    const editor = await importFirstParent(
      page,
      overlay,
      /导入销售订单明细/,
      salesOrderNo,
    )
    if (quantity != null) {
      const qtyInput = editor
        .locator('tbody tr:not(.ant-table-measure-row)')
        .first()
        .locator('input[data-module-editor-number-column="quantity"]')
      await expect(qtyInput).toBeVisible({ timeout: 15_000 })
      await qtyInput.fill(String(quantity))
      await qtyInput.blur()
      await page.waitForTimeout(400)
    }
    await editor.locator('#module-form-remark').fill(remark)
    const resultText = await saveAndAuditEditor(page, editor)
    expect(resultText).toContain('保存成功')
    const created = await findByRemark(
      page.request,
      'sales-outbound',
      remark,
      'outboundNo',
    )
    if (!created) throw new Error('销售出库保存后未能检索到记录')
    return created
  })
}

/** 完整创建一张已审核采购订单并全量入库，使其进入完成采购。 */
export async function createCompletedPurchaseOrder(
  page: Page,
  remark: string,
): Promise<CreatedDoc> {
  const order = await createPurchaseOrderDraft(page, {
    remark: `${remark}-PO`,
    quantity: 5,
    unitPrice: 100,
  })
  await auditRecordFromList(page, 'purchase-order', order.no)
  await waitForStatus(page.request, 'purchase-order', order.id, '已审核')
  await createPurchaseInboundFromOrder(page, order.no, `${remark}-IN`)
  await waitForStatus(
    page.request,
    'purchase-order',
    order.id,
    '完成采购',
    45_000,
  )
  return { ...order, status: '完成采购' }
}

/** 由完成采购的采购订单导入明细创建销售订单草稿。 */
export async function createSalesOrderDraft(
  page: Page,
  purchaseOrderNo: string,
  remark: string,
): Promise<CreatedDoc> {
  const existing = await findByRemark(
    page.request,
    'sales-order',
    remark,
    'orderNo',
  )
  if (existing) return existing

  return withRetry(page, 3, '新建销售订单', async () => {
    const already = await findByRemark(
      page.request,
      'sales-order',
      remark,
      'orderNo',
    )
    if (already) return already
    await spaGoto(page, '/sales-order')
    await page.getByRole('button', { name: /新增/ }).first().click()
    const overlay = page.locator('.workspace-overlay-panel').first()
    await expect(overlay).toBeVisible({ timeout: NAV_TIMEOUT })
    await pickFirst(page, overlay.locator('#module-form-customerid'))
    await page.waitForTimeout(1_200)
    await pickFirst(page, overlay.locator('#module-form-projectid'))
    await pickToday(page, overlay.locator('#module-form-deliverydate'))
    await overlay.locator('#module-form-remark').fill(remark)
    const editor = await importFirstParent(
      page,
      overlay,
      /导入采购订单明细/,
      purchaseOrderNo,
    )
    const resultText = await saveEditor(page, editor)
    expect(resultText).toContain('保存成功')

    const created = await findByRemark(
      page.request,
      'sales-order',
      remark,
      'orderNo',
    )
    if (!created) throw new Error('销售订单保存后未能检索到记录')
    return created
  })
}

const ROUTE_BY_MODULE: Record<string, string> = {
  'purchase-order': '/purchase-order',
  'purchase-inbound': '/purchase-inbound',
  'sales-order': '/sales-order',
  'sales-outbound': '/sales-outbound',
  'sales-return': '/sales-return',
}

/** 按模块主单号检索记录（用于幂等判断）。 */
export async function findByNo(
  request: APIRequestContext,
  moduleKey: string,
  no: string,
): Promise<CreatedDoc | null> {
  const noKey = NO_KEYS_BY_MODULE[moduleKey]
  if (!noKey) return null
  return findByField(request, moduleKey, noKey, no, noKey)
}

export const NO_KEYS_BY_MODULE: Record<string, string> = {
  'purchase-order': 'orderNo',
  'purchase-inbound': 'inboundNo',
  'sales-order': 'orderNo',
  'sales-outbound': 'outboundNo',
  'sales-return': 'returnNo',
}
