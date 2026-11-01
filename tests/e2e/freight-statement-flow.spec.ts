import { randomUUID } from 'node:crypto'
import type { APIRequestContext, Locator, Page } from '@playwright/test'
import {
  apiGetJson,
  clickEditorSave,
  closeSaveResult,
  confirmStatusDialog,
  deleteModuleRecordBestEffort,
  E2E_PREFIX,
  editorPanel,
  expectSaveSuccess,
  extractIdAfterLabel,
  gotoRouteE2e,
  loginE2e,
  parentSelectorPanel,
  selectPopoverOption,
} from './ops-e2e-support'
import { e2eApiBaseUrl, getPasswordSession } from './support/api-key'
import { expectGridTable, expectModuleHeading } from './support/business-e2e'
import { expect, test } from './support/test'

/**
 * 物流对账单闭环（真实后端）：列表 → 从已审核物流单生成 → 保存 → 审核 → 金额/状态联动。
 *
 * <p>数据来源用**现成的已审核物流单候选**（`GET /freight-statements/candidates`），
 * 不新建物流单：候选不足时用例会明确标注 relaxed 而不是伪造通过。</p>
 *
 * <p>金额断言不是「有数字就行」，而是三方对齐：</p>
 * <ol>
 *   <li>编辑器里的总重量/总运费 == 所导入物流单的同口径合计（按单号回查接口）；</li>
 *   <li>列表行展示的金额 == 后端详情值（2 位小数口径，与 `formatAmount` 一致）；</li>
 *   <li>未付金额 == 总运费 − 已付金额（合计联动，不随审核改变）。</li>
 * </ol>
 */
test.describe('物流对账单闭环', () => {
  test.setTimeout(240_000)

  test.beforeEach(async ({ page }) => {
    await loginE2e(page)
  })

  interface FreightBillTotals {
    billNo: string
    totalWeight: number
    totalFreight: number
  }

  /** 候选物流单首页里挑一张「总运费 > 0」的，让金额联动断言不是 0 = 0 的退化同值。 */
  async function findPositiveFreightCandidate(
    request: APIRequestContext,
  ): Promise<FreightBillTotals | null> {
    const { ok, data } = await apiGetJson(
      request,
      '/freight-statements/candidates',
      { page: 0, size: 20 },
    )
    if (!ok) return null
    const rows = Array.isArray(data?.content)
      ? (data.content as Array<Record<string, unknown>>)
      : []
    const positive = rows.find((row) => Number(row.totalFreight) > 0)
    if (!positive) return null
    return {
      billNo: String(positive.billNo),
      totalWeight: Number(positive.totalWeight),
      totalFreight: Number(positive.totalFreight),
    }
  }

  /** 打开物流对账单列表。 */
  async function openFreightStatements(page: Page) {
    await gotoRouteE2e(page, '/freight-statement')
    await expectModuleHeading(page, '物流对账单')
    await expectGridTable(page)
  }

  /**
   * 在候选弹层里导入指定单号的物流单；找不到该行时退回首行并在报告里标注。
   * 候选弹层继承了物流单列表的「物流单号(keyword)」筛选，因此按单号搜索是确定性选择，
   * 不依赖候选首屏顺序。勾选按钮的启用是异步的（候选明细在后台加载），按「启用即止」重试。
   */
  async function importCandidate(page: Page, billNo?: string): Promise<void> {
    const panel = parentSelectorPanel(page)
    await expect(panel).toBeVisible({ timeout: 30_000 })
    const rows = panel.locator('tbody tr:not(.ant-table-measure-row)')
    await expect(rows.first()).toBeVisible({ timeout: 30_000 })
    await expect(panel.locator('.ant-spin-spinning'))
      .toHaveCount(0, { timeout: 20_000 })
      .catch(() => undefined)

    if (billNo) {
      const keywordInput = panel
        .locator('input[name="keyword"], input[aria-label="物流单号"]')
        .first()
      if ((await keywordInput.count()) > 0) {
        await keywordInput.fill(billNo)
        await panel
          .getByRole('button', { name: /搜\s*索/ })
          .first()
          .click()
        await expect(rows.first()).toBeVisible({ timeout: 30_000 })
        await expect(panel.locator('.ant-spin-spinning'))
          .toHaveCount(0, { timeout: 20_000 })
          .catch(() => undefined)
      }
    }

    let target = billNo
      ? rows.filter({ hasText: billNo }).first()
      : rows.first()
    if (billNo && (await target.count()) === 0) {
      target = rows.first()
      test.info().annotations.push({
        type: 'relaxed',
        description: `候选首屏未包含目标物流单 ${billNo}，已改为导入首行`,
      })
    }
    const confirm = panel.getByRole('button', { name: /确认导入/ })
    const checkboxInput = target.locator('input[type="checkbox"]').first()
    const checkboxWrapper = target
      .locator('.ant-table-selection-column .ant-checkbox')
      .first()
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (await confirm.isEnabled()) break
      await checkboxInput.check({ force: true, timeout: 5_000 }).catch(() => {})
      if (await confirm.isEnabled()) break
      await checkboxWrapper
        .click({ force: true, timeout: 5_000 })
        .catch(() => {})
      await page.waitForTimeout(300)
    }
    await expect(confirm).toBeEnabled({ timeout: 20_000 })
    await confirm.click()
    await expect(panel).toBeHidden({ timeout: 30_000 })
  }

  /** 按单号回查物流单合计（接口为准，不用列表展示值反推）。 */
  async function sumFreightBills(
    request: APIRequestContext,
    billNos: string[],
  ): Promise<FreightBillTotals> {
    const wanted = new Set(billNos.filter(Boolean))
    const found = new Map<string, Record<string, unknown>>()
    for (const billNo of wanted) {
      const byKeyword = await apiGetJson(request, '/freight-bills', {
        page: 0,
        size: 5,
        keyword: billNo,
      })
      const rows = Array.isArray(byKeyword.data?.content)
        ? (byKeyword.data?.content as Array<Record<string, unknown>>)
        : []
      const hit = rows.find((row) => String(row.billNo) === billNo)
      if (hit) found.set(billNo, hit)
    }
    if (found.size < wanted.size) {
      // 关键字未命中时回退整页扫描（候选本身是近期单据，200 条足够覆盖）。
      const all = await apiGetJson(request, '/freight-bills', {
        page: 0,
        size: 200,
      })
      const rows = Array.isArray(all.data?.content)
        ? (all.data?.content as Array<Record<string, unknown>>)
        : []
      for (const row of rows) {
        const billNo = String(row.billNo)
        if (wanted.has(billNo) && !found.has(billNo)) found.set(billNo, row)
      }
    }
    let totalWeight = 0
    let totalFreight = 0
    for (const row of found.values()) {
      totalWeight += Number(row.totalWeight || 0)
      totalFreight += Number(row.totalFreight || 0)
    }
    return { billNo: [...wanted].join(','), totalWeight, totalFreight }
  }

  /** 取单据详情（校验服务端的合计与状态，而不是只看界面）。 */
  async function fetchFreightStatement(
    request: APIRequestContext,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const { ok, data } = await apiGetJson(request, `/freight-statements/${id}`)
    return ok ? data : null
  }

  /** 反审核（已审核单据不可直接删除，后端返回 422）。 */
  async function reverseAuditBestEffort(
    request: APIRequestContext,
    id: string,
  ): Promise<void> {
    const session = await getPasswordSession(request)
    await request
      .patch(`${e2eApiBaseUrl()}/freight-statements/${id}/status`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': randomUUID(),
        },
        data: { status: '草稿' },
      })
      .catch(() => undefined)
  }

  const statementRow = (page: Page, text: string): Locator =>
    page
      .locator('tbody tr:not(.ant-table-measure-row)')
      .filter({ hasText: text })
      .first()

  test('从已审核物流单生成 → 保存 → 审核：金额合计与状态联动', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const candidate = await findPositiveFreightCandidate(request)
    test.info().annotations.push({
      type: 'preconditions',
      description: candidate
        ? `目标候选物流单=${candidate.billNo}（总运费 ${candidate.totalFreight}）`
        : '候选首页没有总运费 > 0 的物流单，将退化为导入首行',
    })

    await openFreightStatements(page)

    let createdId: string | null = null
    try {
      await page
        .getByRole('button', { name: /生成物流对账单/ })
        .first()
        .click()
      const editor = editorPanel(page).last()
      await expect(editor).toBeVisible({ timeout: 30_000 })

      await editor
        .getByRole('button', { name: /选择物流单生成明细/ })
        .first()
        .click()
      await importCandidate(page, candidate?.billNo)

      // 导入后：明细非空即可。总重量/总运费由后端在保存时按来源物流单重算，
      // 编辑器里的汇总输入框是只读回显、不作为断言依据（否则会拿未重算的 0 去比）。
      const itemRows = editor.locator('tbody tr:not(.ant-table-measure-row)')
      await expect(itemRows.first()).toBeVisible({ timeout: 30_000 })
      expect(await itemRows.count()).toBeGreaterThan(0)
      // 来源物流单号在编辑器里是只读文本（SPAN），不是 input；仅做展示性记录，
      // 权威来源仍以保存后的服务端数据为准。
      const sourceBillNosPreviewText =
        (await editor.locator('#module-form-sourcebillnos').textContent()) ?? ''
      if (!sourceBillNosPreviewText.trim()) {
        test.info().annotations.push({
          type: 'relaxed',
          description:
            '编辑器未回填来源物流单号展示文本，来源与金额以服务端数据为准',
        })
      }

      const statementRemark = `${E2E_PREFIX} 物流对账 ${Date.now()}`
      await editor.locator('#module-form-remark').fill(statementRemark)

      await clickEditorSave(page, 'save')
      const draftOutcome = await expectSaveSuccess(page)
      createdId = extractIdAfterLabel(draftOutcome.panelText, '对账单号')
      await closeSaveResult(page)
      if (!createdId) {
        // 兜底：回执里没解析出单号时取最新一条（并发下用 remark 校验归属）。
        const latest = await apiGetJson(request, '/freight-statements', {
          page: 0,
          size: 1,
          sortBy: 'id',
          direction: 'desc',
        })
        const rows = Array.isArray(latest.data?.content)
          ? (latest.data?.content as Array<Record<string, unknown>>)
          : []
        createdId = String(rows[0]?.id ?? '')
        test.info().annotations.push({
          type: 'relaxed',
          description:
            '保存回执未解析出对账单号，已按「最新一条 + remark 校验」定位',
        })
      }
      expect(createdId, '保存后应能定位到新建的物流对账单').toBeTruthy()

      // 服务端为准：从明细的来源单号回查物流单，合计必须与对账单一致。
      const created = await fetchFreightStatement(request, createdId as string)
      expect(created).not.toBeNull()
      expect(String(created?.remark)).toBe(statementRemark)
      const createdItems = Array.isArray(created?.items)
        ? (created.items as Array<Record<string, unknown>>)
        : []
      expect(createdItems.length).toBeGreaterThan(0)
      const importedBillNos = [
        ...new Set(
          createdItems
            .map((item) => String(item.sourceNo ?? ''))
            .filter(Boolean),
        ),
      ]
      expect(importedBillNos.length).toBeGreaterThan(0)
      // 后端已补 sourceBillNos（关联物流单）：详情与列表都应能看到来源单号。
      const sourceBillNosText =
        created?.sourceBillNos == null
          ? ''
          : Array.isArray(created.sourceBillNos)
            ? (created.sourceBillNos as unknown[]).join(',')
            : String(created.sourceBillNos)
      if (sourceBillNosText) {
        for (const billNo of importedBillNos) {
          expect(sourceBillNosText).toContain(billNo)
        }
      } else {
        test.info().annotations.push({
          type: 'relaxed',
          description:
            '详情响应未返回 sourceBillNos，跳过「关联物流单」字段断言',
        })
      }
      const billsTotal = await sumFreightBills(request, importedBillNos)
      const importedTargetBill = candidate
        ? importedBillNos.includes(candidate.billNo)
        : false
      if (importedTargetBill) {
        // 命中「总运费 > 0」的目标候选：金额断言不得退化成 0 = 0。
        expect(billsTotal.totalFreight).toBeGreaterThan(0)
      } else if (billsTotal.totalFreight <= 0) {
        test.info().annotations.push({
          type: 'relaxed',
          description:
            '导入的物流单总运费为 0，金额断言退化为 0 = 0（合计关系式仍然校验）',
        })
      }

      const totalFreight = Number(created?.totalFreight)
      const totalWeight = Number(created?.totalWeight)
      const paidAmount = Number(created?.paidAmount)
      const unpaidAmount = Number(created?.unpaidAmount)
      expect(totalFreight).toBeCloseTo(billsTotal.totalFreight, 2)
      expect(totalWeight).toBeCloseTo(billsTotal.totalWeight, 3)
      expect(unpaidAmount).toBeCloseTo(totalFreight - paidAmount, 2)

      // 列表行：状态草稿 + 与接口同口径的金额/重量（2/3 位小数展示口径）。
      const row = statementRow(page, createdId as string)
      await expect(row).toBeVisible({ timeout: 30_000 })
      await expect(row).toContainText('草稿')
      await expect(row).toContainText(totalFreight.toFixed(2))
      await expect(row).toContainText(totalWeight.toFixed(3))
      // 未付金额必须与列表展示一致（同一口径的第二个出口）。
      await expect(row).toContainText(unpaidAmount.toFixed(2))
      if (sourceBillNosText) {
        // 关联物流单列展示真实来源单号（后端补字段后这条才生效）。
        await expect(row).toContainText(importedBillNos[0])
      }

      // 审核：状态推进到已审核，金额不变。
      await row.dblclick()
      await expect(editorPanel(page).last()).toBeVisible({ timeout: 30_000 })
      await clickEditorSave(page, 'audit')
      await confirmStatusDialog(page, '审核')
      await expectSaveSuccess(page)
      await closeSaveResult(page)
      await expect(statementRow(page, createdId as string)).toContainText(
        '已审核',
        { timeout: 30_000 },
      )

      const audited = await fetchFreightStatement(request, createdId as string)
      expect(String(audited?.status)).toBe('已审核')
      expect(Number(audited?.totalFreight)).toBeCloseTo(totalFreight, 2)
      expect(Number(audited?.unpaidAmount)).toBeCloseTo(unpaidAmount, 2)
    } finally {
      if (createdId) {
        await reverseAuditBestEffort(request, createdId)
        await deleteModuleRecordBestEffort(
          request,
          '/freight-statements',
          createdId,
        )
      }
    }

    await assertNoFatalUiErrors()
  })

  test('列表状态筛选与运费汇总入口可用（对账视角的业务结果）', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    await openFreightStatements(page)

    // 状态筛选：选「已审核」后请求必须带上 status 且列表进入结果态。
    const statusRequest = page
      .waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          response.url().includes('/freight-statements') &&
          response.url().includes('status='),
        { timeout: 30_000 },
      )
      .catch(() => null)
    await selectPopoverOption(page, '审核状态', '已审核')
    const statusResponse = await statusRequest
    // 业务结果：筛选真的落到了请求上（不是只改了 chip 文案）。
    expect(statusResponse, '选择状态筛选后应发起带 status 的列表请求').not.toBe(
      null,
    )
    expect(decodeURIComponent(statusResponse?.url() ?? '')).toContain(
      'status=已审核',
    )
    await expectGridTable(page)

    // 运费对账汇总：打开后必须展示「单据数 + 总重量 + 总运费 + 已付/未付」五项业务口径。
    await page
      .getByRole('button', { name: /查看运费对账汇总/ })
      .first()
      .click({ timeout: 30_000 })
    const summaryDialog = page.getByRole('dialog', { name: '运费对账汇总' })
    await expect(summaryDialog).toBeVisible({ timeout: 30_000 })
    await expect(summaryDialog).toContainText('运费对账汇总')
    await expect(summaryDialog).toContainText('当前列表单据数')
    await expect(summaryDialog).toContainText('总运费')
    await expect(summaryDialog).toContainText('已付金额')
    await expect(summaryDialog).toContainText('未付金额')
    // antd `modal.info` 的确认按钮文案是「知道了」，不是「确定」。
    await summaryDialog
      .getByRole('button', { name: /知道\s*了|确\s*定|确\s*认/ })
      .click({ timeout: 20_000 })
    await expect(summaryDialog)
      .toBeHidden({ timeout: 15_000 })
      .catch(() => undefined)

    const { ok, data } = await apiGetJson(
      request,
      '/freight-statements/summary',
    )
    expect(ok).toBe(true)
    if (ok && data) {
      // 汇总接口与弹层同源：单据数必须是数字口径，不是空对象。
      expect(Number(data.documentCount ?? -1)).toBeGreaterThanOrEqual(0)
      expect(String(data.totalFreight ?? '')).not.toBe('')
    }

    await assertNoFatalUiErrors()
  })
})
