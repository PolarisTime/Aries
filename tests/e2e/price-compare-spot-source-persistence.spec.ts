import { expect, test } from '@playwright/test'
import {
  buildAuthorizationHeaders,
  e2eApiUrl,
  getPasswordSession,
} from './support/api-key'
import { gotoRoute, loginAsE2eUser } from './support/business-e2e'

/**
 * 现货价「按抗震牌号代取」的**持久化闭环** e2e（WIP：等工作区干净后再跑）。
 *
 * <p>依赖 `abea28c5`：`buildItemPayload` 必须把 `spotSourceMaterial` 随保存下发。
 * 在那之前，带价在内存生效、保存也成功，但服务端只存到 null，重开后角标必然消失。</p>
 *
 * <h3>为什么不能用「第一行带行级开关的行」定位</h3>
 * <ul>
 *   <li>页签恢复后激活批次不可控；多页签 keep-alive 下 DOM 里同时存在多个 SheetPanel，
 *       切走的面板仍在文档里。所以所有查询都带 `:visible`（或 getByRole 默认排除隐藏）
 *       再 `.first()`。实测踩过：命中的是后台面板里 disabled 的按钮，点了既没有请求
 *       也没有提示，看起来像"功能没生效"。</li>
 *   <li>sheetId 一律从 `POST /quote-sheets/{id}/edit-locks` 抓，作为断言基准。</li>
 * </ul>
 *
 * <h3>阳性对照必须自己立起来</h3>
 * <p>带价在 `filled === 0` 时会 `message.info(...)` 后提前 return，**不会**走到
 * `patchSheet`；此时"没有保存请求"是假阴性（排查时踩过两次）。断言顺序：</p>
 * <ol>
 *   <li>`waitForResponse(/supplier-price-lists/lowest-quotes/)` —— 证明点击真的触发了取价；</li>
 *   <li>轮询目标格的值变成种子价 —— 证明 `filled > 0`（比 toast 可靠，不受提示时机影响）；</li>
 *   <li>再断言保存载荷与重开后的角标。</li>
 * </ol>
 *
 * <h3>种子形态必须与行完全一致</h3>
 * <p>`productKeyOf = 类别|材质|规格|定尺`。该行是 `盘螺 | HRB400 | 8 | '-'`，
 * 所以代取条目要写 `盘螺 / HRB400E / 8 / '-'`（写 `9米` 或 `''` 都不命中，也就不会代取）。</p>
 *
 * <h3>不要在被并发编辑的工作区里跑</h3>
 * <p>Vite HMR 每次热更都会打断 Playwright 的页面上下文（实测报错
 * `Execution context was destroyed, most likely because of a navigation`），
 * 于是"没有角标 / 按钮 disabled / toast 没出现"全部不可信。跑之前确认 `git status` 干净。</p>
 */
const SUPPLIER_ID = '333229108731322368'
/** 该供应商简称，出现在角标 aria-label「来源 X」里，用于确认命中的是我们造的种子。 */
const SUPPLIER_SHORT_NAME = '铁都'
const BRAND = '中天'
const SEED_PRICE = 3420
const SEED_CATEGORY = '盘螺'
const SEED_SPEC = 8
const SEED_LENGTH = '-'

test('现货代取来源: 保存 → 重开 → 角标仍在(持久化闭环)', async ({
  page,
  request,
}) => {
  test.setTimeout(300_000)

  const session = await getPasswordSession(request)
  const auth = buildAuthorizationHeaders(session.accessToken)
  const writeHeaders = () => ({
    ...auth,
    'X-Idempotency-Key': crypto.randomUUID(),
  })

  // ---- 种子：中天 / 浙江铁都 / 盘螺 HRB400E 8 '-' ----
  const createRes = await request.post(e2eApiUrl('supplier-price-lists'), {
    headers: writeHeaders(),
    data: { brandName: BRAND, supplierId: SUPPLIER_ID, quotedOn: '2026-10-23' },
  })
  expect(createRes.status(), '创建供应商价格表').toBe(201)
  const created = await createRes.json()
  const listId = String(created.listId)
  const seedRes = await request.put(
    e2eApiUrl(`supplier-price-lists/${listId}/items`),
    {
      headers: writeHeaders(),
      data: {
        expectedVersion: created.version ?? 0,
        items: [
          {
            category: SEED_CATEGORY,
            material: 'HRB400E',
            spec: SEED_SPEC,
            length: SEED_LENGTH,
            price: SEED_PRICE,
          },
        ],
      },
    },
  )
  expect(seedRes.status(), '写入价格表条目').toBe(200)

  let activeSheetId = ''
  const savePayloads: string[] = []
  page.on('request', (req) => {
    const url = req.url()
    const method = req.method()
    if (method === 'POST' && /\/quote-sheets\/\d+\/edit-locks$/.test(url)) {
      const match = /\/quote-sheets\/(\d+)\/edit-locks$/.exec(url)
      if (match) activeSheetId = match[1]
    }
    if (
      method === 'PUT' &&
      /\/quote-sheets\/\d+\/items\/\d+$/.test(url) &&
      !url.includes('/src/')
    ) {
      savePayloads.push(req.postData() || '')
    }
  })

  let unlockedBySpec = false
  let targetSpot: ReturnType<typeof page.locator> | undefined

  try {
    await loginAsE2eUser(page)
    await gotoRoute(page, '/price-compare')
    await page.waitForSelector('#price-compare-root, .price-compare-table', {
      timeout: 90_000,
    })
    await page.waitForTimeout(3000)

    // ---- 只认可见元素：后台批次面板仍在 DOM 里，不能命中它们 ----
    const switches = page.locator('.price-compare-hrb400e-switch:visible')
    await expect(
      switches.first(),
      '当前批次应有 HRB400 行（行级开关可见）',
    ).toBeVisible({ timeout: 30_000 })

    // ---- 解锁「规格和数量」（锁着时行级操作与带价都会被拦） ----
    const locked = await switches
      .first()
      .evaluate((el) => el.className.includes('disabled'))
    if (locked) {
      await page
        .locator('button:visible')
        .filter({ hasText: /解锁规格和数量/ })
        .first()
        .click()
      unlockedBySpec = true
      await page.waitForTimeout(1500)
    }
    expect(activeSheetId, '应从 edit-locks 请求拿到真实 sheetId').not.toBe('')

    // ---- 目标行 = 可见的 HRB400 行（第一行），锁定中天格的现货输入 ----
    const row = page
      .locator('.ant-table-row:visible')
      .filter({ has: page.locator('.price-compare-hrb400e-switch') })
      .first()
    targetSpot = row.locator('input[data-spot^="中天:"]').first()
    await expect(targetSpot).toBeVisible({ timeout: 30_000 })

    // 上一轮可能已写过值：先清空，让「只填空格子」的语义能生效
    if ((await targetSpot.inputValue()) !== '') {
      await targetSpot.fill('')
      await targetSpot.blur()
      await page.waitForTimeout(4000)
    }

    // ---- 带价：阳性对照 = 请求确实发出 + 目标格真的被填成种子价 ----
    savePayloads.length = 0
    const fillButton = page
      .locator('button:visible')
      .filter({ hasText: /从价格表带价/ })
      .first()
    await expect(fillButton, '带价按钮应可用').toBeEnabled()
    const [lowestResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/supplier-price-lists/lowest-quotes') &&
          res.status() === 200,
        { timeout: 30_000 },
      ),
      fillButton.click(),
    ])
    expect(lowestResponse.ok(), '取价接口应成功').toBe(true)

    // filled > 0 的直接证据（比 toast 可靠：不受提示时机与 HMR 影响）
    await expect
      .poll(async () => (await targetSpot.inputValue()).trim(), {
        timeout: 30_000,
        message: '带价后目标格应等于种子价（阳性对照）',
      })
      .toBe(String(SEED_PRICE))

    // 角标必须来自**我们造的种子**（来源 铁都），排除库里既有价格表的干扰
    const ourBadge = row.locator(
      `.price-compare-fallback-badge[aria-label*="${SUPPLIER_SHORT_NAME}"]`,
    )
    await expect
      .poll(() => ourBadge.count(), {
        timeout: 30_000,
        message: '带价后应出现指向本测试供应商的角标',
      })
      .toBeGreaterThan(0)
    const badgeLabel = await ourBadge.first().getAttribute('aria-label')

    // ---- 保存：必须发出 item 级 PUT，且载荷含来源材质 ----
    await expect
      .poll(() => savePayloads.length, {
        timeout: 30_000,
        message: '带价后应产生行级保存请求',
      })
      .toBeGreaterThan(0)
    const withSource = savePayloads.find((body) =>
      body.includes('"sourceMaterial":"HRB400E"'),
    )
    expect(
      withSource,
      '保存载荷必须携带 sourceMaterial（写入口径；响应才叫 spotSourceMaterial）',
    ).toBeTruthy()
    expect(withSource).toContain(`"spotPrice":${SEED_PRICE}`)

    await page.waitForTimeout(2500)

    // ---- 重开：整页刷新，数据只能来自服务端 ----
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#price-compare-root, .price-compare-table', {
      timeout: 90_000,
    })
    await page.waitForTimeout(5000)

    const reloadedRow = page
      .locator('.ant-table-row:visible')
      .filter({ has: page.locator('.price-compare-hrb400e-switch') })
      .first()
    const reloadedBadge = reloadedRow.locator(
      `.price-compare-fallback-badge[aria-label*="${SUPPLIER_SHORT_NAME}"]`,
    )
    await expect
      .poll(() => reloadedBadge.count(), {
        timeout: 40_000,
        message: '刷新后角标必须仍在（来源已落库）',
      })
      .toBeGreaterThan(0)

    // ---- 数据层双断言：服务端确实回了这个来源 ----
    const sheetsRes = await request.get(
      e2eApiUrl('quote-sheets', '?page=0&size=200'),
      { headers: auth },
    )
    expect(sheetsRes.status()).toBe(200)
    const sheetsBody = await sheetsRes.text()
    expect(sheetsBody).toContain('"spotSourceMaterial":"HRB400E"')
    expect(sheetsBody).toContain(`"spotPrice":${SEED_PRICE}`)

    console.log(
      'PERSIST_EVIDENCE=' +
        JSON.stringify({
          activeSheetId,
          badgeLabel,
          savePayloadCount: savePayloads.length,
          seededListId: listId,
        }),
    )
  } finally {
    // 清理 1：删掉本次造的价格表
    await request.delete(e2eApiUrl(`supplier-price-lists/${listId}`), {
      headers: writeHeaders(),
    })
    // 清理 2：复原「规格和数量」锁（本 spec 解锁就必须自己锁回去）
    if (unlockedBySpec) {
      const relock = page
        .locator('button:visible')
        .filter({ hasNotText: /解锁/ })
        .filter({ hasText: /规格和数量/ })
      if (await relock.count()) {
        await relock.first().click()
        await page.waitForTimeout(800)
      }
    }
    // 清理 3（尽力而为）：把我们写进单据的那格价格清空，不留测试数据
    try {
      if (targetSpot && (await targetSpot.count())) {
        await targetSpot.fill('')
        await targetSpot.blur()
        await page.waitForTimeout(3000)
      }
    } catch {
      // 页面已刷新/卸载时忽略：清理不该掩盖真正的断言失败
    }
  }
})
