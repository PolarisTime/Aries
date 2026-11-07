import { expect, type Page } from '@playwright/test'
import {
  type CreatedDoc,
  confirmDeliveryVerification,
  createPurchaseInboundFromOrder,
  createPurchaseOrderDraft,
  createSalesOutboundFromOrder,
  findByRemark,
  importFirstParent,
  pickToday,
  readStatus,
  saveEditor,
  searchList,
  spaGoto,
  waitForStatus,
} from '../ops-chain-harness'
import {
  clickEditorSave,
  closeSaveResult,
  editorPanel,
  expectSaveSuccess,
  extractIdAfterLabel,
  gotoRouteE2e,
  importFirstParentCandidate,
  parentSelectorPanel,
  searchAndSelectFieldOption,
} from '../ops-e2e-support'
import { fetchDetail } from '../support/api-key'
import {
  expectGridTable,
  expectModuleHeading,
  loginAsE2eUser,
} from '../support/business-e2e'
import { isSaveResultSuccess } from '../support/save-result-match'
import { test } from '../support/test'
import {
  auditVisibleRecord,
  createDemoRecorder,
  demoRemark,
  expectActiveRow,
  openVisibleRow,
} from './_demo-helpers'

/**
 * 销售链 demo：完成采购前置 → 销售订单（导入采购明细）→ 审核 → 分两次出库
 * → 交付核定 → 完成销售 →（可选）生成客户对账单。
 *
 * <p>逐步截图写到 `/home/instance/Gemini/.tmp-shots/demo/sales/`（仓库外），
 * 步骤清单在同目录 `manifest.json`。业务动作全部复用
 * {@link createPurchaseOrderDraft} / {@link createPurchaseInboundFromOrder} /
 * {@link createSalesOutboundFromOrder} / {@link confirmDeliveryVerification}；
 * 列表内审核与行级定位走 demo 版 {@link auditVisibleRecord} / {@link openVisibleRow}
 * （多页签布局会把非激活页签 DOM 以 `display:none` 常驻，全局 `tbody tr` 会命中隐藏行）。</p>
 *
 * <p><b>销售订单建单为什么不直接调 harness `createSalesOrderDraft`</b>：它用 `pickFirst`
 * 选第一个客户/第一个项目，当前开发库里首项目「海宁市袁花镇稻米加工中心项目」配置了
 * 品牌/材质白名单（[中天,铜陵富鑫,芜湖富鑫,萍钢] / [HRB400E]），而采购订单首项明细是
 * 圆钢 / HPB300 —— 导入会被 `validateParentImport`（BLOCK 档）拦下，编辑器只剩空白行，
 * 保存被必填校验拦住。因此这里改为**按名称选择允许范围为空（=全部放行）的客户/项目**，
 * 其余步骤（日期/备注/导入/保存）仍复用 harness。</p>
 *
 * <p>「生成客户对账单」是**可选步骤**：现有页面已支持从完成销售的订单生成对账单，
 * 但它依赖客户/项目/销售订单候选口径；失败时只记 `skipped` 并写明原因，
 * 不把整条销售链拖红（与 task-9 的要求一致）。</p>
 *
 * <p>数据写在开发库里：remark 统一带 `DEMO-SAL-` 前缀，便于人工识别与清理。</p>
 *
 * <p>**只有 Lead 统一串行执行**：共享账号并发会话上限 3，demo 脚本自己跑会驱逐别人的会话。</p>
 */

/**
 * 文件级超时：默认 180s（真实后端下销售链更接近上限），允许运行时用环境变量放宽。
 *
 * <p>注意：`test.describe.configure({ timeout })` 会**覆盖** CLI 的 `--timeout`，
 * 需要用 `DEMO_TIMEOUT_MS=540000 pnpm exec playwright test ...` 放宽。</p>
 */
const DEMO_TIMEOUT_MS = Number(process.env.DEMO_TIMEOUT_MS ?? 180_000)

/**
 * 销售订单使用的客户/项目（按名称搜索选中，不用 pickFirst）。
 *
 * <p>选「稳定 fixture」这一组：`E2E-FIXTURE客户` / `E2E-FIXTURE项目` 的
 * `allowedBrands` / `allowedMaterials` 均为空数组 = 全部放行（已用 API 核对），
 * 因此导入采购订单明细不会被项目范围校验（BLOCK 档）拦下。
 * 备选数据（若 fixture 被清理）：海泰建设有限公司 / 周王庙镇应急消防一体化中心项目。</p>
 */
const DEMO_SALES_CUSTOMER_NAME = 'E2E-FIXTURE客户'
const DEMO_SALES_PROJECT_NAME = 'E2E-FIXTURE项目'

/**
 * demo 版销售订单建单：与 harness `createSalesOrderDraft` 的业务步骤一致
 * （选客户/项目/交货日期 → 填备注 → 导入采购订单明细 → 保存），唯一区别是
 * **客户/项目按名称搜索选择**，从而落到「允许范围为空」的项目上。
 *
 * <p>不修改 harness：这里只是用 harness 已导出的 `pickToday` / `importFirstParent` /
 * `saveEditor` / `findByRemark` 重新编排，并补上「保存回执必须成功」的断言。</p>
 */
async function createSalesOrderDraftWithNamedScope(
  page: Page,
  args: {
    purchaseOrderNo: string
    remark: string
    customerName: string
    projectName: string
  },
): Promise<CreatedDoc> {
  /* 幂等：同一 remark 已存在（上次跑到一半）时直接复用，避免重复建单。 */
  const existing = await findByRemark(
    page.request,
    'sales-order',
    args.remark,
    'orderNo',
  )
  if (existing) return existing

  await spaGoto(page, '/sales-order')
  await page.getByRole('button', { name: /新增/ }).first().click()
  const overlay = page.locator('.workspace-overlay-panel').first()
  await expect(overlay).toBeVisible({ timeout: 30_000 })

  /* 按名称搜索选择：项目下拉按客户重载，选完客户后等一拍再选项目。 */
  await searchAndSelectFieldOption(
    page,
    'module-form-customerid',
    args.customerName,
  )
  await page.waitForTimeout(1_200)
  await searchAndSelectFieldOption(
    page,
    'module-form-projectid',
    args.projectName,
  )
  await pickToday(page, overlay.locator('#module-form-deliverydate'))
  await overlay.locator('#module-form-remark').fill(args.remark)

  const editor = await importFirstParent(
    page,
    overlay,
    /导入采购订单明细/,
    args.purchaseOrderNo,
  )
  const resultText = await saveEditor(page, editor)
  expect(
    isSaveResultSuccess(resultText),
    `保存回执应表示成功，实际：${resultText}`,
  ).toBe(true)

  const created = await findByRemark(
    page.request,
    'sales-order',
    args.remark,
    'orderNo',
  )
  if (!created) throw new Error('销售订单保存后未能检索到记录')
  return created
}

test.describe('销售链 demo（销售订单 → 分次出库 → 交付核定 → 完成销售）', () => {
  test.describe.configure({
    mode: 'serial',
    retries: 0,
    timeout: DEMO_TIMEOUT_MS,
  })

  test('销售订单 → 部分出库 → 补足出库 → 交付核定 → 完成销售', async ({
    page,
  }) => {
    const demo = await createDemoRecorder(page, 'sales', '销售链 demo')

    try {
      /* 1. 登录。 */
      await demo.step('01-login', '登录 admin_prod · 工作台', async () => {
        await loginAsE2eUser(page)
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
        /* 等 lazy 路由 chunk 与工作台首屏数据渲染完，截图才是稳定画面（不是骨架）。 */
        await page.waitForTimeout(1_500)
        return { note: '已登录 admin_prod，进入工作台' }
      })

      /* 2. 前置：真实 UI 走完采购链，拿到「完成采购」的采购订单作为销售来源。 */
      const prerequisite = await demo.step(
        '02-prerequisite-purchase',
        '前置：完成采购的采购订单（销售来源）',
        async () => {
          /*
           * 前置采购链用 harness 的同一批函数显式编排（与 createCompletedPurchaseOrder 等价）：
           * 后者内部走 auditRecordFromList，用的是**全局**行定位；多页签布局下工作台
           * 「最近单据」表（隐藏页签、display:none）会先命中同一个采购单号，导致 30s 超时。
           * 这里仅把「列表审核」换成 demo 版 auditVisibleRecord，业务口径不变。
           */
          const purchaseOrder = await createPurchaseOrderDraft(page, {
            remark: demoRemark('DEMO-SAL', 'PRE-PO'),
            quantity: 5,
            unitPrice: 100,
          })
          expect(purchaseOrder.no).toMatch(/^\d{15,20}$/)

          await auditVisibleRecord(page, {
            moduleKey: 'purchase-order',
            route: '/purchase-order',
            no: purchaseOrder.no,
          })
          await waitForStatus(
            page.request,
            'purchase-order',
            purchaseOrder.id,
            '已审核',
          )

          await createPurchaseInboundFromOrder(
            page,
            purchaseOrder.no,
            demoRemark('DEMO-SAL', 'PRE-IN'),
          )
          await waitForStatus(
            page.request,
            'purchase-order',
            purchaseOrder.id,
            '完成采购',
            45_000,
          )

          await spaGoto(page, '/purchase-order')
          await searchList(page, purchaseOrder.no)
          await expectActiveRow(page, purchaseOrder.no, '完成采购')
          return {
            purchaseOrder: { ...purchaseOrder, status: '完成采购' },
            docs: { sourcePurchaseOrderNo: purchaseOrder.no },
            note: '前置采购链：采购订单新建 → 审核 → 入库 → 完成采购',
          }
        },
      )

      /* 3. 新建销售订单：选客户/项目/交货日期，导入采购订单明细，保存为草稿。 */
      const draft = await demo.step(
        '03-sales-order-draft',
        '销售订单：新建（导入采购订单明细）→ 保存（草稿）',
        async () => {
          const salesOrder = await createSalesOrderDraftWithNamedScope(page, {
            purchaseOrderNo: prerequisite.purchaseOrder.no,
            remark: demoRemark('DEMO-SAL', 'SO'),
            customerName: DEMO_SALES_CUSTOMER_NAME,
            projectName: DEMO_SALES_PROJECT_NAME,
          })
          expect(salesOrder.no).toMatch(/^\d{15,20}$/)
          expect(salesOrder.status).toBe('草稿')

          await searchList(page, salesOrder.no)
          await expectActiveRow(page, salesOrder.no, '草稿')
          return {
            salesOrder,
            docs: {
              salesOrderNo: salesOrder.no,
              sourcePurchaseOrderNo: prerequisite.purchaseOrder.no,
            },
            note: `客户「${DEMO_SALES_CUSTOMER_NAME}」/ 项目「${DEMO_SALES_PROJECT_NAME}」（允许范围为空 = 全部放行）→ 导入采购订单明细 → 保存草稿`,
          }
        },
      )

      /* 4. 审核销售订单 → 已审核。 */
      await demo.step(
        '04-sales-order-audited',
        '销售订单：列表审核 → 已审核',
        async () => {
          await auditVisibleRecord(page, {
            moduleKey: 'sales-order',
            route: '/sales-order',
            no: draft.salesOrder.no,
          })
          await waitForStatus(
            page.request,
            'sales-order',
            draft.salesOrder.id,
            '已审核',
          )

          await searchList(page, draft.salesOrder.no)
          await expectActiveRow(page, draft.salesOrder.no, '已审核')
          return {
            docs: { salesOrderNo: draft.salesOrder.no },
            note: '双击可见行 → 保存并审核 → 已审核',
          }
        },
      )

      /* 5. 第一次出库（部分 2/5）：出库审核后销售订单仍应为已审核。 */
      await demo.step(
        '05-sales-outbound-partial',
        '销售出库：第一次出库（部分 2/5）→ 审核',
        async () => {
          const outbound = await createSalesOutboundFromOrder(
            page,
            draft.salesOrder.no,
            demoRemark('DEMO-SAL', 'OUT1'),
            2,
          )
          expect(outbound.no).toMatch(/^\d{15,20}$/)

          /* 部分出库不应把销售订单推进到交付核定（口径见 ops-sales-chain.spec）。 */
          await expect
            .poll(
              () =>
                readStatus(page.request, 'sales-order', draft.salesOrder.id),
              { timeout: 30_000 },
            )
            .toBe('已审核')

          await spaGoto(page, '/sales-outbound')
          await searchList(page, outbound.no)
          await expectActiveRow(page, outbound.no)
          return {
            docs: {
              salesOrderNo: draft.salesOrder.no,
              salesOutboundNo1: outbound.no,
            },
            note: '部分出库 2/5 并审核，销售订单仍为已审核',
          }
        },
      )

      /* 6. 补足剩余出库（3/5）：出库审核后销售订单进入交付核定。 */
      await demo.step(
        '06-sales-outbound-remaining',
        '销售出库：补足出库（剩余 3/5）→ 审核',
        async () => {
          const outbound = await createSalesOutboundFromOrder(
            page,
            draft.salesOrder.no,
            demoRemark('DEMO-SAL', 'OUT2'),
            3,
          )
          expect(outbound.no).toMatch(/^\d{15,20}$/)

          await waitForStatus(
            page.request,
            'sales-order',
            draft.salesOrder.id,
            '交付核定',
          )
          await spaGoto(page, '/sales-order')
          await searchList(page, draft.salesOrder.no)
          await expectActiveRow(page, draft.salesOrder.no, '交付核定')
          return {
            docs: {
              salesOrderNo: draft.salesOrder.no,
              salesOutboundNo2: outbound.no,
            },
            note: '补足出库后销售订单进入交付核定',
          }
        },
      )

      /* 7. 交付核定编辑器「确认核定」→ 完成销售。 */
      await demo.step(
        '07-delivery-verification',
        '销售订单：交付核定 → 完成销售',
        async () => {
          await spaGoto(page, '/sales-order')
          await searchList(page, draft.salesOrder.no)
          const overlay = await openVisibleRow(page, draft.salesOrder.no)
          await confirmDeliveryVerification(page, overlay)
          await waitForStatus(
            page.request,
            'sales-order',
            draft.salesOrder.id,
            '完成销售',
          )

          await searchList(page, draft.salesOrder.no)
          await expectActiveRow(page, draft.salesOrder.no, '完成销售')
          return {
            docs: { salesOrderNo: draft.salesOrder.no },
            note: '确认核定后，销售订单完成销售（销售链终点）',
          }
        },
      )

      /* 8.（可选）从完成销售的订单生成客户对账单；失败只记跳过原因。 */
      await demo.optional(
        '08-customer-statement',
        '客户对账单：生成对账单（可选）',
        async () => {
          /* 客户/项目名称用于在「生成对账单」编辑器里精确定位下拉选项。 */
          const detail = await fetchDetail(
            page.request,
            'sales-order',
            draft.salesOrder.id,
          )
          const fallback = draft.salesOrder.record as Record<string, unknown>
          const record = (detail.record ?? fallback) as Record<string, unknown>
          const customerName = String(
            record.customerName ?? fallback.customerName ?? '',
          ).trim()
          const projectName = String(
            record.projectName ?? fallback.projectName ?? '',
          ).trim()
          if (!customerName || !projectName) {
            throw new Error('销售订单缺少客户/项目名称，无法定位对账单下拉选项')
          }

          await gotoRouteE2e(page, '/customer-statement')
          await expectModuleHeading(page, '客户对账单')
          await expectGridTable(page)
          await page
            .getByRole('button', { name: /生成对账单/ })
            .first()
            .click()
          const editor = editorPanel(page).last()
          await expect(editor).toBeVisible({ timeout: 30_000 })

          await searchAndSelectFieldOption(
            page,
            'module-form-customerid',
            customerName,
          )
          await searchAndSelectFieldOption(
            page,
            'module-form-projectid',
            projectName,
          )

          await editor
            .getByRole('button', { name: /选择销售订单生成明细/ })
            .first()
            .click()
          const selector = parentSelectorPanel(page)
          const selectorKeyword = selector.getByRole('textbox').first()
          await selectorKeyword.fill(draft.salesOrder.no)
          await selectorKeyword.press('Enter')
          await page.waitForTimeout(1_500)
          /*
           * 候选为空是很常见的环境限制（客户/结算主体未配置收款账户、或单据不在当前账期窗口），
           * 此时 antd 表格只剩一行「暂无数据」占位，`确认导入` 永远禁用。这里先判空并抛出
           * **可读原因**，让 manifest 的 skipped 步骤直接说明为什么跳过，而不是一句
           * "expect(locator).toBeEnabled() failed"。
           */
          const candidateRows = selector.locator('tbody tr.ant-table-row')
          if ((await candidateRows.count()) === 0) {
            throw new Error(
              `客户对账单候选为空：销售订单 ${draft.salesOrder.no} 不在「选择销售订单生成明细」候选列表` +
                '（该客户/结算主体可能未配置收款账户，或单据不在当前账期窗口）',
            )
          }
          await importFirstParentCandidate(page)

          const itemRows = editor.locator(
            'tbody tr:not(.ant-table-measure-row)',
          )
          await expect(itemRows.first()).toBeVisible({ timeout: 30_000 })
          await editor
            .locator('#module-form-remark')
            .fill(demoRemark('DEMO-SAL', 'STMT'))

          await clickEditorSave(page, 'save')
          const outcome = await expectSaveSuccess(page)
          const statementNo = extractIdAfterLabel(outcome.panelText, '对账单号')
          await closeSaveResult(page)

          /* 回列表按对账单号定位刚生成的记录，截图展示“已进列表”的终态。 */
          await gotoRouteE2e(page, '/customer-statement')
          await expectModuleHeading(page, '客户对账单')
          await expectGridTable(page)
          if (statementNo) {
            /*
             * 客户对账单列表没有通用「关键字」筛选输入框（`searchList` 在这里必然超时），
             * 直接按行文本定位即可：新生成的单据按 id 倒序落在第一页。
             */
            await expectActiveRow(page, statementNo)
          }
          return {
            docs: {
              salesOrderNo: draft.salesOrder.no,
              ...(statementNo ? { customerStatementNo: statementNo } : {}),
            },
            note: statementNo
              ? '已从完成销售的订单生成客户对账单草稿'
              : '对账单已保存，但保存回执未解析出对账单号',
          }
        },
      )
    } finally {
      /* 失败也要落盘：已截的图 + 走到第几步、哪一步挂了，全部写进 manifest。 */
      await demo.flush()
    }
  })
})
