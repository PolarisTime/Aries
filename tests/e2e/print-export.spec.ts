import fs from 'node:fs/promises'
import type { Download, Page } from '@playwright/test'
import { apiGetJson, gotoRouteE2e, loginE2e } from './ops-e2e-support'
import { expectGridTable, expectModuleHeading } from './support/business-e2e'
import { expect, test } from './support/test'

/**
 * 打印 / 导出全链路（真实后端）。
 *
 * <p>覆盖两条独立出口、都要求**产出真实文件**：</p>
 * <ol>
 *   <li><b>导出选中记录</b>：`POST /module-exports` 同步返回 xlsx（`导出选中 N 条`）；</li>
 *   <li><b>打印 PDF</b>：`POST /print-exports` 生成 PDF，前端走 `download` 模式的打印作业弹窗。</li>
 * </ol>
 *
 * <p>断言不看 toast：直接读落地文件的文件名与字节内容（xlsx 的 `PK` 头 + 工作簿条目、
 * PDF 的 `%PDF-` 头 + 尾部 `%%EOF`），否则「点了按钮、文件 0 字节/装错内容」会漏过。</p>
 *
 * <p>按钮的可访问名包含图标名（如「download 导出选中 1 条」「printer 打印」），
 * 因此按非锚定的可访问名匹配，不写死纯文本。</p>
 *
 * <p><b>导出任务清理</b>：两个端点都是同步命令（200 + 文件字节），不产生可回读/可删除的
 * 导出任务资源，因此无需清理；副作用只有一条操作日志（审计用途，不应删除）。</p>
 */
test.describe('打印导出全链路', () => {
  test.setTimeout(180_000)

  test.beforeEach(async ({ page }) => {
    await loginE2e(page)
  })

  const toolbar = (page: Page) => page.locator('.module-table-toolbar')
  /** 列表首行的勾选框（业务表格行带 data-row-key，排除 antd 测高行）。 */
  const firstRowCheckbox = (page: Page) =>
    page.locator('tbody tr[data-row-key] input.ant-checkbox-input').first()

  /** 等下载落地并读出字节；文件名与内容由调用方分别断言。 */
  async function readDownloadedFile(download: Download): Promise<Buffer> {
    const filePath = await download.path()
    expect(filePath, '下载文件应已落地到磁盘').toBeTruthy()
    return fs.readFile(filePath as string)
  }

  /**
   * 老销售订单列表 → 勾选首行（导出/打印动作只在有勾选时出现），返回该行单号。
   * 单号用于后续断言「打印作业弹窗确实是这张单据」，而不是随便弹了一个框。
   */
  async function selectFirstSalesOrderRow(page: Page): Promise<string> {
    await gotoRouteE2e(page, '/sales-order')
    await expectModuleHeading(page, '销售订单')
    await expectGridTable(page)
    await expect(firstRowCheckbox(page)).toBeVisible({ timeout: 30_000 })
    const row = page.locator('tbody tr[data-row-key]').first()
    // 第 1 列是「序号 + 勾选」，第 2 列是订单编号；不要整行取正则，
    // 否则「序号 1」会和单号拼成 19 位假单号。
    const orderNo = (await row.locator('td').nth(1).textContent())?.trim() ?? ''
    expect(orderNo, '首行第 2 列应是单据编号（雪花单号）').toMatch(
      /^\d{15,20}$/,
    )
    await firstRowCheckbox(page).check()
    // 勾选后工具栏就地出现「导出选中 1 条」与「打印」——这是选中态生效的业务证据。
    await expect(
      toolbar(page).getByRole('button', { name: /导出选中\s*1\s*条/ }),
    ).toBeVisible({ timeout: 30_000 })
    return orderNo
  }

  test('导出选中 1 条：xlsx 文件名与工作簿内容都非空', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await selectFirstSalesOrderRow(page)

    const exportButton = toolbar(page)
      .getByRole('button', { name: /导出选中\s*1\s*条/ })
      .first()
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      exportButton.click({ timeout: 30_000 }),
    ])
    const bytes = await readDownloadedFile(download)

    // 文件名由后端 Content-Disposition 给出（当前为「销售订单.xlsx」，不绑定具体值）。
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i)
    expect(bytes.length).toBeGreaterThan(1_000)
    // xlsx 是 zip 容器：本地文件头必须是 PK\x03\x04，且必须真含工作簿条目。
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK')
    expect(bytes.includes(Buffer.from('xl/workbook.xml'))).toBe(true)

    await assertNoFatalUiErrors()
  })

  test('打印作业下载 PDF：文件名、PDF 头与内容均有效', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    // 取一个 PDF 模板名，用于在弹窗里确定性选择（避免默认模板是 COORD 时没有「导出 PDF」）。
    const { ok, data } = await apiGetJson(request, '/print-templates', {
      billType: 'sales-order',
    })
    expect(ok).toBe(true)
    const templates = Array.isArray(data) ? data : []
    const pdfTemplate = templates.find(
      (item) =>
        String((item as Record<string, unknown>).templateType) === 'PDF_FORM' &&
        !String((item as Record<string, unknown>).settlementCompanyName || ''),
    )
    expect(pdfTemplate, '销售订单应存在通用 PDF 打印模板').toBeTruthy()
    const pdfTemplateName = String(
      (pdfTemplate as Record<string, unknown>).templateName,
    )

    const orderNo = await selectFirstSalesOrderRow(page)
    await toolbar(page)
      .getByRole('button', { name: /打\s*印/ })
      .first()
      .click({ timeout: 30_000 })

    const modal = page.getByRole('dialog', { name: '打印作业' }).last()
    await expect(modal).toBeVisible({ timeout: 30_000 })
    // 业务结果：弹窗针对的是刚才勾选的那张单据（页头带单号），不是空壳弹窗。
    await expect(modal).toContainText(orderNo)
    // 明细从 /print-previews/items 异步加载，等它落到「共 N 行明细」且 N ≥ 1 再导出，
    // 否则会把「先点导出、PDF 里没有明细」当成通过。
    await expect(modal).toContainText(/共\s*[1-9]\d*\s*行明细/, {
      timeout: 60_000,
    })

    // 选 PDF 模板（弹窗里只有一个模板下拉，控件 id=templateId）。
    const templateSelect = modal.getByRole('combobox').first()
    await expect(templateSelect).toBeVisible({ timeout: 20_000 })
    await templateSelect.click({ timeout: 20_000 })
    const dropdown = page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
      .last()
    await expect(dropdown).toBeVisible({ timeout: 15_000 })
    const option = dropdown
      .locator('.ant-select-item-option')
      .filter({ hasText: pdfTemplateName })
      .first()
    await expect(option).toBeVisible({ timeout: 15_000 })
    await option.click({ timeout: 15_000 })

    const downloadPdfButton = modal
      .getByRole('button', { name: /导出\s*PDF/ })
      .first()
    await expect(downloadPdfButton).toBeEnabled({ timeout: 60_000 })

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      downloadPdfButton.click({ timeout: 30_000 }),
    ])
    const bytes = await readDownloadedFile(download)

    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    expect(bytes.length).toBeGreaterThan(2_000)
    // 真实 PDF：文件头 `%PDF-` + 尾部 `%%EOF`（页面对象可能被压缩，不匹配 `/Type /Page`）。
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(bytes.subarray(-1024).toString('latin1')).toContain('%%EOF')

    await assertNoFatalUiErrors()
  })
})
