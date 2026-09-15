import fs from 'node:fs/promises'
import { expect } from '@playwright/test'
import {
  e2eApiBaseUrl,
  getPasswordSession,
} from './support/api-key'
import {
  buttonName,
  expectGridTable,
  expectModuleHeading,
  gotoRoute,
  loginAsE2eUser,
  moduleKeywordInput,
} from './support/business-e2e'
import { test } from './support/test'

async function downloadMaterialTemplate(
  request: import('@playwright/test').APIRequestContext,
  outputPath: string,
) {
  const session = await getPasswordSession(request)
  const response = await request.get(
    `${e2eApiBaseUrl()}/materials/template`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } },
  )
  expect(response.ok()).toBeTruthy()
  await fs.writeFile(outputPath, await response.body())
  return outputPath
}

test.describe('商品版本历史 / 导入预览 / 批次回滚', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('选中商品后可打开版本历史抽屉', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/material')
    await expectModuleHeading(page, '商品资料')
    await expectGridTable(page)

    const firstRow = page.locator('tbody tr:not(.ant-table-measure-row)').first()
    await expect(firstRow).toBeVisible({ timeout: 30_000 })
    await firstRow.click()

    const historyButton = page
      .getByRole('button', { name: '版本历史' })
      .first()
    await expect(historyButton).toBeVisible({ timeout: 30_000 })
    await historyButton.click()

    const drawer = page.locator('.ant-drawer:visible').filter({
      hasText: '商品版本历史',
    })
    await expect(drawer).toBeVisible({ timeout: 30_000 })
    await expect(drawer.locator('table').first()).toBeVisible({
      timeout: 30_000,
    })

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden({ timeout: 30_000 })

    await assertNoFatalUiErrors()
  })

  test('导入模板文件时先展示导入预览（dry-run，不落库）', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }, testInfo) => {
    const templatePath = await downloadMaterialTemplate(
      request,
      testInfo.outputPath('material-template.xlsx'),
    )

    await gotoRoute(page, '/material')
    await expectModuleHeading(page, '商品资料')
    await expectGridTable(page)

    const chooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: buttonName('导入') }).first().click()
    const chooser = await chooserPromise
    await chooser.setFiles(templatePath)

    const previewModal = page.locator('.ant-modal:visible').filter({
      hasText: '导入预览',
    })
    await expect(previewModal).toBeVisible({ timeout: 30_000 })
    await expect(
      previewModal.locator('tbody tr:not(.ant-table-measure-row)').first(),
    ).toBeVisible({ timeout: 30_000 })

    await previewModal.getByRole('button', { name: buttonName('取消') }).first().click()
    await expect(previewModal).toBeHidden({ timeout: 30_000 })

    await assertNoFatalUiErrors()
  })

  test('导入后可在版本历史中回滚该批次', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }, testInfo) => {
    const templatePath = await downloadMaterialTemplate(
      request,
      testInfo.outputPath('material-template-rollback.xlsx'),
    )

    await gotoRoute(page, '/material')
    await expectModuleHeading(page, '商品资料')
    await expectGridTable(page)

    const chooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: buttonName('导入') }).first().click()
    const chooser = await chooserPromise
    await chooser.setFiles(templatePath)

    const previewModal = page.locator('.ant-modal:visible').filter({
      hasText: '导入预览',
    })
    await expect(previewModal).toBeVisible({ timeout: 30_000 })

    const importResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/material-imports') &&
        !response.url().includes('previews'),
      { timeout: 30_000 },
    )
    await previewModal
      .getByRole('button', { name: '确认导入' })
      .first()
      .click()
    const importResponse = await importResponsePromise
    const importPayload = (await importResponse.json()) as {
      rows?: Array<{ materialCode?: string | null }>
    }
    const materialCode = String(importPayload.rows?.[0]?.materialCode || '')
    expect(materialCode).toBeTruthy()

    const resultModal = page.locator('.ant-modal:visible').filter({
      hasText: '导入结果',
    })
    await expect(resultModal).toBeVisible({ timeout: 30_000 })
    await resultModal.getByRole('button', { name: buttonName('关闭') }).first().click()
    await expect(resultModal).toBeHidden({ timeout: 30_000 })

    // 搜索新导入商品并打开版本历史
    const keywordInput = moduleKeywordInput(page)
    await keywordInput.fill(materialCode)
    await keywordInput.press('Enter')
    const importedRow = page
      .locator('tbody tr:not(.ant-table-measure-row)')
      .filter({ hasText: materialCode })
      .first()
    await expect(importedRow).toBeVisible({ timeout: 30_000 })
    await importedRow.click()

    const historyButton = page
      .getByRole('button', { name: '版本历史' })
      .first()
    await historyButton.click()

    const drawer = page.locator('.ant-drawer:visible').filter({
      hasText: '商品版本历史',
    })
    await expect(drawer).toBeVisible({ timeout: 30_000 })

    const rollbackButton = drawer
      .getByRole('button', { name: '回滚该批次' })
      .first()
    await expect(rollbackButton).toBeVisible({ timeout: 30_000 })
    await rollbackButton.click()

    const confirmDialog = page
      .locator('.ant-modal-confirm')
      .filter({ hasText: '回滚导入批次' })
      .last()
    await expect(confirmDialog).toBeVisible({ timeout: 15_000 })
    await confirmDialog
      .locator('.ant-btn-primary')
      .filter({ hasText: /确\s*定|确定/ })
      .first()
      .click()

    await expect(
      page.locator('.ant-message-notice').filter({ hasText: '批次回滚完成' }),
    ).toBeVisible({ timeout: 30_000 })

    await assertNoFatalUiErrors()
  })
})
