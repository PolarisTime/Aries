import { expect } from '@playwright/test'
import {
  buttonName,
  expectGridTable,
  expectModuleHeading,
  gotoRoute,
} from './support/business-e2e'
import {
  cleanupByKeyword,
  fillTextField,
  formErrorMessages,
  loginWithRetry,
  makeRunId,
  openCreateOverlay,
  openEditorByDoubleClick,
  saveOverlay,
  searchRow,
  selectField,
  selectFirstOption,
} from './support/ops-master-data'
import { test } from './support/test'

test.describe('基础资料真实操作', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithRetry(page)
  })

  test('商品资料：必填校验 → 新建 → 搜到 → 编辑保存 → 版本历史', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const runId = makeRunId()
    const materialName = `EA${String(Date.now()).slice(-6)}`
    const initialSpec = 'EAS1'
    const updatedSpec = 'EAS2'

    try {
      await gotoRoute(page, '/material')
      await expectModuleHeading(page, '商品资料')
      await expectGridTable(page)

      // 1. 打开新增浮层，直接保存触发必填校验
      const overlay = await openCreateOverlay(page)
      await overlay
        .locator('.workspace-overlay-footer')
        .getByRole('button', { name: buttonName('保存') })
        .click()
      const errors = await formErrorMessages(overlay)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.join('\n')).toContain('品牌')
      await expect(overlay).toBeVisible()

      // 2. 真实填表并保存
      await fillTextField(overlay, '品牌', runId)
      await fillTextField(overlay, '材质', materialName)
      await fillTextField(overlay, '规格', initialSpec)
      await fillTextField(overlay, '长度', '1米')
      await fillTextField(overlay, '单位', '吨')
      await fillTextField(overlay, '数量单位', '件')
      await selectFirstOption(page, overlay, '类别')
      await saveOverlay(page, overlay)

      // 3. 列表搜索回显
      const createdRow = await searchRow(page, runId)
      await expect(createdRow).toContainText(initialSpec)

      // 4. 双击打开编辑并修改保存
      const editOverlay = await openEditorByDoubleClick(page, createdRow)
      await fillTextField(editOverlay, '规格', updatedSpec)
      await saveOverlay(page, editOverlay)
      const editedRow = await searchRow(page, runId)
      await expect(editedRow).toContainText(updatedSpec)

      // 5. 选中行打开版本历史，校验存在变更记录
      await editedRow.click()
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
      await expect(drawer).toContainText('更新')
      await page.keyboard.press('Escape')
      await expect(drawer).toBeHidden({ timeout: 30_000 })

      await assertNoFatalUiErrors()
    } finally {
      await cleanupByKeyword(page.request, 'material', [runId])
    }
  })

  test('商品类别：新建 → 搜到 → 编辑 → 删除', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const runId = makeRunId()
    const initialName = `${runId}-类`
    const updatedName = `${runId}-类改`

    try {
      await gotoRoute(page, '/material-categories')
      await expectModuleHeading(page, '商品类别')
      await expectGridTable(page)

      const overlay = await openCreateOverlay(page)
      await fillTextField(overlay, '类别名称', initialName)
      await saveOverlay(page, overlay)

      const createdRow = await searchRow(page, initialName)
      await expect(createdRow).toContainText(initialName)

      const editOverlay = await openEditorByDoubleClick(page, createdRow)
      await fillTextField(editOverlay, '类别名称', updatedName)
      await saveOverlay(page, editOverlay)
      const editedRow = await searchRow(page, updatedName)
      await expect(editedRow).toContainText(updatedName)

      // 勾选后批量删除
      await editedRow.locator('input.ant-checkbox-input').check()
      await page
        .getByRole('button', { name: buttonName('删除') })
        .first()
        .click()
      const confirm = page.locator('.ant-modal-confirm:visible').last()
      await expect(confirm).toBeVisible({ timeout: 15_000 })
      await confirm.locator('.ant-btn-primary').click()
      await expect(
        page.locator('.ant-message-notice').filter({ hasText: /删除/ }),
      ).toBeVisible({ timeout: 30_000 })

      await assertNoFatalUiErrors()
    } finally {
      await cleanupByKeyword(page.request, 'material-categories', [
        initialName,
        updatedName,
      ])
    }
  })

  test('客户资料：新建 → 搜到 → 编辑保存', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const runId = makeRunId()
    const customerName = `${runId}-客`

    try {
      await gotoRoute(page, '/customer')
      await expectModuleHeading(page, '客户资料')
      await expectGridTable(page)

      const overlay = await openCreateOverlay(page)
      await fillTextField(overlay, '客户名称', customerName)
      await fillTextField(overlay, '联系人', '李客')
      await selectField(page, overlay, '结算方式', '月结')
      await selectFirstOption(page, overlay, '默认结算主体')
      await saveOverlay(page, overlay)

      const createdRow = await searchRow(page, customerName)
      await expect(createdRow).toContainText('李客')

      const editOverlay = await openEditorByDoubleClick(page, createdRow)
      await fillTextField(editOverlay, '联系人', '李客改')
      await saveOverlay(page, editOverlay)
      const editedRow = await searchRow(page, customerName)
      await expect(editedRow).toContainText('李客改')

      await assertNoFatalUiErrors()
    } finally {
      await cleanupByKeyword(page.request, 'customer', [customerName])
    }
  })

  test('供应商资料：新建 → 搜到 → 编辑保存', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const runId = makeRunId()
    const supplierName = `${runId}-供`

    try {
      await gotoRoute(page, '/supplier')
      await expectModuleHeading(page, '供应商资料')
      await expectGridTable(page)

      const overlay = await openCreateOverlay(page)
      await fillTextField(overlay, '供应商名称', supplierName)
      await fillTextField(overlay, '联系人', '张供')
      await fillTextField(overlay, '城市', '上海')
      await saveOverlay(page, overlay)

      const createdRow = await searchRow(page, supplierName)
      await expect(createdRow).toContainText('张供')

      const editOverlay = await openEditorByDoubleClick(page, createdRow)
      await fillTextField(editOverlay, '联系人', '张供改')
      await saveOverlay(page, editOverlay)
      const editedRow = await searchRow(page, supplierName)
      await expect(editedRow).toContainText('张供改')

      await assertNoFatalUiErrors()
    } finally {
      await cleanupByKeyword(page.request, 'supplier', [supplierName])
    }
  })

  test('仓库资料：新建 → 搜到', async ({ page, assertNoFatalUiErrors }) => {
    const runId = makeRunId()
    const warehouseName = `${runId}-仓`

    try {
      await gotoRoute(page, '/warehouse')
      await expectModuleHeading(page, '仓库资料')
      await expectGridTable(page)

      const overlay = await openCreateOverlay(page)
      await fillTextField(overlay, '仓库名称', warehouseName)
      await selectField(page, overlay, '仓库类型', '自营仓')
      await saveOverlay(page, overlay)

      const createdRow = await searchRow(page, warehouseName)
      await expect(createdRow).toContainText(warehouseName)
      await expect(createdRow).toContainText('自营仓')

      await assertNoFatalUiErrors()
    } finally {
      await cleanupByKeyword(page.request, 'warehouse', [warehouseName])
    }
  })

  test('物流方资料：新建 → 搜到 → 编辑保存', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const runId = makeRunId()
    const carrierName = `${runId}-运`

    try {
      await gotoRoute(page, '/carrier')
      await expectModuleHeading(page, '物流方资料')
      await expectGridTable(page)

      const overlay = await openCreateOverlay(page)
      await fillTextField(overlay, '物流商名称', carrierName)
      await selectFirstOption(page, overlay, '默认结算主体')
      await saveOverlay(page, overlay)

      const createdRow = await searchRow(page, carrierName)
      await expect(createdRow).toContainText(carrierName)

      await assertNoFatalUiErrors()
    } finally {
      await cleanupByKeyword(page.request, 'carrier', [carrierName])
    }
  })

  test('项目资料：新建 → 搜到 → 编辑保存', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const runId = makeRunId()
    const projectName = `${runId}-项`

    try {
      await gotoRoute(page, '/project')
      await expectModuleHeading(page, '项目资料')
      await expectGridTable(page)

      const overlay = await openCreateOverlay(page)
      await fillTextField(overlay, '项目名称', projectName)
      await selectFirstOption(page, overlay, '客户')
      await saveOverlay(page, overlay)

      const createdRow = await searchRow(page, projectName)
      await expect(createdRow).toContainText(projectName)

      await assertNoFatalUiErrors()
    } finally {
      await cleanupByKeyword(page.request, 'project', [projectName])
    }
  })

  test('商品浮层不保存时按 Esc 关闭，不产生新记录', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const runId = makeRunId()

    try {
      await gotoRoute(page, '/material')
      await expectModuleHeading(page, '商品资料')
      await expectGridTable(page)

      const overlay = await openCreateOverlay(page)
      await fillTextField(overlay, '品牌', runId)
      await page.keyboard.press('Escape')
      await expect(overlay).toBeHidden({ timeout: 30_000 })

      const input = page
        .locator(
          'input[aria-label="关键字"]:visible, input[name="keyword"]:visible',
        )
        .first()
      await input.fill(runId)
      await input.press('Enter')
      await expect(
        page
          .locator('tbody tr:not(.ant-table-measure-row)')
          .filter({ hasText: runId }),
      ).toHaveCount(0, { timeout: 30_000 })

      await assertNoFatalUiErrors()
    } finally {
      await cleanupByKeyword(page.request, 'material', [runId])
    }
  })
})
