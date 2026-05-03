import { expect, test } from '@playwright/test'
import { installMockApi } from './support/mock-api'

const procurementUser = {
  menuCodes: [
    '/dashboard', '/materials',
    '/purchase-orders', '/purchase-inbounds',
    '/supplier-statements', '/customer-statements',
    '/freight-bills', '/freight-statements',
  ],
  actionMap: {
    materials: ['VIEW'],
    'purchase-orders': ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'AUDIT'],
    'purchase-inbounds': ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'AUDIT'],
    'supplier-statements': ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'AUDIT'],
    'customer-statements': ['VIEW', 'CREATE'],
    'freight-bills': ['VIEW', 'CREATE', 'EDIT'],
    'freight-statements': ['VIEW', 'CREATE'],
  },
}

const purchaseModules = {
  'purchase-orders': [
    {
      id: 'po-001',
      orderNo: 'PO-20260428-001',
      supplierName: '江苏沙钢',
      buyerName: '采购员',
      orderDate: '2026-04-28',
      totalWeight: 8.5,
      totalAmount: 34000,
      status: '已审核',
      remark: 'E2E测试采购订单',
      items: [
        {
          id: 'po-item-001',
          materialCode: 'MAT-001',
          brand: '宝钢',
          material: 'Q235B',
          spec: '18',
          length: '9m',
          unit: '吨',
          warehouseName: '一号库',
          quantity: 1,
          quantityUnit: '件',
          pieceWeightTon: 2.5,
          piecesPerBundle: 7,
          weightTon: 2.5,
          unitPrice: 4000,
          amount: 10000,
        },
        {
          id: 'po-item-002',
          materialCode: 'MAT-002',
          brand: '沙钢',
          material: 'HRB400E',
          spec: '8',
          length: '9m',
          unit: '吨',
          warehouseName: '二号库',
          quantity: 2,
          quantityUnit: '件',
          pieceWeightTon: 3.0,
          piecesPerBundle: 5,
          weightTon: 6.0,
          unitPrice: 4000,
          amount: 24000,
        },
      ],
    },
  ],
  'purchase-inbounds': [
    {
      id: 'inb-001',
      inboundNo: 'INB-20260428-001',
      supplierName: '江苏沙钢',
      buyerName: '采购员',
      purchaseOrderNo: 'PO-20260428-001',
      inboundDate: '2026-04-28',
      totalWeight: 8.5,
      totalAmount: 34000,
      status: '已审核',
      remark: 'E2E测试入库单',
      items: [
        {
          id: 'inb-item-001',
          materialCode: 'MAT-001',
          material: 'Q235B',
          spec: '18',
          unit: '吨',
          weightTon: 2.5,
          unitPrice: 4000,
          amount: 10000,
          sourceNo: 'PO-20260428-001',
        },
        {
          id: 'inb-item-002',
          materialCode: 'MAT-002',
          material: 'HRB400E',
          spec: '8',
          unit: '吨',
          weightTon: 6.0,
          unitPrice: 4000,
          amount: 24000,
          sourceNo: 'PO-20260428-001',
        },
      ],
    },
  ],
  'supplier-statements': [
    {
      id: 'ss-001',
      statementNo: 'ST-SUP-20260428-001',
      supplierName: '江苏沙钢',
      purchaseAmount: 34000,
      paymentAmount: 0,
      closingAmount: 34000,
      status: '草稿',
      sourceInboundNos: 'INB-20260428-001',
      items: [
        {
          id: 'ss-item-001',
          materialCode: 'MAT-001',
          material: 'Q235B',
          spec: '18',
          unit: '吨',
          weightTon: 2.5,
          unitPrice: 4000,
          amount: 10000,
          sourceNo: 'INB-20260428-001',
        },
        {
          id: 'ss-item-002',
          materialCode: 'MAT-002',
          material: 'HRB400E',
          spec: '8',
          unit: '吨',
          weightTon: 6.0,
          unitPrice: 4000,
          amount: 24000,
          sourceNo: 'INB-20260428-001',
        },
      ],
    },
  ],
}

test.describe('statement generation flow', () => {
  test('purchase order → inbound → supplier statement detail chain', async ({ page }) => {
    await installMockApi(page, {
      user: procurementUser,
      modules: purchaseModules,
    })

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('mock-password')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    // Step 1: Verify purchase order exists with items
    await page.goto('/purchase-orders')
    await expect(page.locator('table')).toContainText('PO-20260428-001')
    await expect(page.locator('table')).toContainText('江苏沙钢')
    await expect(page.locator('table')).toContainText('已审核')

    const poRow = page.locator('tr', { hasText: 'PO-20260428-001' }).first()
    await poRow.getByText('查看').click()
    const poDetail = page.locator('.workspace-overlay:visible').last()
    await expect(poDetail).toContainText('PO-20260428-001')
    await expect(poDetail.locator('.module-detail-table')).toContainText('MAT-001')
    await expect(poDetail.locator('.module-detail-table')).toContainText('MAT-002')
    await page.locator('.workspace-overlay-close').last().click()

    // Step 2: Verify purchase inbound references the order
    await page.goto('/purchase-inbounds')
    await expect(page.locator('table')).toContainText('INB-20260428-001')
    await expect(page.locator('table')).toContainText('PO-20260428-001')

    const inbRow = page.locator('tr', { hasText: 'INB-20260428-001' }).first()
    await inbRow.getByText('查看').click()
    const inbDetail = page.locator('.workspace-overlay:visible').last()
    await expect(inbDetail).toContainText('INB-20260428-001')
    await expect(inbDetail).toContainText('PO-20260428-001')
    await page.locator('.workspace-overlay-close').last().click()

    // Step 3: Verify supplier statement references the inbound
    await page.goto('/supplier-statements')
    await expect(page.locator('table')).toContainText('ST-SUP-20260428-001')
    await expect(page.locator('table')).toContainText('江苏沙钢')

    const stRow = page.locator('tr', { hasText: 'ST-SUP-20260428-001' }).first()
    await stRow.getByText('查看').click()
    const stDetail = page.locator('.workspace-overlay:visible').last()
    await expect(stDetail).toContainText('ST-SUP-20260428-001')
    await expect(stDetail).toContainText('INB-20260428-001')
    await expect(stDetail.locator('.bill-detail-body')).toContainText('34000')
  })

  test('freight bill → freight statement flow', async ({ page }) => {
    const freightModules = {
      'freight-bills': [
        {
          id: 'fb-001',
          billNo: 'FB-20260428-001',
          customerName: '中铁建工',
          carrierName: '顺丰物流',
          deliveryStatus: '已送达',
          totalWeight: 15.3,
          totalFreight: 3000,
          unitPrice: 196,
          status: '已审核',
          items: [
            {
              id: 'fb-item-001',
              materialCode: 'MAT-001',
              material: 'Q235B',
              spec: '18',
              unit: '吨',
              weightTon: 15.3,
              unitPrice: 196,
              amount: 3000,
            },
          ],
        },
      ],
      'freight-statements': [
        {
          id: 'fs-001',
          statementNo: 'ST-FRT-20260428-001',
          carrierName: '顺丰物流',
          totalFreight: 3000,
          paidAmount: 0,
          unpaidAmount: 3000,
          status: '草稿',
          sourceBillNos: 'FB-20260428-001',
          items: [
            {
              id: 'fs-item-001',
              sourceNo: 'FB-20260428-001',
              weightTon: 15.3,
              unitPrice: 196,
              amount: 3000,
            },
          ],
        },
      ],
    }

    await installMockApi(page, {
      user: procurementUser,
      modules: freightModules,
    })

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('mock-password')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    // Verify freight bill
    await page.goto('/freight-bills')
    await expect(page.locator('table')).toContainText('FB-20260428-001')
    await expect(page.locator('table')).toContainText('顺丰物流')

    // Mark as delivered and verify
    const fbRow = page.locator('tr', { hasText: 'FB-20260428-001' }).first()
    await fbRow.getByText('查看').click()
    const fbDetail = page.locator('.workspace-overlay:visible').last()
    await expect(fbDetail).toContainText('已送达')
    await page.locator('.workspace-overlay-close').last().click()

    // Verify freight statement
    await page.goto('/freight-statements')
    await expect(page.locator('table')).toContainText('ST-FRT-20260428-001')
    await expect(page.locator('table')).toContainText('顺丰物流')

    const fsRow = page.locator('tr', { hasText: 'ST-FRT-20260428-001' }).first()
    await fsRow.getByText('查看').click()
    const fsDetail = page.locator('.workspace-overlay:visible').last()
    await expect(fsDetail).toContainText('FB-20260428-001')
    await expect(fsDetail.locator('.bill-detail-body')).toContainText('3000')
  })
})
