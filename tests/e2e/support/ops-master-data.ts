import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
} from '@playwright/test'
import {
  e2eApiBaseUrl,
  e2eApiUrl,
  fetchCollection,
  getPasswordSession,
  primeApiKeySession,
} from './api-key'
import { buttonName, moduleKeywordInput } from './business-e2e'

/**
 * 基础资料真实操作 e2e 专用助手（仅本套件使用，不修改共享 support）。
 * 选择器依据当前页面实现：表单控件 id 即字段 key，antd Table 行含 data-row-key=记录 id。
 */

const NAV_TIMEOUT_MS = 30_000

/** 生成带时间戳的唯一数据前缀，满足 E2E-A-<时间戳> 约定。 */
export function makeRunId() {
  return `E2E-A-${Date.now()}`
}

const LOGIN_RETRY_DELAYS_MS = [0, 1_500, 3_000, 6_000] as const

/**
 * 登录并注入会话，针对后端偶发的登录乐观锁/抖动做有限重试。
 * 共享登录助手只对限流重试，这里补充通用重试，避免整套用例被偶发登录失败拖垮。
 */
export async function loginWithRetry(page: Page) {
  let lastError: unknown
  for (let attempt = 0; attempt < LOGIN_RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = LOGIN_RETRY_DELAYS_MS[attempt]
    if (delay > 0) {
      await page.waitForTimeout(delay)
    }
    try {
      await primeApiKeySession(page)
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
      return
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('登录失败')
}

/** 顶层工作区浮层（基础资料新增/编辑表单）。 */
export function topOverlay(page: Page): Locator {
  return page.locator('.workspace-overlay-panel:visible').last()
}

/** 点击工具栏“新增”，返回打开的表单浮层。 */
export async function openCreateOverlay(page: Page): Promise<Locator> {
  await page
    .getByRole('button', { name: buttonName('新增') })
    .first()
    .click()
  const overlay = topOverlay(page)
  await expect(overlay).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  return overlay
}

/** 表单必填校验：返回当前浮层内联错误文案。 */
export async function formErrorMessages(overlay: Locator): Promise<string[]> {
  return overlay.locator('.ant-form-item-explain-error').allTextContents()
}

export async function fillTextField(
  overlay: Locator,
  label: string,
  value: string,
) {
  const control = overlay.getByLabel(label, { exact: true }).first()
  await expect(control).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  await control.fill(value)
}

export async function fillNumberField(
  overlay: Locator,
  label: string,
  value: number | string,
) {
  const control = overlay.getByLabel(label, { exact: true }).first()
  await expect(control).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  await control.fill(String(value))
}

/** 打开 antd Select 并选择指定选项（按可见文本匹配）。 */
export async function selectField(
  page: Page,
  overlay: Locator,
  label: string,
  optionLabel: string,
) {
  const control = overlay.getByLabel(label, { exact: true }).first()
  await expect(control).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  await control.click()
  const dropdown = page.locator('.ant-select-dropdown:visible').last()
  await expect(dropdown).toBeVisible({ timeout: 10_000 })
  const option = dropdown
    .locator('.ant-select-item-option')
    .filter({ hasText: optionLabel })
    .first()
  await expect(option).toBeVisible({ timeout: 10_000 })
  await option.click()
  await expect(dropdown)
    .toBeHidden({ timeout: 10_000 })
    .catch(() => {})
}

/** 选择下拉的首个可用选项，返回其文本。 */
export async function selectFirstOption(
  page: Page,
  overlay: Locator,
  label: string,
): Promise<string> {
  const control = overlay.getByLabel(label, { exact: true }).first()
  await control.click()
  const dropdown = page.locator('.ant-select-dropdown:visible').last()
  await expect(dropdown).toBeVisible({ timeout: 10_000 })
  const option = dropdown.locator('.ant-select-item-option').first()
  await expect(option).toBeVisible({ timeout: 10_000 })
  const text = ((await option.textContent()) || '').trim()
  await option.click()
  await expect(dropdown)
    .toBeHidden({ timeout: 10_000 })
    .catch(() => {})
  return text
}

/** 仅点击浮层“保存”，不等待结果（用于校验失败/缺陷留痕场景）。 */
export async function clickSave(overlay: Locator) {
  await overlay
    .locator('.workspace-overlay-footer')
    .getByRole('button', { name: buttonName('保存') })
    .click()
}

/** 点击浮层“保存”，等待保存成功提示且浮层关闭。 */
export async function saveOverlay(page: Page, overlay: Locator) {
  await clickSave(overlay)
  // 连续保存时 antd 可能同时挂载多条 message，用 poll 计数避免 strict mode 冲突。
  await expect
    .poll(
      async () =>
        page
          .locator('.ant-message-notice')
          .filter({ hasText: '保存成功' })
          .count(),
      { timeout: NAV_TIMEOUT_MS },
    )
    .toBeGreaterThan(0)
  await expect(overlay).toBeHidden({ timeout: NAV_TIMEOUT_MS })
}

/** 在列表关键字框按关键字搜索并返回匹配的首行。 */
export async function searchRow(page: Page, keyword: string): Promise<Locator> {
  const input = moduleKeywordInput(page)
  await expect(input).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  await input.fill(keyword)
  await input.press('Enter')
  const row = page
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: keyword })
    .first()
  await expect(row).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  return row
}

/** 双击行打开编辑浮层。 */
export async function openEditorByDoubleClick(page: Page, row: Locator) {
  await row.dblclick()
  const overlay = topOverlay(page)
  await expect(overlay).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  return overlay
}

export async function dismissMessage(page: Page) {
  await page
    .locator('.ant-message-notice')
    .first()
    .waitFor({ state: 'hidden', timeout: NAV_TIMEOUT_MS })
    .catch(() => {})
}

/** 下载商品导入模板到测试输出目录，返回本地路径。 */
export async function downloadMaterialTemplate(
  request: APIRequestContext,
  outputPath: string,
) {
  const session = await getPasswordSession(request)
  const response = await request.get(`${e2eApiBaseUrl()}/materials/template`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
  expect(response.ok()).toBeTruthy()
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, await response.body())
  return outputPath
}

/** 通过 API 删除单条基础资料记录（清理测试数据）。 */
export async function deleteModuleRecord(
  request: APIRequestContext,
  moduleKey: string,
  id: string,
) {
  const session = await getPasswordSession(request)
  const response = await request.delete(e2eApiUrl(moduleKey, id), {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'X-Idempotency-Key': randomUUID(),
    },
  })
  expect([200, 202, 204, 404, 409]).toContain(response.status())
}

/**
 * 按关键字查找并删除测试记录；记录不存在时静默跳过，保证清理幂等。
 * 返回实际删除的 id 列表。
 */
export async function cleanupByKeyword(
  request: APIRequestContext,
  moduleKey: string,
  keywords: string[],
) {
  const deleted: string[] = []
  for (const keyword of keywords) {
    try {
      const { records } = await fetchCollection(request, moduleKey, { keyword })
      for (const record of records) {
        const matched = Object.values(record).some(
          (value) => typeof value === 'string' && value.includes(keyword),
        )
        if (!matched) continue
        const id = String(record.id ?? '')
        if (!id) continue
        await deleteModuleRecord(request, moduleKey, id)
        deleted.push(id)
      }
    } catch {
      // 清理是尽力而为：登录限流或网络抖动不应让测试用例失败。
    }
  }
  return deleted
}
