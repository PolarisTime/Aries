import { expect, test } from '@playwright/test'
import { loginAsE2eUser } from './support/business-e2e'

/**
 * 报单比价: 低分辨率下必须能向下滚动到底(回归 2026-10-09 缺陷)。
 *
 * 缺陷形态: 页面根不是滚动容器, 外层 .leo-content-inner 为 overflow: hidden,
 * 内容超出可视区时被直接裁掉且无滚动条 —— 表格底部与"新增行"按钮不可达。
 *
 * 本用例在真实浏览器中断言:
 *  1. #price-compare-root 是纵向滚动容器;
 *  2. 内容高于可视区时, 用真实滚轮可以滚到底;
 *  3. 滚到底后表格底部与"新增行"按钮进入可视区。
 * 查询一律基于选择器显式定位, 不依赖 DOM 位置下标。
 */

/** 低分辨率: 短视口最容易触发该缺陷。 */
const VIEWPORTS = [
  { name: '极矮 1280x400', width: 1280, height: 400 },
  { name: '低分辨率 1366x640', width: 1366, height: 640 },
]

type Snapshot = {
  rootFound: boolean
  rootOverflowY: string
  rootScrollH: number
  rootClientH: number
  rootScrollTop: number
  tableBottomVisible: boolean
  addRowVisible: boolean | null
}

async function snapshot(
  page: import('@playwright/test').Page,
): Promise<Snapshot> {
  return page.evaluate((): Snapshot => {
    const root = document.querySelector(
      '#price-compare-root',
    ) as HTMLElement | null
    const table = document.querySelector('.price-compare-table')
    const addRow = document.querySelector(
      '.price-compare-add-row',
    ) as HTMLElement | null

    if (!root) {
      return {
        rootFound: false,
        rootOverflowY: '',
        rootScrollH: 0,
        rootClientH: 0,
        rootScrollTop: 0,
        tableBottomVisible: false,
        addRowVisible: null,
      }
    }

    const rootRect = root.getBoundingClientRect()
    const tableRect = table?.getBoundingClientRect()
    const addRowRect = addRow?.getBoundingClientRect()

    return {
      rootFound: true,
      rootOverflowY: getComputedStyle(root).overflowY,
      rootScrollH: root.scrollHeight,
      rootClientH: root.clientHeight,
      rootScrollTop: Math.round(root.scrollTop),
      tableBottomVisible: tableRect
        ? tableRect.bottom <= rootRect.bottom + 1
        : false,
      addRowVisible: addRowRect
        ? addRowRect.top >= rootRect.top - 1 &&
          addRowRect.bottom <= rootRect.bottom + 1
        : null,
    }
  })
}

/**
 * 用真实滚轮向下滚动到底。
 * 合成滚轮(CDP)单次位移有限且偶发整次被丢弃(尤其在 setViewportSize 之后),
 * 因此容忍若干次"无进展"再判定, 避免把抖动当成缺陷。
 */
async function wheelToBottom(
  page: import('@playwright/test').Page,
  x: number,
  y: number,
  attempts = 12,
) {
  const read = () =>
    page.evaluate(() => {
      const root = document.querySelector(
        '#price-compare-root',
      ) as HTMLElement | null
      if (!root) return { top: 0, max: 0 }
      return {
        top: Math.round(root.scrollTop),
        max: Math.round(root.scrollHeight - root.clientHeight),
      }
    })

  let { top, max } = await read()
  if (max <= 0) return top

  const MAX_IDLE = 3
  let idle = 0
  for (let i = 0; i < attempts && top < max && idle < MAX_IDLE; i++) {
    await page.mouse.move(x, y)
    await page.mouse.wheel(0, 1000)
    await page.waitForTimeout(250)
    const next = await read()
    if (next.top === top) {
      idle += 1
    } else {
      idle = 0
      top = next.top
    }
    max = next.max
  }
  return top
}

/** 注入高内容模拟"多行长表格", 只操作 DOM, 不写后端。 */
async function injectTallContent(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const root = document.querySelector(
      '#price-compare-root',
    ) as HTMLElement | null
    if (!root || document.getElementById('__e2e_tall_spacer')) return
    const spacer = document.createElement('div')
    spacer.id = '__e2e_tall_spacer'
    spacer.style.height = '1600px'
    root.appendChild(spacer)
    root.scrollTop = 0
  })
  await page.waitForTimeout(150)
}

test.describe('报单比价 低分辨率滚动', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name}: 可向下滚动到底且尾部可达`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await loginAsE2eUser(page)
      await page.goto('/price-compare', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('#price-compare-root', { timeout: 30_000 })
      await page.waitForSelector('.price-compare-table', { timeout: 30_000 })
      await page.waitForTimeout(1_000)

      // 1) 结构契约: 页面根必须是纵向滚动容器
      const initial = await snapshot(page)
      expect(initial.rootFound, '未找到 #price-compare-root').toBe(true)
      expect(
        ['auto', 'scroll'],
        `#price-compare-root 的 overflow-y=${initial.rootOverflowY}, 不是滚动容器`,
      ).toContain(initial.rootOverflowY)

      // 2) 真实内容高度: 若超出可视区, 滚到底后尾部必须可达
      if (initial.rootScrollH > initial.rootClientH + 1) {
        await wheelToBottom(page, vp.width / 2, vp.height / 2)
        const scrolled = await snapshot(page)
        expect(
          scrolled.rootScrollTop,
          '滚轮未产生位移(无法向下拖动)',
        ).toBeGreaterThan(0)
        expect(scrolled.tableBottomVisible, '滚到底后表格底部仍不可达').toBe(
          true,
        )
        expect(scrolled.addRowVisible, '滚到底后"新增行"按钮仍不可达').toBe(
          true,
        )
      }

      // 3) 高内容场景: 必须可滚动、滚轮生效、滚到底后尾部可达
      await injectTallContent(page)
      const tallPre = await snapshot(page)
      expect(tallPre.rootScrollH, '注入高内容后仍不可滚动').toBeGreaterThan(
        tallPre.rootClientH + 1,
      )

      const scrolledTop = await wheelToBottom(page, vp.width / 2, vp.height / 2)
      expect(
        scrolledTop,
        '高内容下滚轮未产生位移(无法向下拖动)',
      ).toBeGreaterThan(0)

      const tailVisible = await page.evaluate(() => {
        const root = document.querySelector(
          '#price-compare-root',
        ) as HTMLElement | null
        const spacer = document.getElementById('__e2e_tall_spacer')
        if (!root || !spacer) return false
        return (
          spacer.getBoundingClientRect().bottom <=
          root.getBoundingClientRect().bottom + 1
        )
      })
      expect(tailVisible, '滚到底后尾部内容仍不可达').toBe(true)
    })
  }

  test('常规分辨率下不产生多余滚动条', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await loginAsE2eUser(page)
    await page.goto('/price-compare', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.price-compare-table', { timeout: 30_000 })
    await page.waitForTimeout(1_000)

    const state = await snapshot(page)
    expect(state.rootFound).toBe(true)
    // 内容未溢出时不应出现滚动条(scrollHeight 等于可视高度)
    if (state.rootScrollH <= state.rootClientH + 1) {
      expect(state.rootScrollTop).toBe(0)
    }
    expect(state.tableBottomVisible, '常规分辨率下表格底部应可见').toBe(true)
  })
})
