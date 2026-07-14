import type { Page } from '@playwright/test'
import {
  fetchCollection,
  fetchData,
  fetchDetail,
  primeApiKeySession,
} from './support/api-key'
import { expect, test } from './support/test'

type AnyRecord = Record<string, unknown>

function getTableBody(page: Page) {
  return page.locator('.ant-table-tbody')
}

function getDataRows(page: Page) {
  return getTableBody(page).locator('tr:not(.ant-table-measure-row)')
}

function materialSearchInput(page: Page) {
  return page.getByRole('textbox', { name: /关键字|关键词/ }).first()
}

function purchaseInboundSearchInput(page: Page) {
  return page.getByRole('textbox', { name: /入库单号|关键词/ }).first()
}

async function applySearch(
  page: Page,
  input: ReturnType<typeof materialSearchInput>,
) {
  const queryButton = page.getByRole('button', { name: /查\s*询/ })
  if (
    (await queryButton.count()) > 0 &&
    (await queryButton.first().isVisible())
  ) {
    await queryButton.first().click()
    return
  }

  await input.press('Enter')
}

function toCategorySet(records: AnyRecord[]) {
  return new Set(
    records
      .map((record) => String(record.category || '').trim())
      .filter(Boolean),
  )
}

function findWeighLine(record: AnyRecord | null) {
  if (!record || !Array.isArray(record.items)) {
    return null
  }

  return (
    (record.items as AnyRecord[]).find((item) => {
      return (
        ['盘螺', '线材'].includes(String(item.category || '').trim()) &&
        String(item.settlementMode || '').trim() === '过磅'
      )
    }) || null
  )
}

async function expectPageLoaded(page: Page) {
  await expect(page.locator('main').first()).toBeVisible()
  await expect(getTableBody(page)).toBeVisible()
}

async function openTopLevelPage(
  page: Page,
  topMenu: string,
  entryTitle: string,
) {
  if (!/\/dashboard(?:\?|$)/.test(page.url())) {
    await page.goto('/dashboard')
  }
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
  await page.getByRole('menuitem', { name: topMenu }).click()
  await page.getByRole('menuitem', { name: entryTitle }).click()
  await expectPageLoaded(page)
}

test.describe('material category and weight flow coverage', () => {
  test.beforeEach(async ({ page }) => {
    await primeApiKeySession(page)
  })

  test('covers all configured material categories using live product data', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const [materials, categoryOptions] = await Promise.all([
      fetchCollection(page.request, 'material', { size: 200 }),
      fetchData(page.request, 'material-categories/options'),
    ])

    expect(materials.ok, '读取商品资料失败').toBeTruthy()
    const optionRecords = Array.isArray(categoryOptions.data)
      ? (categoryOptions.data as AnyRecord[])
      : []
    test.skip(
      optionRecords.length === 0,
      '真实后端未返回商品类别选项，跳过过磅品类覆盖',
    )

    const materialCategories = toCategorySet(materials.records)
    const configuredCategories = new Set(
      optionRecords
        .map((item) => String(item.value || item.label || '').trim())
        .filter(Boolean),
    )

    expect(configuredCategories.has('盘螺'), '缺少盘螺类别配置').toBeTruthy()
    expect(configuredCategories.has('线材'), '缺少线材类别配置').toBeTruthy()
    test.skip(!materialCategories.has('盘螺'), '真实后端商品资料没有盘螺')

    await openTopLevelPage(page, '基础数据', '商品资料')

    await expect(getDataRows(page).first()).toBeVisible()
    await expect(page.locator('main')).toContainText(
      `共 ${materials.records.length} 条`,
    )
    await expect(getTableBody(page)).toContainText('直条')

    await assertNoFatalUiErrors()
  })

  test('verifies 盘螺 and 线材 are both configured as purchase-weigh categories', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const categoryOptions = await fetchData(
      page.request,
      'material-categories/options',
    )
    const optionRecords = Array.isArray(categoryOptions.data)
      ? (categoryOptions.data as AnyRecord[])
      : []
    test.skip(
      optionRecords.length === 0,
      '真实后端未返回商品类别选项，跳过过磅品类覆盖',
    )

    const optionsByValue = new Map(
      optionRecords.map((item) => [
        String(item.value || item.label || '').trim(),
        item,
      ]),
    )

    const coil = optionsByValue.get('盘螺')
    const wire = optionsByValue.get('线材')

    expect(coil, '缺少盘螺类别配置').toBeTruthy()
    expect(wire, '缺少线材类别配置').toBeTruthy()
    expect(
      Boolean(coil?.purchaseWeighRequired),
      '盘螺未标记为过磅品类',
    ).toBeTruthy()
    expect(
      Boolean(wire?.purchaseWeighRequired),
      '线材未标记为过磅品类',
    ).toBeTruthy()

    const materials = await fetchCollection(page.request, 'material', {
      size: 200,
      category: '盘螺',
    })
    expect(materials.ok, '读取盘螺商品失败').toBeTruthy()
    test.skip(materials.records.length === 0, '真实后端没有盘螺商品')

    for (const item of materials.records) {
      const piecesPerBundle = Number(item.piecesPerBundle ?? 0)
      expect(
        Number.isInteger(piecesPerBundle) && piecesPerBundle >= 0,
        `盘螺商品 ${String(item.materialCode || '')} 的每件支数必须为非负整数`,
      ).toBeTruthy()
    }

    const firstCoilMaterialCode = String(
      materials.records[0]?.materialCode || '',
    ).trim()
    expect(firstCoilMaterialCode, '盘螺商品缺少商品编码').toBeTruthy()

    await openTopLevelPage(page, '基础数据', '商品资料')
    const keywordInput = materialSearchInput(page)
    await expect(keywordInput).toBeVisible()
    await keywordInput.fill(firstCoilMaterialCode)
    await applySearch(page, keywordInput)
    await expect(getTableBody(page)).toContainText(firstCoilMaterialCode)
    await expect(getTableBody(page)).toContainText('盘螺')

    await assertNoFatalUiErrors()
  })

  test('covers purchase inbound weigh detail chain for live 盘螺 data', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const purchaseInbounds = await fetchCollection(
      page.request,
      'purchase-inbound',
      {
        size: 20,
      },
    )
    expect(purchaseInbounds.ok, '读取采购入库列表失败').toBeTruthy()

    let targetRecord: AnyRecord | null = null
    let targetDetail: AnyRecord | null = null
    let targetWeighItem: AnyRecord | null = null

    for (const record of purchaseInbounds.records) {
      const detail = await fetchDetail(
        page.request,
        'purchase-inbound',
        String(record.id || ''),
      )
      if (!detail.ok || !detail.record) {
        continue
      }
      const weighItem = findWeighLine(detail.record)
      if (!weighItem) {
        continue
      }
      targetRecord = record
      targetDetail = detail.record
      targetWeighItem = weighItem
      break
    }

    test.skip(!targetRecord, '真实后端采购入库中没有盘螺/线材过磅明细')
    expect(targetDetail, '目标采购入库详情读取失败').toBeTruthy()
    expect(targetWeighItem, '目标采购入库缺少过磅明细').toBeTruthy()

    expect(String(targetWeighItem?.category || '')).toBe('盘螺')
    expect(String(targetWeighItem?.settlementMode || '')).toBe('过磅')
    expect(Number(targetWeighItem?.weighWeightTon || 0)).toBeGreaterThan(0)
    expect(targetWeighItem?.weightAdjustmentTon).not.toBeNull()
    expect(targetWeighItem?.weightAdjustmentAmount).not.toBeNull()

    await openTopLevelPage(page, '采购', '采购入库')

    const inboundNo = String(targetRecord?.inboundNo || '').trim()
    const keywordInput = purchaseInboundSearchInput(page)
    await expect(keywordInput).toBeVisible()
    await keywordInput.fill(inboundNo)
    await applySearch(page, keywordInput)
    await expect(getTableBody(page)).toContainText(inboundNo)

    const firstRow = getDataRows(page).filter({ hasText: inboundNo }).first()
    await expect(firstRow).toBeVisible()
    await firstRow.dblclick()

    const overlay = page.locator('.workspace-overlay-panel').last()
    await expect(overlay).toBeVisible()
    await expect(overlay.locator('.workspace-overlay-title')).toContainText(
      '采购入库详情',
    )
    await expect(overlay).toContainText('盘螺')
    await expect(overlay).toContainText(
      String(targetWeighItem?.materialCode || ''),
    )
    await expect(overlay).toContainText(String(targetRecord?.inboundNo || ''))
    await expect(overlay.locator('.module-detail-table')).toContainText(
      String(targetWeighItem?.weighWeightTon || ''),
    )
    await expect(overlay.locator('.module-detail-table')).toContainText(
      String(targetWeighItem?.weightTon || ''),
    )

    await assertNoFatalUiErrors()
  })
})
