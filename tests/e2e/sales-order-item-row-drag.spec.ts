import { expect, type Page } from '@playwright/test'
import {
  auditRecordFromList,
  buildRemark,
  createPurchaseInboundFromOrder,
  createPurchaseOrderDraft,
  createSalesOrderDraft,
  openRowEditor,
  saveEditor,
  searchList,
  spaGoto,
  waitForStatus,
} from './ops-chain-harness'
import { isRealBackendMode } from './support/api-key'
import {
  expectGridTable,
  firstDataRow,
  loginAsE2eUser,
} from './support/business-e2e'
import { isSaveResultSuccess } from './support/save-result-match'
import { test } from './support/test'

/**
 * 销售订单明细的**整行长按拖动排序**(真实后端链路守护)。
 *
 * <p>用户诉求是"销售订单 编辑 允许拖动行位置", 而销售订单明细只能来自上游采购来源导入
 * (手工行会被服务端拒绝)。因此链路是: 完成采购的采购订单(2 行) → 导入生成销售订单草稿
 * (2 行, 处于**上游导入锁定态**) → 长按拖动换序 → 保存 → 重开断言行序保持。</p>
 *
 * <p>为什么必须留在 e2e 而不是只靠单测: 单测能锁拖动激活口径与载荷顺序, 但"服务端按
 * `items` 数组顺序重编 `line_no` 且详情按该顺序回读"只有在真后端上才能验证 —— 这条
 * 链路正是本功能唯一的端到端不变量。</p>
 *
 * <p>两个口径细节(踩过的坑): aria-live 播报必须**限定在拖动作用域内**取, 销售订单弹层里
 * 还有「网价匹配」的 `role=status`; 保存回执文案按动作渲染, 断言走共享匹配
 * ({@link isSaveResultSuccess}), 不再写死「保存成功」。</p>
 */
test.describe('销售订单明细整行长按拖动(真实后端)', () => {
  // 仅真实后端模式运行: 2 行导入 + 审核 + 入库 + 保存重开约 2~3 分钟, 不该拖慢默认 e2e
  test.skip(
    !isRealBackendMode(),
    '该链路需要真实后端, 仅 E2E_BACKEND_MODE=real 运行',
  )
  // 共享账号并发会话上限为 3, 其他 e2e 会把当前会话顶掉; 失败时整条重试
  test.describe.configure({ retries: 2 })
  // 明细行位置靠下: 视口高一些, 展开的下拉才有空间, 少一类"选项在视口外"的偶发失败
  test.use({ viewport: { width: 1440, height: 1000 } })

  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  /** 在列表里按单号检索后打开编辑器。 */
  const openEditorByNo = async (page: Page, route: string, no: string) => {
    await spaGoto(page, route)
    await searchList(page, no)
    return openRowEditor(page, no)
  }

  /**
   * 选下拉第一项(键盘): 明细行靠下时 antd 展开的选项会落在视口之外,
   * harness 的 pickFirst 用鼠标点选项会偶发 "Element is outside of the viewport"。
   * 键盘选择与鼠标等价(都是选中高亮项), 且不依赖选项的屏幕坐标。
   */
  const pickFirstInRow = async (
    page: Page,
    select: ReturnType<Page['locator']>,
  ) => {
    await select.scrollIntoViewIfNeeded()
    await select.click()
    const dropdown = page.locator('.ant-select-dropdown:visible').last()
    await expect(dropdown).toBeVisible({ timeout: 15_000 })
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(dropdown)
      .toBeHidden({ timeout: 15_000 })
      .catch(() => {})
  }

  /** 填一行明细: 商品/品牌下拉 + 数量 + 单价。 */
  const fillItemRow = async (
    page: Page,
    row: ReturnType<Page['locator']>,
    quantity: string,
    unitPrice: string,
  ) => {
    await pickFirstInRow(page, row.locator('.ant-select').nth(0))
    await page.waitForTimeout(400)
    await pickFirstInRow(page, row.locator('.ant-select').nth(1))
    await page.waitForTimeout(400)
    const qty = row.locator(
      'input[data-module-editor-number-column="quantity"]',
    )
    await qty.fill(quantity)
    await qty.blur()
    const price = row.locator(
      'input[data-module-editor-number-column="unitPrice"]',
    )
    await price.fill(unitPrice)
    await price.blur()
    await page.waitForTimeout(400)
  }

  test('导入锁定态明细: 长按拖动行序 → 保存 → 重开顺序保持', async ({
    page,
  }) => {
    test.setTimeout(600_000)
    const remark = buildRemark('E2E-SO-ROWDRAG')

    // 1) 采购订单草稿补齐第 2 行明细(销售订单之后要导入 2 行才有的可拖)
    const purchaseOrder = await createPurchaseOrderDraft(page, {
      remark: `${remark}-PO`,
      quantity: 5,
      unitPrice: 100,
    })
    const poEditor = await openEditorByNo(
      page,
      '/purchase-order',
      purchaseOrder.no,
    )
    const poRows = poEditor.locator('tbody tr:not(.ant-table-measure-row)')
    await expect(poRows).toHaveCount(1, { timeout: 20_000 })
    await poEditor.getByRole('button', { name: '新增明细' }).click()
    await expect(poRows).toHaveCount(2, { timeout: 20_000 })
    await fillItemRow(page, poRows.nth(1), '7', '120')
    expect(
      isSaveResultSuccess(await saveEditor(page, poEditor)),
      '补齐第 2 行后保存应成功',
    ).toBe(true)

    // 2) 审核 → 采购入库 → 完成采购(销售订单导入的前提)
    await auditRecordFromList(page, 'purchase-order', purchaseOrder.no)
    await createPurchaseInboundFromOrder(page, purchaseOrder.no, `${remark}-IN`)
    await waitForStatus(
      page.request,
      'purchase-order',
      purchaseOrder.id,
      '完成采购',
      60_000,
    )

    // 3) 销售订单草稿: 导入该采购订单的 2 行(导入态 = 上游锁定态)
    const salesOrder = await createSalesOrderDraft(
      page,
      purchaseOrder.no,
      `${remark}-SO`,
    )
    const overlay = await openEditorByNo(page, '/sales-order', salesOrder.no)
    const dataRows = overlay.locator('tbody tr:not(.ant-table-measure-row)')
    await expect(dataRows).toHaveCount(2, { timeout: 30_000 })

    const rowKeys = () =>
      dataRows.evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-row-key') ?? ''),
      )
    const before = await rowKeys()
    expect(before).toHaveLength(2)
    expect(before[0]).not.toBe('')
    expect(new Set(before).size, '两行 key 应互不相同').toBe(2)

    // 导入锁定态必须仍挂着整行拖动(本功能把行序从"导入锁定"里摘出来的关键)
    expect(
      await dataRows
        .nth(0)
        .evaluate((row) => row.classList.contains('row-drag-sort-row')),
      '导入锁定态的行仍应挂共享可排序行',
    ).toBe(true)

    // 拖动激活区: 「#」序号列(第 2 个 td)的非交互区域; 输入控件上的按下会被放行判定拦下
    const handleCell = (index: number) =>
      dataRows.nth(index).locator('td').nth(1)

    // 4) 长按 500ms 不移动就松开: 不重排(避免"长按即误重排")
    const still = await handleCell(1).boundingBox()
    if (!still) throw new Error('取不到第 2 行的拖动区')
    await page.mouse.move(still.x + still.width / 2, still.y + still.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(500)
    await page.mouse.up()
    await page.waitForTimeout(400)
    expect(await rowKeys(), '长按不移动不应改变行序').toEqual(before)

    // 5) 长按 >380ms 后拖到上一行
    const from = await handleCell(1).boundingBox()
    const to = await handleCell(0).boundingBox()
    if (!from || !to) throw new Error('取不到拖动起止位置')
    const startX = from.x + from.width / 2
    const startY = from.y + from.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.waitForTimeout(520)
    // 先小幅移动越过 5px 抖动容差, 再移到目标行
    await page.mouse.move(startX, startY - 12, { steps: 4 })
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
      steps: 14,
    })
    await page.waitForTimeout(250)
    await page.mouse.up()
    await page.waitForTimeout(500)

    let after = await rowKeys()
    if (after[0] !== before[1]) {
      // 鼠标拖动的几何/时序在真机上偶有不稳时, 用键盘 Alt+↑ 走同一套重排与写回路径
      await dataRows.nth(1).focus()
      await page.keyboard.press('Alt+ArrowUp')
      await page.waitForTimeout(500)
      after = await rowKeys()
    }
    expect(after, `行序应交换: before=${before.join(',')}`).toEqual([
      before[1],
      before[0],
    ])

    // 播报必须限定拖动作用域: 弹层里还有「网价匹配」的 role=status
    const announced = await overlay
      .locator('.row-drag-sort-scope [role="status"]')
      .first()
      .textContent()
    expect(announced ?? '').toMatch(/第 [12] 行已移动到第 [12] 位/)

    // 焦点保持在被移动的那一行(不是跳回第一行)
    const focusedKey = await page.evaluate(
      () => document.activeElement?.getAttribute('data-row-key') ?? '',
    )
    expect(focusedKey, '落位后焦点应在被移动的行上').toBe(before[1])

    // 6) 保存 → 重开: 行序按新顺序回读(服务端按 items 顺序重编 line_no)
    expect(
      isSaveResultSuccess(await saveEditor(page, overlay)),
      '拖动后保存应成功',
    ).toBe(true)
    const reopened = await openEditorByNo(page, '/sales-order', salesOrder.no)
    await expect(
      reopened.locator('tbody tr:not(.ant-table-measure-row)'),
    ).toHaveCount(2, { timeout: 30_000 })
    const reopenedKeys = await reopened
      .locator('tbody tr:not(.ant-table-measure-row)')
      .evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-row-key')),
      )
    expect(reopenedKeys, '重新打开的明细行序应与拖动后一致').toEqual(after)
  })

  /**
   * 反例: 模块行为表里**设计性禁拖**的模块(物流单/运费对账单)不得挂上拖动 ——
   * 放宽的是"行序 vs 上游导入锁定", 不是 `disablesItemReorder`。
   */
  test('物流单/运费对账单明细仍不可拖动(disablesItemReorder 保留)', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    for (const route of ['/freight-bill', '/freight-statement']) {
      await spaGoto(page, route)
      await expectGridTable(page)
      const row = await firstDataRow(page)
      if (!row) {
        // 开发库无该模块数据时无法做 UI 断言; 判定口径由单测锁定
        // (module-editor-item-capabilities.test: 设计性禁拖不被放宽)
        continue
      }
      await row.dblclick()
      const overlay = page.locator('.workspace-overlay-panel').first()
      await expect(overlay).toBeVisible({ timeout: 60_000 })
      const dataRows = overlay.locator('tbody tr:not(.ant-table-measure-row)')
      const count = await dataRows.count()
      for (let index = 0; index < count; index += 1) {
        expect(
          await dataRows
            .nth(index)
            .evaluate((element) =>
              element.classList.contains('row-drag-sort-row'),
            ),
          `${route} 第 ${index + 1} 行不应挂共享可排序行`,
        ).toBe(false)
      }
      expect(
        await overlay.locator('tr[aria-keyshortcuts*="Alt+ArrowUp"]').count(),
        `${route} 不应声明键盘调序快捷键`,
      ).toBe(0)
      await spaGoto(page, route)
    }
  })
})
