import { expect } from '@playwright/test'
import { loginAsE2eUser } from '../support/business-e2e'
import { test } from '../support/test'
import { createDemoRecorder } from './_demo-helpers'

/**
 * 「新风格展示」demo：把改造后的界面单独截出来。
 *
 * <p>全站巡检（04）是「逐页看一遍」，双击列表首行时行状态决定进详情还是编辑器，
 * 因此销售订单的新详情页不一定被拍到。这条 demo 负责稳定复现两类新界面：</p>
 * <ol>
 *   <li>销售订单只读详情（顶栏卡 + 四张指标卡 + 业务信息卡 + 明细卡 + 合计行）；</li>
 *   <li>业务单据编辑器（灰底 + 单据信息卡 + 明细卡）。</li>
 * </ol>
 *
 * <p>只截图不改数据；找不到「完成销售」状态的单据时该步失败并记录原因。</p>
 */
const FLOW = 'showcase'

test.describe.configure({ mode: 'serial', retries: 0, timeout: 300_000 })

test('新风格展示：销售订单详情 / 编辑器', async ({ page }) => {
  const demo = await createDemoRecorder(page, FLOW, '新风格展示')
  try {
    await demo.step('01-login', '登录 · 工作台', async () => {
      await loginAsE2eUser(page)
      expect(page.url()).toContain('/dashboard')
      return { note: '已登录 admin_prod' }
    })

    await demo.step('02-sales-order-list', '销售订单列表', async () => {
      await page.goto('/sales-order', { waitUntil: 'domcontentloaded' })
      await page.locator('.ant-table-row').first().waitFor({ timeout: 30_000 })
      return { note: '列表首屏' }
    })

    /*
     * 详情：只读单据（完成销售 / 已审核）双击才进详情；
     * 可编辑行会进编辑器，所以这里按行文本挑一条只读的。
     */
    await demo.step(
      '03-sales-order-detail',
      '销售订单详情（顶栏卡 + 指标卡 + 信息卡 + 明细卡）',
      async () => {
        const rows = page.locator('.ant-table-row')
        const count = await rows.count()
        let target = -1
        for (let i = 0; i < count; i += 1) {
          const text = await rows.nth(i).innerText()
          if (text.includes('完成销售')) {
            target = i
            break
          }
        }
        expect(
          target,
          '需要一条「完成销售」状态的销售订单才能展示只读详情',
        ).toBeGreaterThanOrEqual(0)
        await rows.nth(target).dblclick()
        await page
          .locator('.module-detail-card')
          .first()
          .waitFor({ timeout: 30_000 })
        await expect(page.locator('.module-detail-metrics')).toBeVisible()
        return { note: '双击只读行 → 新风格详情（方案 B）' }
      },
    )

    await demo.step(
      '04-editor-create',
      '业务单据编辑器（灰底 + 单据信息卡 + 明细卡）',
      async () => {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(800)
        await page.getByRole('button', { name: /新增/ }).first().click()
        await page
          .locator('.editor-form-shell')
          .first()
          .waitFor({ timeout: 30_000 })
        return { note: '新增单据编辑器，灰底 + 两张白卡' }
      },
    )
  } finally {
    await demo.flush()
  }
})
