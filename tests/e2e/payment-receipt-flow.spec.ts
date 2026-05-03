import { expect, test } from '@playwright/test'
import { installMockApi } from './support/mock-api'

const financeUser = {
  menuCodes: [
    '/dashboard', '/payments', '/receipts',
    '/supplier-statements', '/customer-statements', '/freight-statements',
  ],
  actionMap: {
    payments: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    receipts: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    'supplier-statements': ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'AUDIT'],
    'customer-statements': ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'AUDIT'],
    'freight-statements': ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'AUDIT'],
  },
}

const mockStatements = {
  'supplier-statements': [
    {
      id: 'ss-001',
      statementNo: 'ST-SUP-20260428-001',
      supplierName: '江苏沙钢',
      purchaseAmount: 50000,
      paymentAmount: 0,
      closingAmount: 50000,
      status: '草稿',
      items: [
        {
          id: 'ss-item-001',
          materialCode: 'MAT-001',
          material: 'Q235B',
          spec: '18',
          unit: '吨',
          weightTon: 12.55,
          unitPrice: 3980,
          amount: 50000,
          sourceNo: 'INB-001',
        },
      ],
    },
  ],
  'customer-statements': [
    {
      id: 'cs-001',
      statementNo: 'ST-CUS-20260428-001',
      customerName: '中铁建工',
      projectName: '南京南站项目',
      salesAmount: 80000,
      receiptAmount: 0,
      closingAmount: 80000,
      status: '草稿',
      items: [
        {
          id: 'cs-item-001',
          materialCode: 'MAT-002',
          material: 'HRB400E',
          spec: '8',
          unit: '吨',
          weightTon: 20.1,
          unitPrice: 3980,
          amount: 80000,
          sourceNo: 'SO-001',
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
      items: [
        {
          id: 'fs-item-001',
          sourceNo: 'FB-001',
          weightTon: 15.3,
          unitPrice: 196,
          amount: 3000,
        },
      ],
    },
  ],
}

const mockPayments = {
  payments: [
    {
      id: 'pay-001',
      paymentNo: 'PAY-20260428-001',
      businessType: '供应商',
      counterpartyName: '江苏沙钢',
      amount: 10000,
      sourceStatementId: 'ss-001',
      status: '已付款',
      operatorName: '财务专员',
      paymentDate: '2026-04-28',
    },
  ],
}

const mockReceipts = {
  receipts: [
    {
      id: 'rec-001',
      receiptNo: 'REC-20260428-001',
      customerName: '中铁建工',
      projectName: '南京南站项目',
      amount: 15000,
      sourceStatementId: 'cs-001',
      status: '已收款',
      operatorName: '财务专员',
      receiptDate: '2026-04-28',
    },
  ],
}

test.describe('payment and receipt flows', () => {
  test('payments: view list and open detail for existing payment', async ({ page }) => {
    await installMockApi(page, {
      user: financeUser,
      modules: { ...mockStatements, ...mockPayments },
    })

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('mock-password')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    await page.goto('/payments')
    await expect(page.locator('table')).toContainText('PAY-20260428-001')
    await expect(page.locator('table')).toContainText('江苏沙钢')

    const row = page.locator('tr', { hasText: 'PAY-20260428-001' }).first()
    await row.getByText('查看').click()

    const detail = page.locator('.workspace-overlay:visible').last()
    await expect(detail).toBeVisible()
    await expect(detail).toContainText('PAY-20260428-001')
    await expect(detail).toContainText('江苏沙钢')
  })

  test('payments: create new supplier payment', async ({ page }) => {
    await installMockApi(page, {
      user: financeUser,
      modules: { ...mockStatements, ...mockPayments },
    })

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('mock-password')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    await page.goto('/payments')
    await page.getByRole('button', { name: '新增' }).click()

    await expect(page.locator('.workspace-overlay-title')).toContainText('新增付款单')

    await page.locator('#editor-field-payments-counterpartyName').fill('测试供应商')
    await page.locator('#editor-field-payments-amount').fill('5000')

    await page.getByRole('button', { name: '保存' }).click()

    await expect(page.locator('.workspace-overlay-title')).not.toBeVisible()
    await expect(page.locator('table')).toContainText('测试供应商')
  })

  test('receipts: view list and open detail for existing receipt', async ({ page }) => {
    await installMockApi(page, {
      user: financeUser,
      modules: { ...mockStatements, ...mockReceipts },
    })

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('mock-password')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    await page.goto('/receipts')
    await expect(page.locator('table')).toContainText('REC-20260428-001')

    const row = page.locator('tr', { hasText: 'REC-20260428-001' }).first()
    await row.getByText('查看').click()

    const detail = page.locator('.workspace-overlay:visible').last()
    await expect(detail).toBeVisible()
    await expect(detail).toContainText('REC-20260428-001')
    await expect(detail).toContainText('中铁建工')
  })

  test('statements: load all three statement types with mock data', async ({ page }) => {
    await installMockApi(page, {
      user: financeUser,
      modules: mockStatements,
    })

    await page.goto('/login')
    await page.getByPlaceholder('请输入账号').fill('e2e-admin')
    await page.getByPlaceholder('请输入密码').fill('mock-password')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    // supplier statements
    await page.goto('/supplier-statements')
    await expect(page.locator('table')).toContainText('ST-SUP-20260428-001')
    await expect(page.locator('table')).toContainText('江苏沙钢')

    // customer statements
    await page.goto('/customer-statements')
    await expect(page.locator('table')).toContainText('ST-CUS-20260428-001')
    await expect(page.locator('table')).toContainText('南京南站项目')

    // freight statements
    await page.goto('/freight-statements')
    await expect(page.locator('table')).toContainText('ST-FRT-20260428-001')
    await expect(page.locator('table')).toContainText('顺丰物流')
  })
})
