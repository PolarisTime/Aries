import { expect, test } from '@playwright/test'
import { loginAsE2eUser } from './support/business-e2e'

/**
 * 行情同步页重做后的行为回归。
 *
 * 覆盖两件事:
 *  1. 重做前的硬缺陷 —— 页面根不是滚动容器, 底部内容被外层 overflow:hidden 裁掉
 *     且不可达(1280×700 实测内容 853px / 可视 571px);
 *  2. 重做的核心结构 —— 覆盖矩阵按「时段 × 日期」转置为 3 行紧凑带(不再是 30 行
 *     大表 + 卡片内 420px 嵌套滚动), 明细改为右侧抽屉。
 */

/** 低分辨率: 最容易被裁掉的高度。 */
const LOW_VIEWPORT = { width: 1280, height: 700 }

async function gotoMarketSync(page: import('@playwright/test').Page) {
  await page.goto('/market-sync', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.market-sync-page', { timeout: 30_000 })
  await page.waitForSelector('.market-sync-grid', { timeout: 30_000 })
  await page.waitForTimeout(1_000)
}

/** 本地时区的 YYYY-MM-DD。 */
function fmtLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 矩阵窗口内最近的工作日(矩阵只渲染今天往前 30 天, 写死日期会滑出窗口)。 */
function recentWeekday(): string {
  const cursor = new Date()
  cursor.setDate(cursor.getDate() - 1)
  while (cursor.getDay() === 0 || cursor.getDay() === 6) {
    cursor.setDate(cursor.getDate() - 1)
  }
  return fmtLocal(cursor)
}

/**
 * 桩住行情接口, 让「已同步格 → 打开抽屉」可以稳定验证。
 * 开发库里没有行情数据时矩阵全是「缺」, 否则这条用例只能被跳过。
 */
async function stubMarketApis(page: import('@playwright/test').Page) {
  const date = recentWeekday()
  await page.route('**/api/v2.0/steel-quote-calendars**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { quoteDate: date, periods: ['上午'], periodRows: { 上午: 12 } },
      ]),
    }),
  )
  await page.route('**/api/v2.0/steel-quotes**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [
          {
            id: '1',
            quoteDate: date,
            period: '上午',
            factory: '沙钢',
            breed: '螺纹钢',
            material: 'HRB400E',
            spec: '18-25',
            price: 4200,
            changeVal: '+20',
            remark: 'e2e 桩数据',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        hasMore: false,
      }),
    }),
  )
  await page.route('**/api/v2.0/steel-quote-backfills/current**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ running: false }),
    }),
  )
  return date
}

test.describe('行情同步页', () => {
  test('低分辨率下页面可纵向滚动，底部内容可达', async ({ page }) => {
    await page.setViewportSize(LOW_VIEWPORT)
    await loginAsE2eUser(page)
    await gotoMarketSync(page)

    const state = await page.evaluate(() => {
      const root = document.querySelector(
        '.market-sync-page',
      ) as HTMLElement | null
      if (!root) return null
      const cs = getComputedStyle(root)
      return {
        overflowY: cs.overflowY,
        scrollH: root.scrollHeight,
        clientH: root.clientHeight,
        scrollTop: Math.round(root.scrollTop),
      }
    })

    expect(state, '未找到 .market-sync-page').not.toBeNull()
    // 页面根必须是滚动容器(重做前是 overflow: visible, 内容被外层裁掉)
    expect(['auto', 'scroll']).toContain(state?.overflowY)

    // 内容高于可视区时必须能滚到底
    if ((state?.scrollH ?? 0) > (state?.clientH ?? 0) + 1) {
      const maxScroll = await page.evaluate(() => {
        const root = document.querySelector('.market-sync-page') as HTMLElement
        root.scrollTop = root.scrollHeight
        return Math.round(root.scrollTop)
      })
      expect(maxScroll, '页面根无法滚动').toBeGreaterThan(0)

      // 滚到底后, 矩阵卡片底部应进入可视区(重做前它被裁掉)
      const matrixVisible = await page.evaluate(() => {
        const root = document.querySelector('.market-sync-page') as HTMLElement
        const grid = document.querySelector('.market-sync-grid')
        if (!grid) return false
        const r = root.getBoundingClientRect()
        const g = grid.getBoundingClientRect()
        return g.bottom <= r.bottom + 1
      })
      expect(matrixVisible, '滚到底后矩阵仍不可达').toBe(true)
    }
  })

  test('覆盖矩阵是「时段 × 日期」的 3 行紧凑带，无卡片内嵌套滚动', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginAsE2eUser(page)
    await gotoMarketSync(page)

    const shape = await page.evaluate(() => {
      const table = document.querySelector('.market-sync-grid')
      if (!table) return null
      const bodyRows = table.querySelectorAll('tbody tr').length
      const rowHeaders = Array.from(
        table.querySelectorAll('tbody th[scope="row"]'),
      ).map((el) => el.textContent?.trim())
      const colHeaders = table.querySelectorAll('thead th[scope="col"]').length
      const innerScrollable = Array.from(table.querySelectorAll('*')).some(
        (el) => {
          const node = el as HTMLElement
          return (
            node.scrollHeight > node.clientHeight + 1 &&
            ['auto', 'scroll'].includes(getComputedStyle(node).overflowY)
          )
        },
      )
      return { bodyRows, rowHeaders, colHeaders, innerScrollable }
    })

    expect(shape, '未找到矩阵表格').not.toBeNull()
    // 行 = 时段(上午/中午/下午), 不再是 30 行日期
    expect(shape?.bodyRows).toBe(3)
    expect(shape?.rowHeaders).toEqual(['上午', '中午', '下午'])
    // 列 = 时段列 + 近 30 天
    expect(shape?.colHeaders).toBe(31)
    // 矩阵内部不应再有滚动条(否则与外层页面滚动嵌套)
    expect(shape?.innerScrollable).toBe(false)
  })

  test('单元格可访问名唯一，点击已同步格打开明细抽屉', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginAsE2eUser(page)
    const date = await stubMarketApis(page)
    await gotoMarketSync(page)

    const labels = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll('.market-sync-cell[aria-label]'),
      ).map((el) => el.getAttribute('aria-label') ?? ''),
    )
    expect(labels.length).toBeGreaterThan(0)
    // 重做前 30 个单元格都叫「缺」, 读屏无法区分; 现在必须唯一
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels.every((label) => label.length > 0)).toBe(true)
    // 桩数据里的已同步格必须带上行数与日期时段
    expect(
      labels.some(
        (label) =>
          label.includes(date) &&
          label.includes('上午') &&
          label.includes('12 行'),
      ),
    ).toBe(true)

    // 已同步格 → 打开明细抽屉
    const synced = page.locator('button.market-sync-cell.is-synced').first()
    await expect(synced).toHaveCount(1)

    await synced.click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible({ timeout: 10_000 })
    // 抽屉必须有可访问名(来自 title)
    await expect(drawer).toHaveAccessibleName(/行情明细/)

    // Escape 关闭
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden({ timeout: 10_000 })
  })

  test('休市格不是可点击控件', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginAsE2eUser(page)
    await gotoMarketSync(page)

    const offStates = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.market-sync-cell.is-off')).map(
        (el) => ({
          tag: el.tagName.toLowerCase(),
          insideButton: Boolean(el.closest('button')),
          label:
            el.querySelector('.aries-sr-only')?.textContent ??
            el.getAttribute('aria-label') ??
            '',
        }),
      ),
    )
    expect(offStates.length).toBeGreaterThan(0)
    for (const cell of offStates) {
      expect(cell.tag).toBe('span')
      expect(cell.insideButton).toBe(false)
      expect(cell.label).toContain('休市')
    }
  })
})
