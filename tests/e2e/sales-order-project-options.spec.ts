import { expect } from '@playwright/test'
import { gotoRoute, loginAsE2eUser } from './support/business-e2e'
import { test } from './support/test'

/**
 * 销售订单「客户 → 项目」下拉的端到端回归。
 *
 * <p>覆盖过的真实故障：主数据需求判定靠函数引用相等，打包后静默失效 ⇒ 选中客户后
 * `/projects/options` 请求根本不发，项目下拉恒为「暂无数据」，且前后端都没有任何报错。</p>
 *
 * <p>因此这里同时断言两件事：接口确实被调用（且带 customerId），以及下拉里真的有项目选项。</p>
 */

/** 开发库里必定存在项目的客户，用于稳定复现「项目下拉应有数据」。 */
const CUSTOMER_KEYWORD = '浙江申源'

test.describe('销售订单 客户→项目 下拉', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2eUser(page)
  })

  test('选中客户后发起 /projects/options 且项目下拉有可选项', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await gotoRoute(page, '/sales-order')
    await page
      .getByRole('button', { name: /新\s*增|新\s*建/ })
      .first()
      .click()

    const overlay = page.locator('.workspace-overlay-panel:visible').last()
    await expect(overlay).toBeVisible({ timeout: 30_000 })

    const formItemSelect = (label: string) =>
      overlay
        .locator('.ant-form-item')
        .filter({ hasText: label })
        .locator('.ant-select')
        .first()

    const customerSelect = formItemSelect('客户名称')
    const projectSelect = formItemSelect('项目名称')
    await expect(customerSelect).toBeVisible({ timeout: 15_000 })

    const optionsRequest = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/projects/options'),
      { timeout: 30_000 },
    )

    const apiLog: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/v2.0/')) {
        apiLog.push(
          `${request.method()} ${new URL(request.url()).pathname}${new URL(request.url()).search}`,
        )
      }
    })

    await customerSelect.click()
    const customerSearch = customerSelect.locator('input').first()
    await customerSearch.fill(CUSTOMER_KEYWORD)
    const customerOption = page
      .locator('.ant-select-dropdown:visible .ant-select-item-option')
      .filter({ hasText: CUSTOMER_KEYWORD })
      .first()
    await expect(customerOption).toBeVisible({ timeout: 15_000 })
    await customerOption.click()
    await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0, {
      timeout: 10_000,
    })

    const optionsResponse = await optionsRequest.catch((error: unknown) => {
      throw new Error(
        `未观察到 /projects/options 请求；已发出的接口调用：\n${apiLog.join('\n')}\n${String(error)}`,
      )
    })
    expect(optionsResponse.ok()).toBe(true)
    expect(optionsResponse.url()).toContain('customerId=')

    // 关键断言：项目下拉必须出现真实选项（故障时这里是「暂无数据」且请求从未发出）。
    await projectSelect.click()
    const projectOption = page
      .locator('.ant-select-dropdown:visible .ant-select-item-option')
      .first()
    await expect(projectOption).toBeVisible({ timeout: 15_000 })
    await page.keyboard.press('Escape')

    await assertNoFatalUiErrors()
  })
})
