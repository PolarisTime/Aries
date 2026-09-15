import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
} from '@playwright/test'
import { apiGetJson, deleteModuleRecordBestEffort } from './ops-e2e-support'
import { primeApiKeySession } from './support/api-key'
import { buttonName } from './support/business-e2e'
import { test } from './support/test'

const NAV_TIMEOUT_MS = 30_000

/** 角色列表行：按行内文本（编码/名称）过滤，跳过 antd 测高行。 */
function roleRow(page: Page, text: string) {
  return page
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: text })
    .first()
}

async function openRoleManagement(page: Page) {
  await page.goto('/role', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '角色管理' })).toBeVisible({
    timeout: NAV_TIMEOUT_MS,
  })
  await expect(page.locator('table:visible').first()).toBeVisible({
    timeout: NAV_TIMEOUT_MS,
  })
}

/**
 * 权限矩阵弹层内容很长，目标复选框常被移出视口；antd 弹层外层滚动容器
 * 使 Playwright 自动滚动失效。这里用原生 focus 滚动到目标后按空格切换。
 */
async function togglePermissionCheckbox(
  matrix: Locator,
  permissionCode: string,
) {
  const input = matrix.locator(
    `.ant-checkbox[title="${permissionCode}"] input[type="checkbox"]`,
  )
  await expect(input).toHaveCount(1, { timeout: NAV_TIMEOUT_MS })
  await input.evaluate((element) => {
    const target = element as HTMLElement
    target.focus()
  })
  await expect(input).toBeFocused({ timeout: NAV_TIMEOUT_MS })
  await matrix.page().keyboard.press('Space')
}

async function searchRole(page: Page, keyword: string) {
  const input = page.locator('#role-management-search:visible').first()
  await expect(input).toBeVisible({ timeout: NAV_TIMEOUT_MS })
  await input.fill(keyword)
  await input.press('Enter')
}

/** 兜底自清理：按编码查列表并删除自建角色，避免污染库。 */
async function deleteRoleByCodeBestEffort(
  request: APIRequestContext,
  code: string,
) {
  const { ok, data } = await apiGetJson(request, '/roles', {
    page: 0,
    size: 50,
    keyword: code,
  })
  if (!ok) return
  const rows = Array.isArray(data?.content)
    ? (data.content as Array<Record<string, unknown>>)
    : []
  for (const row of rows) {
    if (String(row.code) === code) {
      await deleteModuleRecordBestEffort(request, '/roles', String(row.id))
    }
  }
}

test.describe('RBAC0 角色管理真实操作', () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  test('角色列表加载并展示内置 SUPER_ADMIN', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await openRoleManagement(page)

    const superRow = roleRow(page, 'SUPER_ADMIN')
    await expect(superRow).toBeVisible({ timeout: NAV_TIMEOUT_MS })
    await expect(superRow).toContainText('超级管理员')
    await expect(superRow).toContainText('内置')
    await expect(superRow).toContainText('正常')

    await assertNoFatalUiErrors()
  })

  test('新建 → 编辑 → 权限矩阵保存生效 → 删除', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const suffix = `${Date.now()}`
    const code = `E2E-RBAC-${suffix}`
    const name = `E2E角色${suffix}`
    const editedName = `${name}改`

    try {
      await openRoleManagement(page)

      // 1. 新建角色（唯一编码 + 名称）
      await page.getByRole('button', { name: buttonName('新建角色') }).click()
      const editor = page.locator('.ant-modal:visible').last()
      await expect(editor).toBeVisible({ timeout: NAV_TIMEOUT_MS })
      await editor.locator('#code').fill(code)
      await editor.locator('#name').fill(name)
      await editor.locator('#description').fill('E2E 自动化创建角色')
      const createResponse = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/roles'),
        { timeout: NAV_TIMEOUT_MS },
      )
      await editor
        .locator('.ant-modal-footer .ant-btn-primary')
        .click({ timeout: NAV_TIMEOUT_MS })
      expect((await createResponse).status()).toBe(201)
      await expect(editor).toBeHidden({ timeout: NAV_TIMEOUT_MS })

      // 2. 列表可见
      await searchRole(page, code)
      const createdRow = roleRow(page, code)
      await expect(createdRow).toBeVisible({ timeout: NAV_TIMEOUT_MS })
      await expect(createdRow).toContainText(name)
      await expect(createdRow).not.toContainText('内置')

      // 3. 编辑名称并生效
      await createdRow
        .getByRole('button', { name: '编辑' })
        .click({ timeout: NAV_TIMEOUT_MS })
      const editModal = page.locator('.ant-modal:visible').last()
      await expect(editModal).toBeVisible({ timeout: NAV_TIMEOUT_MS })
      await expect(editModal.locator('#code')).toBeEnabled()
      await editModal.locator('#name').fill(editedName)
      const updateResponse = page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes('/roles/'),
        { timeout: NAV_TIMEOUT_MS },
      )
      await editModal
        .locator('.ant-modal-footer .ant-btn-primary')
        .click({ timeout: NAV_TIMEOUT_MS })
      expect((await updateResponse).status()).toBe(200)
      await expect(editModal).toBeHidden({ timeout: NAV_TIMEOUT_MS })
      await searchRole(page, code)
      await expect(roleRow(page, code)).toContainText(editedName, {
        timeout: NAV_TIMEOUT_MS,
      })

      // 4. 权限矩阵：勾选若干权限并保存
      await roleRow(page, code)
        .getByRole('button', { name: '权限矩阵' })
        .click({ timeout: NAV_TIMEOUT_MS })
      const matrix = page.locator('.ant-modal:visible').last()
      await expect(matrix).toContainText(`权限矩阵 - ${editedName}`, {
        timeout: NAV_TIMEOUT_MS,
      })
      await expect(matrix).toContainText('已选 0 项权限')
      await togglePermissionCheckbox(matrix, 'materials:read')
      await expect(
        matrix.locator(
          '.ant-checkbox[title="materials:read"] input[type="checkbox"]',
        ),
      ).toBeChecked({ timeout: NAV_TIMEOUT_MS })
      await togglePermissionCheckbox(matrix, 'customers:read')
      await expect(
        matrix.locator(
          '.ant-checkbox[title="customers:read"] input[type="checkbox"]',
        ),
      ).toBeChecked({ timeout: NAV_TIMEOUT_MS })
      await expect(matrix).toContainText('已选 2 项权限')
      const permissionResponse = page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes('/permissions'),
        { timeout: NAV_TIMEOUT_MS },
      )
      await matrix
        .locator('.ant-modal-footer .ant-btn-primary')
        .click({ timeout: NAV_TIMEOUT_MS })
      expect((await permissionResponse).status()).toBeLessThan(400)
      await expect(matrix).toBeHidden({ timeout: NAV_TIMEOUT_MS })

      // 5. 权限数刷新为 2
      await searchRole(page, code)
      const refreshedRow = roleRow(page, code)
      await expect(refreshedRow.locator('td').nth(4)).toHaveText('2', {
        timeout: NAV_TIMEOUT_MS,
      })

      // 6. 重新打开校验勾选保持
      await refreshedRow
        .getByRole('button', { name: '权限矩阵' })
        .click({ timeout: NAV_TIMEOUT_MS })
      const matrixReopened = page.locator('.ant-modal:visible').last()
      await expect(
        matrixReopened.locator(
          '.ant-checkbox[title="materials:read"] input[type="checkbox"]',
        ),
      ).toBeChecked({ timeout: NAV_TIMEOUT_MS })
      await expect(
        matrixReopened.locator(
          '.ant-checkbox[title="customers:read"] input[type="checkbox"]',
        ),
      ).toBeChecked()
      await expect(matrixReopened).toContainText('已选 2 项权限')
      await matrixReopened
        .locator('.ant-modal-footer .ant-btn-default')
        .click({ timeout: NAV_TIMEOUT_MS })
      await expect(matrixReopened).toBeHidden({ timeout: NAV_TIMEOUT_MS })

      // 7. 删除非内置角色
      const deleteRow = roleRow(page, code)
      await expect(
        deleteRow.getByRole('button', { name: '删除' }),
      ).toBeEnabled()
      const deleteResponse = page.waitForResponse(
        (response) =>
          response.request().method() === 'DELETE' &&
          response.url().includes('/roles/'),
        { timeout: NAV_TIMEOUT_MS },
      )
      await deleteRow
        .getByRole('button', { name: '删除' })
        .click({ timeout: NAV_TIMEOUT_MS })
      const confirm = page.locator('.ant-modal-confirm:visible').last()
      await expect(confirm).toBeVisible({ timeout: NAV_TIMEOUT_MS })
      await confirm
        .locator('.ant-btn-primary')
        .click({ timeout: NAV_TIMEOUT_MS })
      expect((await deleteResponse).status()).toBe(204)
      await expect(
        page.locator('.ant-message-notice').filter({ hasText: '删除成功' }),
      ).toBeVisible({ timeout: NAV_TIMEOUT_MS })
      await searchRole(page, code)
      await expect(roleRow(page, code)).toHaveCount(0, {
        timeout: NAV_TIMEOUT_MS,
      })

      await assertNoFatalUiErrors()
    } finally {
      await deleteRoleByCodeBestEffort(page.request, code)
    }
  })

  test('内置角色保护：通配权限与不可删除', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await openRoleManagement(page)

    const superRow = roleRow(page, 'SUPER_ADMIN')
    await expect(superRow).toBeVisible({ timeout: NAV_TIMEOUT_MS })

    // 不提供删除
    await expect(superRow.getByRole('button', { name: '删除' })).toBeDisabled()

    // 编码只读
    await superRow.getByRole('button', { name: '编辑' }).click()
    const editor = page.locator('.ant-modal:visible').last()
    await expect(editor).toBeVisible({ timeout: NAV_TIMEOUT_MS })
    await expect(editor.locator('#code')).toBeDisabled()
    await editor.locator('.ant-modal-footer .ant-btn-default').click()
    await expect(editor).toBeHidden({ timeout: NAV_TIMEOUT_MS })

    // 权限矩阵通配保护：提示通配且保存禁用
    await superRow.getByRole('button', { name: '权限矩阵' }).click()
    const matrix = page.locator('.ant-modal:visible').last()
    await expect(matrix).toContainText('权限矩阵 - 超级管理员', {
      timeout: NAV_TIMEOUT_MS,
    })
    await expect(matrix).toContainText('全局通配权限', {
      timeout: NAV_TIMEOUT_MS,
    })
    await expect(
      matrix.locator('.ant-modal-footer .ant-btn-primary'),
    ).toBeDisabled()
    await matrix.locator('.ant-modal-footer .ant-btn-default').click()
    await expect(matrix).toBeHidden({ timeout: NAV_TIMEOUT_MS })

    await assertNoFatalUiErrors()
  })
})
