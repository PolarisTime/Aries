import { test } from '@playwright/test'

test('login renders', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  page.on('pageerror', err => errors.push(err.message))
  
  await page.goto('http://127.0.0.1:3100/login', { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(3000)
  
  const appHtml = await page.locator('#app').innerHTML()
  console.log('APP HTML LENGTH:', appHtml.length)
  console.log('APP HTML:', appHtml.slice(0, 400))
  console.log('ERRORS:', errors.length > 0 ? errors.join('\n').slice(0, 500) : 'NONE')
})
