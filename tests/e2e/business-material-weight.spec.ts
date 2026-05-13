import {
  fetchCollection,
  fetchData,
  fetchDetail,
  primeApiKeySession,
} from './support/api-key'
import { expect, test } from './support/test'

type AnyRecord = Record<string, unknown>

function getTableBody(page: Parameters<typeof test>[0]['page']) {
  return page.locator('.ant-table-tbody')
}

function getFirstDataRow(page: Parameters<typeof test>[0]['page']) {
  return getTableBody(page)
    .locator('tr:not(.ant-table-measure-row)')
    .first()
}

function getDataRows(page: Parameters<typeof test>[0]['page']) {
  return getTableBody(page).locator('tr:not(.ant-table-measure-row)')
}

function toCategorySet(records: AnyRecord[]) {
  return new Set(
    records.map((record) => String(record.category || '').trim()).filter(Boolean),
  )
}

function findWeighLine(record: AnyRecord | null) {
  if (!record || !Array.isArray(record.items)) {
    return null
  }

  return (record.items as AnyRecord[]).find((item) => {
    return (
      ['盘螺', '线材'].includes(String(item.category || '').trim()) &&
      String(item.settlementMode || '').trim() === '过磅'
    )
  }) || null
}

async function expectPageLoaded(
  page: Parameters<typeof test>[0]['page'],
  title: string,
) {
  const pageHeading = page.getByRole('heading', {
    level: 3,
    name: title,
  })
  if ((await pageHeading.count()) > 0) {
    await expect(pageHeading).toBeVisible()
  } else {
    await expect(
      page.getByRole('tab', {
        selected: true,
        name: title,
      }),
    ).toBeVisible()
  }
}

async function openTopLevelPage(
  page: Parameters<typeof test>[0]['page'],
  topMenu: string,
  entryTitle: string,
) {
  if (!/\/dashboard(?:\?|$)/.test(page.url())) {
    await page.goto('/dashboard')
  }
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
  await page.getByRole('menuitem', { name: topMenu }).click()
  await page.getByRole('menuitem', { name: entryTitle }).click()
  await expectPageLoaded(page, entryTitle)
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
    expect(optionRecords.length > 0, '读取商品类别选项失败').toBeTruthy()

    const materialCategories = toCategorySet(materials.records)
    const configuredCategories = new Set(
      optionRecords
        .map((item) => String(item.value || item.label || '').trim())
        .filter(Boolean),
    )

    expect(configuredCategories.has('盘螺'), '缺少盘螺类别配置').toBeTruthy()
    expect(configuredCategories.has('线材'), '缺少线材类别配置').toBeTruthy()
    expect(materialCategories.has('盘螺'), '现网商品资料缺少盘螺').toBeTruthy()

    await openTopLevelPage(page, '基础数据', '商品资料')

    await expect(getDataRows(page).first()).toBeVisible()
    await expect(page.locator('main')).toContainText(`共 ${materials.records.length} 条`)
    await expect(page.locator('table')).toContainText('盘螺')
    await expect(page.locator('table')).toContainText('直条')

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
    expect(optionRecords.length > 0, '读取商品类别选项失败').toBeTruthy()

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
    expect(Boolean(coil?.purchaseWeighRequired), '盘螺未标记为过磅品类').toBeTruthy()
    expect(Boolean(wire?.purchaseWeighRequired), '线材未标记为过磅品类').toBeTruthy()

    const materials = await fetchCollection(page.request, 'material', {
      size: 200,
      category: '盘螺',
    })
    expect(materials.ok, '读取盘螺商品失败').toBeTruthy()
    expect(materials.records.length, '现网没有盘螺商品').toBeGreaterThan(0)

    for (const item of materials.records) {
      expect(
        Number(item.piecesPerBundle ?? 0),
        `盘螺商品 ${String(item.materialCode || '')} 的每件支数应允许为 0`,
      ).toBe(0)
    }

    const firstCoilMaterialCode = String(materials.records[0]?.materialCode || '').trim()
    expect(firstCoilMaterialCode, '盘螺商品缺少商品编码').toBeTruthy()

    await openTopLevelPage(page, '基础数据', '商品资料')
    await page.getByPlaceholder('搜索关键词...').fill(firstCoilMaterialCode)
    await page.getByRole('button', { name: '查询' }).click()
    await expect(page.locator('table')).toContainText(firstCoilMaterialCode)
    await expect(page.locator('table')).toContainText('盘螺')

    await assertNoFatalUiErrors()
  })

  test('covers purchase inbound weigh detail chain for live 盘螺 data', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const purchaseInbounds = await fetchCollection(page.request, 'purchase-inbound', {
      size: 20,
    })
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

    expect(targetRecord, '现网采购入库中没有盘螺/线材过磅明细').toBeTruthy()
    expect(targetDetail, '目标采购入库详情读取失败').toBeTruthy()
    expect(targetWeighItem, '目标采购入库缺少过磅明细').toBeTruthy()

    expect(String(targetWeighItem?.category || '')).toBe('盘螺')
    expect(String(targetWeighItem?.settlementMode || '')).toBe('过磅')
    expect(Number(targetWeighItem?.weighWeightTon || 0)).toBeGreaterThan(0)
    expect(targetWeighItem?.weightAdjustmentTon).not.toBeNull()
    expect(targetWeighItem?.weightAdjustmentAmount).not.toBeNull()

    await openTopLevelPage(page, '采购', '采购入库')

    const inboundNo = String(targetRecord?.inboundNo || '').trim()
    await page.getByPlaceholder('搜索关键词...').fill(inboundNo)
    await page.getByRole('button', { name: '查询' }).click()
    await expect(page.locator('table')).toContainText(inboundNo)

    const firstRow = getFirstDataRow(page)
    await expect(firstRow).toBeVisible()
    await firstRow.dblclick()

    const overlay = page.locator('.workspace-overlay-panel').last()
    await expect(overlay).toBeVisible()
    await expect(overlay.locator('.workspace-overlay-title')).toContainText(
      '采购入库详情',
    )
    await expect(overlay).toContainText('盘螺')
    await expect(overlay).toContainText(String(targetWeighItem?.materialCode || ''))
    await expect(overlay).toContainText(String(targetRecord?.inboundNo || ''))
    await expect(
      overlay.locator('.module-detail-table'),
    ).toContainText(String(targetWeighItem?.weighWeightTon || ''))
    await expect(
      overlay.locator('.module-detail-table'),
    ).toContainText(String(targetWeighItem?.weightTon || ''))

    await assertNoFatalUiErrors()
  })
})
