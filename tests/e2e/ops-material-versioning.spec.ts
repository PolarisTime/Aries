import { expect } from '@playwright/test'
import {
  buttonName,
  expectGridTable,
  expectModuleHeading,
  gotoRoute,
  moduleKeywordInput,
} from './support/business-e2e'
import {
  cleanupByKeyword,
  downloadMaterialTemplate,
  loginWithRetry,
} from './support/ops-master-data'
import { test } from './support/test'

test.describe('商品版本历史 / 导入预览 / 批次回滚', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithRetry(page)
  })

  test('导入预览（dry-run）展示每行的新建/更新与字段差异', async ({
    page,
    assertNoFatalUiErrors,
  }, testInfo) => {
    const templatePath = await downloadMaterialTemplate(
      page.request,
      testInfo.outputPath('material-template-preview.xlsx'),
    )

    await gotoRoute(page, '/material')
    await expectModuleHeading(page, '商品资料')
    await expectGridTable(page)

    const chooserPromise = page.waitForEvent('filechooser')
    await page
      .getByRole('button', { name: buttonName('导入') })
      .first()
      .click()
    const chooser = await chooserPromise
    await chooser.setFiles(templatePath)

    const previewModal = page
      .locator('.ant-modal:visible')
      .filter({ hasText: '导入预览' })
    await expect(previewModal).toBeVisible({ timeout: 30_000 })

    const previewRow = previewModal
      .locator('tbody tr:not(.ant-table-measure-row)')
      .first()
    await expect(previewRow).toBeVisible({ timeout: 30_000 })
    // dry-run 展示模板示例行的结果（新增/更新）与字段差异
    await expect(previewModal).toContainText(/新增|更新/)
    await expect(previewModal).toContainText('字段差异')
    await expect(previewModal).toContainText('品牌')
    await expect(previewModal).toContainText('敬业')
    await expect(previewModal).toContainText('预览结果')

    // 取消预览，不落库
    await previewModal
      .getByRole('button', { name: buttonName('取消') })
      .first()
      .click()
    await expect(previewModal).toBeHidden({ timeout: 30_000 })

    await assertNoFatalUiErrors()
  })

  test('导入商品后可在版本历史回滚该批次并净清理', async ({
    page,
    assertNoFatalUiErrors,
  }, testInfo) => {
    const templatePath = await downloadMaterialTemplate(
      page.request,
      testInfo.outputPath('material-template-rollback.xlsx'),
    )
    let importedCode = ''

    try {
      await gotoRoute(page, '/material')
      await expectModuleHeading(page, '商品资料')
      await expectGridTable(page)

      const chooserPromise = page.waitForEvent('filechooser')
      await page
        .getByRole('button', { name: buttonName('导入') })
        .first()
        .click()
      const chooser = await chooserPromise
      await chooser.setFiles(templatePath)

      const previewModal = page
        .locator('.ant-modal:visible')
        .filter({ hasText: '导入预览' })
      await expect(previewModal).toBeVisible({ timeout: 30_000 })

      const importResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/material-imports') &&
          !response.url().includes('previews'),
        { timeout: 30_000 },
      )
      await previewModal
        .getByRole('button', { name: buttonName('确认导入') })
        .first()
        .click()
      const importResponse = await importResponsePromise
      expect(importResponse.ok()).toBeTruthy()
      const importPayload = (await importResponse.json()) as {
        rows?: Array<{ materialCode?: string | null }>
      }
      importedCode = String(importPayload.rows?.[0]?.materialCode || '')
      expect(importedCode).toBeTruthy()

      const resultModal = page
        .locator('.ant-modal:visible')
        .filter({ hasText: '导入结果' })
      await expect(resultModal).toBeVisible({ timeout: 30_000 })
      await resultModal
        .getByRole('button', { name: buttonName('关闭') })
        .first()
        .click()
      await expect(resultModal).toBeHidden({ timeout: 30_000 })

      // 搜到导入商品并打开版本历史
      const keywordInput = moduleKeywordInput(page)
      await keywordInput.fill(importedCode)
      await keywordInput.press('Enter')
      const importedRow = page
        .locator('tbody tr:not(.ant-table-measure-row)')
        .filter({ hasText: importedCode })
        .first()
      await expect(importedRow).toBeVisible({ timeout: 30_000 })
      await importedRow.click()

      await page
        .getByRole('button', { name: buttonName('版本历史') })
        .first()
        .click()
      const drawer = page
        .locator('.ant-drawer:visible')
        .filter({ hasText: '商品版本历史' })
      await expect(drawer).toBeVisible({ timeout: 30_000 })
      const historyRow = drawer
        .locator('tbody tr:not(.ant-table-measure-row)')
        .first()
      await expect(historyRow).toBeVisible({ timeout: 30_000 })
      await expect(historyRow).toContainText('导入')
      await expect(drawer).toContainText('回滚该批次')

      // 执行批次回滚
      await drawer
        .getByRole('button', { name: buttonName('回滚该批次') })
        .first()
        .click()
      const confirmDialog = page
        .locator('.ant-modal-confirm')
        .filter({ hasText: '回滚导入批次' })
        .last()
      await expect(confirmDialog).toBeVisible({ timeout: 15_000 })
      await confirmDialog.locator('.ant-btn-primary').click()
      await expect(
        page.locator('.ant-message-notice').filter({ hasText: '批次回滚完成' }),
      ).toBeVisible({ timeout: 30_000 })

      // 回滚后该批次新建的商品被软删除，列表搜索不再命中（净清理）
      await page.keyboard.press('Escape')
      await expect(drawer).toBeHidden({ timeout: 30_000 })
      await keywordInput.fill(importedCode)
      await keywordInput.press('Enter')
      await expect(
        page
          .locator('tbody tr:not(.ant-table-measure-row)')
          .filter({ hasText: importedCode }),
      ).toHaveCount(0, { timeout: 30_000 })

      await assertNoFatalUiErrors()
    } finally {
      if (importedCode) {
        await cleanupByKeyword(page.request, 'material', [importedCode])
      }
    }
  })
})
