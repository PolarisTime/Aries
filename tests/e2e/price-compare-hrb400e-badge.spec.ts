import { expect, test } from '@playwright/test'
import { gotoRoute, loginAsE2eUser } from './support/business-e2e'

/**
 * 报单比价：现货价「按替代牌号代取」的 E 角标。
 *
 * <p>手工路径：项目已开 hrb400e_fallback（348871385747038208）→ 行级开关 → 填现货价
 * → 该格出现 E 角标，且角标自带可读文本（WCAG 1.4.1，不只靠颜色）。</p>
 *
 * <p>判据唯一出口是 core.resolveSpotSourceMaterial；这里断言的是**渲染结果**，
 * 与单测（判据层）互补。</p>
 */
test('手工路径: 行级开关 + 填价 → 出现 E 角标且可访问名含材质', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await loginAsE2eUser(page)
  await gotoRoute(page, '/price-compare')
  await page.waitForSelector('#price-compare-root, .price-compare-table', {
    timeout: 90_000,
  })
  await page.waitForTimeout(3000)

  // 该页面若未选中项目/批次，先选第一个含行级开关的批次
  const switches = page.locator('.price-compare-hrb400e-switch')
  const switchCount = await switches.count()
  expect(switchCount, '项目 348871385747038208 下应存在 HRB400 行（行级开关可见）').toBeGreaterThan(0)

  // 该批次可能开了「规格和数量」锁 → 行级开关(沿用 selectDisabled)会 disabled。
  // 这一步必须是**可重复**的：别人/CI 跑不能依赖"上一次手工点过解锁"。
  // 结束时会恢复上锁(见 finally)，不把库留在解锁态。
  const unlockBtn = page.getByRole('button', { name: /解锁规格和数量/ })
  // 注意不要加 ^ 锚定：按钮的可访问名含前置图标文本（实测 labels 为「锁定规格和数量」
  // 但按 name 精确开头匹配取不到），用 /规格和数量/ 命中即可。
  // 必须排除「解锁…」：两者都含「规格和数量」，不排除会在 finally 里又解一次锁。
  const relockBtn = page.getByRole('button', {
    name: /^(?!解锁).*规格和数量/,
  })
  let unlockedBySpec = false
  const firstSwitch = page.locator('.price-compare-hrb400e-switch').first()
  const isDisabled = await firstSwitch.evaluate(
    (el) => el.className.includes('disabled'),
  )
  if (isDisabled) {
    await unlockBtn.first().click()
    unlockedBySpec = true
    await page.waitForTimeout(1500)
  }

  await page.screenshot({ path: '.tmp-browser/hr-badge-0-before.png' })

  const row = page.locator('.ant-table-row').filter({ has: switches.first() })
  const rowSwitch = row.locator('.price-compare-hrb400e-switch').first()
  const badgeInRow = row.locator('.price-compare-fallback-badge')
  const beforeBadges = await badgeInRow.count()

  // 1) 打开行级开关
  await rowSwitch.check({ force: true })
  // 2) 在该行第一个现货格填价（代取判据要求格子有价）
  const spot = row.locator('input[data-spot]').first()
  await spot.fill('3400')
  await spot.blur()
  await page.waitForTimeout(1500)

  await page.screenshot({ path: '.tmp-browser/hr-badge-1-after.png' })

  try {
    // 3) 断言角标出现，且 aria-label 含材质（材质从角标自身读出比对，不硬编码）
    const badge = row.locator('.price-compare-fallback-badge').first()
    await expect(badge).toBeVisible({ timeout: 15_000 })
    const label = await badge.getAttribute('aria-label')
    expect(label, '角标必须有可读文本(WCAG 1.4.1)').toBeTruthy()
    expect(label).toContain('HRB400E')
    expect(await badge.getAttribute('role')).toBe('img')

    console.log(
      'BADGE_EVIDENCE=' +
        JSON.stringify({
          switchCount,
          beforeBadges,
          badgeLabel: label,
          unlockedBySpec,
          screenshots: [
            '.tmp-browser/hr-badge-0-before.png',
            '.tmp-browser/hr-badge-1-after.png',
          ],
        }),
    )
  } finally {
    // 恢复上锁：不把批次留在解锁态（本条 e2e 自行解锁，就必须自行复原）
    if (unlockedBySpec && (await relockBtn.count())) {
      await relockBtn.first().click()
      await page.waitForTimeout(800)
    }
  }
})
