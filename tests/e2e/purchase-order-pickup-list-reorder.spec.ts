import { expect, type Page } from '@playwright/test'
import {
  buildRemark,
  createPurchaseOrderDraft,
  saveEditor,
  searchList,
  spaGoto,
} from './ops-chain-harness'
import { isRealBackendMode } from './support/api-key'
import { loginAsE2eUser } from './support/business-e2e'
import { isSaveResultSuccess } from './support/save-result-match'
import { test } from './support/test'

/**
 * 提货清单弹层的**非拖动重排替代**(WCAG 2.2 SC 2.5.7)真实后端链路守护。
 *
 * <p>单测能锁住"按钮渲染了、点击回调了、播报文案对了", 但证明不了三件只有真后端才能验证的事:</p>
 * <ol>
 *   <li>真实数据下明细行是**多行**的(单测用的是构造数据), 边界项(首/末)的 `aria-disabled`
 *       与可点击项的重排都成立;</li>
 *   <li>点击/回车走的重排与拖动落位是同一份草稿写回, 重排后**汇总与分组内容跟着变**;</li>
 *   <li>读屏说明是中文覆写版(不是 dnd-kit 的英文默认文案), 且可访问名里只有物料名与序号,
 *       没有 19 位雪花 id。</li>
 * </ol>
 *
 * <p>为什么用提货清单而不是打印作业: 提货清单弹层同时含**分组头**与**明细行**两类可排序
 * 表面, 且入口只要求"采购订单有明细"(见 PurchaseOrderPickupListService), 不需要审核、
 * 入库与打印模板, 链路最短而覆盖面最大。</p>
 *
 * <p>口径细节(踩过的坑): 行序权威是 `groups[].itemIds`, 拖动/按钮/键盘都走同一份
 * `reorderGroupedItems`; 因此断言直接读 `<tr data-row-key>` 顺序即可, 不需要点保存
 * (提货清单是"预览草稿", 没有独立的保存动作)。</p>
 */
test.describe('提货清单明细/分组非拖动重排(真实后端)', () => {
  // 仅真实后端模式运行: 需要采购订单 + 明细, 默认 e2e 不该被它拖慢
  test.skip(
    !isRealBackendMode(),
    '该链路需要真实后端, 仅 E2E_BACKEND_MODE=real 运行',
  )
  // 共享账号并发会话上限为 3, 其他 e2e 会把当前会话顶掉; 失败时整条重试
  test.describe.configure({ retries: 2 })
  test.use({ viewport: { width: 1600, height: 1000 } })

  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  /**
   * 可见列表行: 应用里同时存在多个列表容器(工作台隐藏面板、表头分体表), 不限定可见性时
   * `tr` 的第一个匹配可能是隐藏行 —— 实测 `toBeVisible()` 会 30s 超时。
   */
  const visibleListRow = (page: Page, keyword: string) =>
    page
      .locator('tbody tr.ant-table-row:visible')
      .filter({ hasText: keyword })
      .first()

  /** 在采购订单列表按单号检索后打开编辑器(行定位限定可见行)。 */
  const openEditorByNo = async (page: Page, no: string) => {
    await spaGoto(page, '/purchase-order')
    await searchList(page, no)
    const row = visibleListRow(page, no)
    await expect(row).toBeVisible({ timeout: 30_000 })
    await row.dblclick()
    const overlay = page.locator('.workspace-overlay-panel').first()
    await expect(overlay).toBeVisible({ timeout: 60_000 })
    return overlay
  }

  /** 选下拉第一项(键盘): 明细行靠下时 antd 展开的选项可能落在视口之外。 */
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

  /** 按钮可访问名(上移/下移)按行名定位: 不按下标定位, 排版调整后不会静默选错行。 */
  const moveButton = (
    scope: ReturnType<Page['locator']>,
    label: '上移' | '下移',
    nameFragment: string,
  ) =>
    scope
      .getByRole('button', { name: new RegExp(`^${label} .*${nameFragment}`) })
      .first()

  test('单指针与纯键盘各完成一次重排, 读屏说明为中文且不含雪花 id', async ({
    page,
  }) => {
    test.setTimeout(600_000)
    const remark = buildRemark('E2E-PICKUP-REORDER')

    // 1) 采购订单: 1 行草稿 + 补 1 行, 共 2 行明细(提货清单才有可换序的两行)
    const order = await createPurchaseOrderDraft(page, {
      remark,
      quantity: 5,
      unitPrice: 100,
    })
    const editor = await openEditorByNo(page, order.no)
    const editorRows = editor.locator('tbody tr.ant-table-row:visible')
    await expect(editorRows).toHaveCount(1, { timeout: 20_000 })
    await editor.getByRole('button', { name: '新增明细' }).click()
    await expect(editorRows).toHaveCount(2, { timeout: 20_000 })
    const secondRow = editorRows.nth(1)
    await pickFirstInRow(page, secondRow.locator('.ant-select').nth(0))
    await page.waitForTimeout(400)
    await pickFirstInRow(page, secondRow.locator('.ant-select').nth(1))
    await page.waitForTimeout(400)
    const qty = secondRow.locator(
      'input[data-module-editor-number-column="quantity"]',
    )
    await qty.fill('7')
    await qty.blur()
    const price = secondRow.locator(
      'input[data-module-editor-number-column="unitPrice"]',
    )
    await price.fill('120')
    await price.blur()
    await page.waitForTimeout(400)
    expect(
      isSaveResultSuccess(await saveEditor(page, editor)),
      '补齐第 2 行明细后保存应成功',
    ).toBe(true)

    // 2) 列表勾选该采购订单 → 打开提货清单弹层
    await spaGoto(page, '/purchase-order')
    await searchList(page, order.no)
    const listRow = visibleListRow(page, order.no)
    await expect(listRow).toBeVisible({ timeout: 30_000 })
    await listRow.locator('.ant-checkbox-input').check({ force: true })
    const openPickup = page.getByRole('button', { name: /查看提货清单/ })
    await expect(openPickup).toBeVisible({ timeout: 20_000 })
    await openPickup.click()

    const overlay = page.locator('.workspace-overlay-panel').last()
    await expect(overlay).toBeVisible({ timeout: 60_000 })
    const dataRows = overlay.locator(
      '.purchase-pickup-list-items tbody tr.ant-table-row',
    )
    await expect(dataRows).toHaveCount(2, { timeout: 60_000 })

    const rowKeys = () =>
      dataRows.evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-row-key') ?? ''),
      )
    const before = await rowKeys()
    expect(before).toHaveLength(2)
    expect(new Set(before).size, '两行 key 应互不相同').toBe(2)
    expect(before[0]).not.toBe('')

    // 3) 读屏说明必须是中文覆写版, 不能是 dnd-kit 的英文默认文案
    const overlayText = (await overlay.textContent()) ?? ''
    expect(overlayText).toContain('拾起')
    expect(overlayText).toContain('取消')
    expect(overlayText).not.toContain('To pick up a draggable item')

    // 4) 可访问名: 物料名 + 序号, 不含 19 位雪花 id
    const firstDown = moveButton(dataRows.nth(0), '下移', '')
    await expect(firstDown).toBeVisible()
    const firstDownLabel = (await firstDown.getAttribute('aria-label')) ?? ''
    expect(firstDownLabel).toMatch(/^下移 /)
    expect(firstDownLabel).not.toMatch(/\d{15,}/)

    // 5) 边界: 首行「上移」aria-disabled 且仍可聚焦(WCAG 2.5.7 的边界表达)
    const firstUp = moveButton(dataRows.nth(0), '上移', '')
    await expect(firstUp).toHaveAttribute('aria-disabled', 'true')
    await firstUp.focus()
    await expect(firstUp).toBeFocused()

    // 6) 仅单指针: 点第 2 行的「上移」完成一次重排(全程不按下、不拖动)
    await moveButton(dataRows.nth(1), '上移', '').click()
    await expect
      .poll(rowKeys, { message: '点击上移后两行应交换', timeout: 15_000 })
      .toEqual([before[1], before[0]])
    const afterClick = await rowKeys()

    // 7) 仅键盘: 聚焦第 1 行(现为原第 2 行)的「下移」按钮按回车, 换回原顺序
    const downAfterClick = moveButton(dataRows.nth(0), '下移', '')
    await downAfterClick.focus()
    await expect(downAfterClick).toBeFocused()
    await page.keyboard.press('Enter')
    await expect
      .poll(rowKeys, { message: '回车下移后应换回原顺序', timeout: 15_000 })
      .toEqual([afterClick[1], afterClick[0]])
    expect(await rowKeys()).toEqual(before)

    // 8) 分组头也有可点击的上移/下移(分组排序同样是拖动功能, 需要非拖动替代)
    const groupControls = overlay.locator(
      '.purchase-pickup-list-group-controls',
    )
    await expect(
      groupControls.first().getByRole('button', { name: /^上移 / }),
    ).toBeVisible()
    await expect(
      groupControls.first().getByRole('button', { name: /^下移 / }),
    ).toBeVisible()
    // 只有一个分组时, 分组上移/下移都按边界 aria-disabled
    await expect(
      groupControls.first().getByRole('button', { name: /^上移 / }),
    ).toHaveAttribute('aria-disabled', 'true')
    await expect(
      groupControls.first().getByRole('button', { name: /^下移 / }),
    ).toHaveAttribute('aria-disabled', 'true')
  })
})
