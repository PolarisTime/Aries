import type { APIRequestContext, Locator, Page } from '@playwright/test'
import {
  apiGetJson,
  deleteModuleRecordBestEffort,
  E2E_PREFIX,
  gotoRouteE2e,
  loginE2e,
} from './ops-e2e-support'
import { expectModuleHeading } from './support/business-e2e'
import { expect, test } from './support/test'

/**
 * 结算主体 / 系统设置 CRUD（真实后端）。
 *
 * <p>覆盖「新建 → 列表可见 → 编辑 → 删除 → 列表回收」的完整业务闭环，
 * 每条断言都落在**列表内容与接口结果**上（不是 toast）：</p>
 * <ul>
 *   <li>新建后：左侧主体列表出现该名称，接口按税号能查到；</li>
 *   <li>编辑后：列表显示新名称，接口同 id 的 companyName 已更新；</li>
 *   <li>删除后：列表不再出现，接口查不到该税号（回收干净）。</li>
 * </ul>
 *
 * <p>控件一律按字段名/id 定位（`#companyName`、`#taxNo`）：antd 会把字段名注入控件 id，
 * 而按钮的可访问名包含图标名（如「save 保存」），不能按纯文本锚定。</p>
 *
 * <p>所有写入用唯一前缀（`E2E-C-<时间戳>`），并在 finally 里按税号兜底清理，
 * 即使中途断言失败也不会把脏数据留在库里。</p>
 */
test.describe('结算主体管理 CRUD', () => {
  test.setTimeout(180_000)

  test.beforeEach(async ({ page }) => {
    await loginE2e(page)
  })

  const subjectItem = (page: Page, text: string): Locator =>
    page
      .locator('.company-subject-selector-item')
      .filter({ hasText: text })
      .first()

  /** 页面动作区的「保存」按钮（可访问名含图标名「save」，用非锚定匹配 + 动作超时）。 */
  const saveButton = (page: Page) =>
    page.getByRole('button', { name: /保\s*存/ }).first()

  const companyNameInput = (page: Page) => page.locator('input#companyName')
  const taxNoInput = (page: Page) => page.locator('input#taxNo')

  async function openCompanySettings(page: Page) {
    await gotoRouteE2e(page, '/company-setting')
    await expectModuleHeading(page, '结算主体管理')
    // 左栏主体列表卡片是页面的稳定锚点（列表为空时也有卡片与「新增主体」按钮）。
    await expect(page.locator('.company-subject-selector-card')).toBeVisible({
      timeout: 30_000,
    })
  }

  /** 从接口按税号查结算主体（不依赖列表展示值）。 */
  async function findCompanyByTaxNo(
    request: APIRequestContext,
    taxNo: string,
  ): Promise<Record<string, unknown> | null> {
    const { ok, data } = await apiGetJson(request, '/company-settings', {
      page: 0,
      size: 200,
    })
    if (!ok) return null
    const rows = Array.isArray(data?.content)
      ? (data.content as Array<Record<string, unknown>>)
      : []
    return rows.find((row) => String(row.taxNo) === taxNo) ?? null
  }

  test('新建 → 列表可见 → 编辑 → 删除，接口与列表同步回收', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const suffix = `${Date.now()}`
    const prefix = `${E2E_PREFIX}-${suffix}`
    const companyName = `${prefix} 结算主体`
    const editedName = `${companyName}（改）`
    const taxNo = `${prefix}-TAX`

    let createdId: string | null = null
    try {
      await openCompanySettings(page)

      await page
        .getByRole('button', { name: /新\s*增\s*主\s*体/ })
        .first()
        .click({ timeout: 30_000 })
      await expect(companyNameInput(page)).toBeVisible({ timeout: 30_000 })
      await companyNameInput(page).fill(companyName)
      await taxNoInput(page).fill(taxNo)
      await saveButton(page).click({ timeout: 30_000 })

      // 业务结果 1：列表出现新主体，且接口能按税号查到（同一个新建结果的两个出口）。
      await expect(subjectItem(page, companyName)).toBeVisible({
        timeout: 30_000,
      })
      const created = await findCompanyByTaxNo(request, taxNo)
      expect(created, '新建后接口应能按税号查到该结算主体').not.toBeNull()
      createdId = String(created?.id ?? '')
      expect(createdId).not.toBe('')
      expect(String(created?.companyName)).toBe(companyName)

      // 业务结果 2：编辑后列表与接口都显示新名称。
      await expect(companyNameInput(page)).toHaveValue(companyName, {
        timeout: 30_000,
      })
      await companyNameInput(page).fill(editedName)
      await saveButton(page).click({ timeout: 30_000 })
      await expect(subjectItem(page, editedName)).toBeVisible({
        timeout: 30_000,
      })
      const updated = await findCompanyByTaxNo(request, taxNo)
      expect(String(updated?.id)).toBe(createdId)
      expect(String(updated?.companyName)).toBe(editedName)

      // 业务结果 3：删除后有二次确认；确认后列表回收、接口查不到。
      await subjectItem(page, editedName)
        .getByRole('button', { name: '删除结算主体' })
        .click()
      const confirmDialog = page
        .getByRole('dialog')
        .filter({ hasText: '删除结算主体' })
        .last()
      await expect(confirmDialog).toBeVisible({ timeout: 20_000 })
      await confirmDialog
        .getByRole('button', { name: /确\s*认/ })
        .click({ timeout: 20_000 })
      await expect(subjectItem(page, editedName)).toHaveCount(0, {
        timeout: 30_000,
      })
      const afterDelete = await findCompanyByTaxNo(request, taxNo)
      expect(afterDelete, '删除后接口不应再返回该结算主体').toBeNull()
    } finally {
      // 兜底清理：任何一步失败都按税号回收（接口删除幂等，重试在 helper 内）。
      const fallback = await findCompanyByTaxNo(request, taxNo).catch(
        () => null,
      )
      const fallbackId = String(fallback?.id ?? createdId ?? '')
      if (fallbackId) {
        await deleteModuleRecordBestEffort(
          request,
          '/company-settings',
          fallbackId,
        )
      }
    }

    await assertNoFatalUiErrors()
  })

  test('新建时名称/税号必填，未填不产生脏数据', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    await openCompanySettings(page)

    const before = await apiGetJson(request, '/company-settings', {
      page: 0,
      size: 1,
    })
    const beforeTotal = Number(before.data?.totalElements ?? -1)

    await page
      .getByRole('button', { name: /新\s*增\s*主\s*体/ })
      .first()
      .click({ timeout: 30_000 })
    await expect(companyNameInput(page)).toBeVisible({ timeout: 30_000 })
    await expect(companyNameInput(page)).toHaveValue('')
    await saveButton(page).click({ timeout: 30_000 })

    // 业务结果：表单内联报错出现，且接口里没有新增记录（列表总数不变）。
    await expect(
      page.locator('.ant-form-item-explain-error').first(),
    ).toBeVisible({ timeout: 15_000 })
    const after = await apiGetJson(request, '/company-settings', {
      page: 0,
      size: 1,
    })
    expect(Number(after.data?.totalElements ?? -1)).toBe(beforeTotal)

    await assertNoFatalUiErrors()
  })
})
