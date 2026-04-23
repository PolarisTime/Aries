import { test } from '@playwright/test'

test('debug header search layout', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('请输入账号').fill('admin')
  await page.getByPlaceholder('请输入密码').fill('123456')
  await page.getByRole('button', { name: '登录 Aries' }).click()
  await page.waitForURL('**/dashboard')
  await page.goto('/sales-outbounds')
  await page.waitForLoadState('networkidle')

  const info = await page.evaluate(() => {
    const selectors = [
      '.jsh-header',
      '.header',
      '.header-global-search',
      '.header-global-search-group',
      '.header-global-search-box',
      '.header-global-search-box .ant-select-selector',
      '.header-global-search-input',
      '.header-global-search-input .ant-input',
      '.header-global-search-button',
    ]

    return selectors.map((selector) => {
      const el = document.querySelector(selector)
      if (!el) {
        return { selector, missing: true }
      }

      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)

      return {
        selector,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        display: style.display,
        lineHeight: style.lineHeight,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        marginTop: style.marginTop,
        marginBottom: style.marginBottom,
        borderTopWidth: style.borderTopWidth,
        borderBottomWidth: style.borderBottomWidth,
      }
    })
  })

  console.log(JSON.stringify(info, null, 2))
  await page.screenshot({ path: 'temppic/header-search-debug.png', fullPage: false })
})
