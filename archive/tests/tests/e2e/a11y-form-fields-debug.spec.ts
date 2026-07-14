import type { Page } from '@playwright/test'
import {
  fetchCollection,
  pickSearchTerm,
  primeApiKeySession,
} from './support/api-key'
import { businessRoutes, systemRoutes } from './support/route-manifest'
import { test } from './support/test'

interface MissingFieldNode {
  path: string
  type: string
  outerHTML: string
}

interface BrokenLabelNode {
  path: string
  forValue: string
  outerHTML: string
}

type CollectedFindings = {
  fields: Array<Omit<MissingFieldNode, 'path'>>
  brokenLabels: Array<Omit<BrokenLabelNode, 'path'>>
}

function collectFindings(page: Page): Promise<CollectedFindings> {
  return page.evaluate(() => {
    const skipInputTypes = new Set(['hidden', 'submit', 'button', 'reset'])

    const isCandidateField = (element: Element) => {
      if (
        !(element instanceof HTMLInputElement) &&
        !(element instanceof HTMLTextAreaElement) &&
        !(element instanceof HTMLSelectElement)
      ) {
        return false
      }

      if (
        element instanceof HTMLInputElement &&
        skipInputTypes.has(element.type || '')
      ) {
        return false
      }

      if (element.closest('[aria-hidden="true"]')) {
        return false
      }

      return true
    }

    const fields = Array.from(
      document.querySelectorAll('input, textarea, select'),
    )
      .filter(isCandidateField)
      .filter((element) => !element.id && !element.getAttribute('name'))
      .map((element) => ({
        type:
          element instanceof HTMLInputElement
            ? element.type || 'input'
            : element.tagName.toLowerCase(),
        outerHTML: element.outerHTML.slice(0, 500),
      }))

    const brokenLabels = Array.from(document.querySelectorAll('label[for]'))
      .map((label) => ({
        forValue: label.getAttribute('for') || '',
        outerHTML: label.outerHTML.slice(0, 500),
      }))
      .filter(
        ({ forValue }) => !!forValue && !document.getElementById(forValue),
      )

    return { fields, brokenLabels }
  })
}

test.describe('a11y form field debug', () => {
  test('finds remaining missing id/name fields and broken labels', async ({
    browser,
    page,
  }) => {
    const findings: Array<{
      path: string
      missingFields: MissingFieldNode[]
      brokenLabels: BrokenLabelNode[]
    }> = []

    const anonymousContext = await browser.newContext()
    const anonymousPage = await anonymousContext.newPage()
    try {
      await anonymousPage.goto('http://127.0.0.1:3100/login')
      await anonymousPage.waitForLoadState('networkidle')
      const routeFindings = await collectFindings(anonymousPage)
      if (
        routeFindings.fields.length > 0 ||
        routeFindings.brokenLabels.length > 0
      ) {
        findings.push({
          path: '/login',
          missingFields: routeFindings.fields.map((item) => ({
            ...item,
            path: '/login',
          })),
          brokenLabels: routeFindings.brokenLabels.map((item) => ({
            ...item,
            path: '/login',
          })),
        })
      }
    } finally {
      await anonymousContext.close()
    }

    await primeApiKeySession(page)

    for (const route of systemRoutes) {
      await page.goto(route.path)
      await page.waitForLoadState('networkidle')

      if (route.path === '/access-control') {
        const roleTab = page.getByRole('tab', { name: '角色权限' })
        if ((await roleTab.count()) > 0) {
          await roleTab.click()
          await page.waitForTimeout(200)
        }
        const permissionTab = page.getByRole('tab', { name: '权限目录' })
        if ((await permissionTab.count()) > 0) {
          await permissionTab.click()
          await page.waitForTimeout(200)
        }
      }

      const routeFindings = await collectFindings(page)
      if (
        routeFindings.fields.length > 0 ||
        routeFindings.brokenLabels.length > 0
      ) {
        findings.push({
          path: route.path,
          missingFields: routeFindings.fields.map((item) => ({
            ...item,
            path: route.path,
          })),
          brokenLabels: routeFindings.brokenLabels.map((item) => ({
            ...item,
            path: route.path,
          })),
        })
      }
    }

    for (const route of businessRoutes) {
      await page.goto(route.path)
      await page.waitForLoadState('networkidle')

      const baseFindings = await collectFindings(page)
      if (
        baseFindings.fields.length > 0 ||
        baseFindings.brokenLabels.length > 0
      ) {
        findings.push({
          path: route.path,
          missingFields: baseFindings.fields.map((item) => ({
            ...item,
            path: route.path,
          })),
          brokenLabels: baseFindings.brokenLabels.map((item) => ({
            ...item,
            path: route.path,
          })),
        })
      }

      const collection = await fetchCollection(page.request, route.apiPath)
      if (
        collection.ok &&
        collection.records.length > 0 &&
        route.supportsDetail
      ) {
        const searchTerm = pickSearchTerm(
          collection.records[0],
          route.searchKeys,
        )
        if (searchTerm) {
          const keywordInput = page.getByPlaceholder('搜索关键词...')
          if ((await keywordInput.count()) > 0) {
            await keywordInput.fill(searchTerm)
          }
        }

        const firstDataRow = page
          .locator('.ant-table-tbody tr:not(.ant-table-measure-row)')
          .first()
        if ((await firstDataRow.count()) > 0) {
          await firstDataRow.dblclick()
          await page.waitForTimeout(300)
          const detailFindings = await collectFindings(page)
          if (
            detailFindings.fields.length > 0 ||
            detailFindings.brokenLabels.length > 0
          ) {
            findings.push({
              path: `${route.path}#detail`,
              missingFields: detailFindings.fields.map((item) => ({
                ...item,
                path: `${route.path}#detail`,
              })),
              brokenLabels: detailFindings.brokenLabels.map((item) => ({
                ...item,
                path: `${route.path}#detail`,
              })),
            })
          }
          const closeButton = page.locator('.workspace-overlay-close').last()
          if ((await closeButton.count()) > 0) {
            await closeButton.click()
            await page.waitForTimeout(150)
          }
        }
      }

      const createButton = page.getByRole('button', { name: '新建' })
      if ((await createButton.count()) > 0) {
        await createButton.click()
        await page.waitForTimeout(300)
        const createFindings = await collectFindings(page)
        if (
          createFindings.fields.length > 0 ||
          createFindings.brokenLabels.length > 0
        ) {
          findings.push({
            path: `${route.path}#create`,
            missingFields: createFindings.fields.map((item) => ({
              ...item,
              path: `${route.path}#create`,
            })),
            brokenLabels: createFindings.brokenLabels.map((item) => ({
              ...item,
              path: `${route.path}#create`,
            })),
          })
        }
        const closeButton = page.locator('.workspace-overlay-close').last()
        if ((await closeButton.count()) > 0) {
          await closeButton.click()
          await page.waitForTimeout(150)
        }
      }
    }

    console.log(JSON.stringify(findings, null, 2))
  })
})
