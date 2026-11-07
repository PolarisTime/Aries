import { expect } from '@playwright/test'
import {
  createPurchaseInboundFromOrder,
  createPurchaseOrderDraft,
  hardGoto,
  searchList,
  waitForStatus,
} from '../ops-chain-harness'
import { loginAsE2eUser } from '../support/business-e2e'
import { test } from '../support/test'
import {
  auditVisibleRecord,
  createDemoRecorder,
  demoRemark,
  expectActiveRow,
} from './_demo-helpers'

/**
 * 采购链 demo：新建采购订单 → 审核 → 采购入库（导入采购订单明细）→ 完成采购。
 *
 * <p>逐步截图写到 `/home/instance/Gemini/.tmp-shots/demo/purchase/`（仓库外），
 * 步骤清单在同目录 `manifest.json`。业务动作复用
 * {@link createPurchaseOrderDraft} / {@link createPurchaseInboundFromOrder}；
 * 列表内审核走 demo 版 {@link auditVisibleRecord}（与 harness `auditRecordFromList`
 * 业务口径一致，只多了「行必须在激活页签内可见」这一条定位约束）。</p>
 *
 * <p>为什么行级动作不用 harness 的 `auditRecordFromList` / `gridRow`：多页签布局会把非激活
 * 页签的 DOM 以 `display:none` 常驻（React 19 `Activity`），工作台「最近订单」表里也会出现
 * 同一采购单号 —— 全局 `tbody tr` 定位器会先命中那张隐藏表，表现就是
 * 「locator resolved 但 hidden」并一直等到超时。</p>
 *
 * <p>数据写在开发库里：remark 统一带 `DEMO-PUR-` 前缀，便于人工识别与清理。</p>
 *
 * <p>**只有 Lead 统一串行执行**：共享账号并发会话上限 3，demo 脚本自己跑会驱逐别人的会话。</p>
 */

/**
 * 文件级超时：默认 180s（task-9 要求），允许运行时用环境变量放宽。
 *
 * <p>注意：Playwright 的 `test.describe.configure({ timeout })` 会**覆盖** CLI 的
 * `--timeout`，所以「命令行放宽」在本文件不生效；需要更长时用
 * `DEMO_TIMEOUT_MS=480000 pnpm exec playwright test ...`。</p>
 */
const DEMO_TIMEOUT_MS = Number(process.env.DEMO_TIMEOUT_MS ?? 180_000)

test.describe('采购链 demo（新建 → 审核 → 入库 → 完成采购）', () => {
  /*
   * serial：单文件只有一个用例，这里主要是把「超时 + 不自动重试」写死在文件级。
   * 不重试是有意的 —— demo 重跑会重复建单、覆盖截图，且 remark 每次不同无法自动幂等。
   */
  test.describe.configure({
    mode: 'serial',
    retries: 0,
    timeout: DEMO_TIMEOUT_MS,
  })

  test('采购订单 → 采购入库 → 完成采购（逐步截图）', async ({ page }) => {
    const demo = await createDemoRecorder(page, 'purchase', '采购链 demo')

    try {
      /* 1. 登录：后续所有步骤都在同一个已登录会话里完成。 */
      await demo.step('01-login', '登录 admin_prod · 工作台', async () => {
        await loginAsE2eUser(page)
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
        /* 等 lazy 路由 chunk 与工作台首屏数据渲染完，截图才是稳定画面（不是骨架）。 */
        await page.waitForTimeout(1_500)
        return { note: '已登录 admin_prod，进入工作台' }
      })

      /* 2. 新建采购订单（供应商/日期/明细），保存为草稿。 */
      const draft = await demo.step(
        '02-purchase-order-draft',
        '采购订单：新建 → 保存（草稿）',
        async () => {
          const order = await createPurchaseOrderDraft(page, {
            remark: demoRemark('DEMO-PUR', 'PO'),
            quantity: 5,
            unitPrice: 100,
          })
          expect(order.no).toMatch(/^\d{15,20}$/)
          expect(order.status).toBe('草稿')

          await searchList(page, order.no)
          /* 只断言激活页签里的可见行：工作台隐藏表里可能有同一单号。 */
          await expectActiveRow(page, order.no, '草稿')
          return {
            order,
            docs: { purchaseOrderNo: order.no },
            note: '供应商/报单日期/明细（数量 5、单价 100）已填，保存为草稿',
          }
        },
      )

      /* 3. 列表里审核刚建的采购订单 → 已审核。 */
      await demo.step(
        '03-purchase-order-audited',
        '采购订单：列表审核 → 已审核',
        async () => {
          /*
           * 用 demo 版「可见行审核」：打开的是激活页签里可见的那一行。
           * harness 的 auditRecordFromList 用的是全局行定位，会命中非激活页签的
           * 隐藏表格（工作台「最近订单」同号行）。
           */
          await auditVisibleRecord(page, {
            moduleKey: 'purchase-order',
            route: '/purchase-order',
            no: draft.order.no,
          })
          await waitForStatus(
            page.request,
            'purchase-order',
            draft.order.id,
            '已审核',
          )

          await searchList(page, draft.order.no)
          await expectActiveRow(page, draft.order.no, '已审核')
          return {
            docs: { purchaseOrderNo: draft.order.no },
            note: '双击可见行打开编辑器 → 保存并审核 → 已审核',
          }
        },
      )

      /* 4. 由已审核采购订单新建采购入库（导入明细），保存并审核 → 完成入库。 */
      const inbound = await demo.step(
        '04-purchase-inbound',
        '采购入库：导入采购订单明细 → 保存并审核 → 完成入库',
        async () => {
          /* 整页进入入库页：清掉采购订单页签留下的 DOM，避免两张表并存。 */
          await hardGoto(page, '/purchase-inbound')
          const created = await createPurchaseInboundFromOrder(
            page,
            draft.order.no,
            demoRemark('DEMO-PUR', 'IN'),
          )
          expect(created.no).toMatch(/^\d{15,20}$/)

          /* 再整页刷新一次列表，按入库单号定位可见行。 */
          await hardGoto(page, '/purchase-inbound')
          await searchList(page, created.no)
          await expectActiveRow(page, created.no, '完成入库')
          return {
            inbound: created,
            docs: {
              purchaseOrderNo: draft.order.no,
              purchaseInboundNo: created.no,
            },
            note: '导入采购订单明细 → 保存并审核 → 全量入库完成入库',
          }
        },
      )

      /* 5. 全量入库后采购订单自动推进 → 完成采购。 */
      await demo.step(
        '05-purchase-order-completed',
        '采购订单：状态推进 → 完成采购',
        async () => {
          await waitForStatus(
            page.request,
            'purchase-order',
            draft.order.id,
            '完成采购',
            60_000,
          )

          await hardGoto(page, '/purchase-order')
          await searchList(page, draft.order.no)
          await expectActiveRow(page, draft.order.no, '完成采购')
          return {
            docs: {
              purchaseOrderNo: draft.order.no,
              purchaseInboundNo: inbound.inbound.no,
            },
            note: '全量入库审核后，采购订单自动从已审核推进到完成采购',
          }
        },
      )
    } finally {
      /* 失败也要落盘：已截的图 + 走到第几步、哪一步挂了，全部写进 manifest。 */
      await demo.flush()
    }
  })
})
