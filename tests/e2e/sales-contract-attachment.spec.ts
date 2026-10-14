import { randomUUID } from 'node:crypto'
import { expect } from '@playwright/test'
import { e2eApiBaseUrl, getPasswordSession } from './support/api-key'
import {
  buttonName,
  expectGridTable,
  expectModuleHeading,
  gotoRoute,
  moduleKeywordInput,
} from './support/business-e2e'
import { loginWithRetry } from './support/ops-master-data'
import { test } from './support/test'

/**
 * 销售合同附件入口回归。
 *
 * 只覆盖销售合同专属的部分：入口可见性、弹层挂载、以及传给附件接口的
 * moduleKey/recordId 是否正确（后端以 moduleKey 校验附件归属，传错会 422）。
 * 上传/预览/下载由通用 ModuleAttachmentModal 与 attachment 后端测试覆盖，
 * 这里不重复依赖对象存储，避免环境存储故障导致本用例假红。
 */
const MODULE_KEY = 'sales-contract'

test.describe('销售合同附件', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithRetry(page)
  })

  test('选中合同后打开附件弹层并按 sales-contract 模块键读取绑定', async ({
    page,
    request,
    assertNoFatalUiErrors,
  }) => {
    const session = await getPasswordSession(request)
    const authHeaders = { Authorization: `Bearer ${session.accessToken}` }

    const customers = (await (
      await request.get(`${e2eApiBaseUrl()}/customers?page=0&size=1`, {
        headers: authHeaders,
      })
    ).json()) as { content?: Array<{ id: string }> }
    const projects = (await (
      await request.get(`${e2eApiBaseUrl()}/projects?page=0&size=1`, {
        headers: authHeaders,
      })
    ).json()) as { content?: Array<{ id: string }> }
    const customerId = String(customers.content?.[0]?.id ?? '')
    const projectId = String(projects.content?.[0]?.id ?? '')
    expect(customerId, '缺少客户基础数据，无法构造销售合同').toBeTruthy()
    expect(projectId, '缺少项目基础数据，无法构造销售合同').toBeTruthy()

    const contractName = `附件E2E${Date.now()}`
    let contractId = ''
    try {
      const createResponse = await request.post(
        `${e2eApiBaseUrl()}/sales-contracts`,
        {
          headers: { ...authHeaders, 'X-Idempotency-Key': randomUUID() },
          data: {
            name: contractName,
            customerId,
            projectId,
            signDate: '2026-01-01',
            totalAmount: 1000,
            totalTonnage: 10,
          },
        },
      )
      expect(createResponse.ok(), await createResponse.text()).toBeTruthy()
      contractId = String(((await createResponse.json()) as { id: string }).id)

      await gotoRoute(page, '/sales-contract')
      await expectModuleHeading(page, '销售合同')
      await expectGridTable(page)

      // 未选中记录时不应出现附件入口
      await expect(
        page.getByRole('button', { name: buttonName('附件') }),
      ).toHaveCount(0)

      await moduleKeywordInput(page).fill(contractName)
      await moduleKeywordInput(page).press('Enter')

      const row = page
        .locator('.ant-table-row')
        .filter({ hasText: contractName })
        .first()
      await expect(row).toBeVisible()
      await row.click()

      const attachmentButton = page
        .getByRole('button', { name: buttonName('附件') })
        .first()
      await expect(attachmentButton).toBeVisible()

      const bindingRequestPromise = page.waitForRequest(
        (candidate) =>
          candidate.url().includes('/attachments/bindings') &&
          candidate.method() === 'GET',
      )
      await attachmentButton.click()

      const bindingRequest = await bindingRequestPromise
      expect(bindingRequest.url()).toContain(`moduleKey=${MODULE_KEY}`)
      expect(bindingRequest.url()).toContain(`recordId=${contractId}`)

      const dialog = page.getByRole('dialog').filter({ hasText: '附件管理' })
      await expect(dialog).toBeVisible()
      await assertNoFatalUiErrors()
    } finally {
      if (contractId) {
        await request.delete(
          `${e2eApiBaseUrl()}/sales-contracts/${contractId}`,
          {
            headers: { ...authHeaders, 'X-Idempotency-Key': randomUUID() },
          },
        )
      }
    }
  })
})
