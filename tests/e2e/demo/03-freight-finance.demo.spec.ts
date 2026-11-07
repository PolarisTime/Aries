import { expect, type Page } from '@playwright/test'
import {
  relogin,
  saveAndAuditEditor,
  saveEditor,
  searchList,
} from '../ops-chain-harness'
import {
  editorPanel,
  extractIdAfterLabel,
  gotoRouteE2e,
  importFirstParentCandidate,
  loginE2e,
  parentSelectorPanel,
  searchAndSelectFieldOption,
  selectFieldOption,
} from '../ops-e2e-support'
import { expectGridTable, expectModuleHeading } from '../support/business-e2e'
import {
  createE2eFixtures,
  type StableMasterData,
} from '../support/data-fixtures'
import { isSaveResultSuccess } from '../support/save-result-match'
import { test } from '../support/test'
import type { DemoRecorder } from './_demo-helpers'
import {
  createDemoRecorder,
  demoRemark,
  expectActiveRow,
  openVisibleRow,
} from './_demo-helpers'

/**
 * 物流/财务链 demo：物流单（新建 → 保存 → 审核）→ 物流对账单（从物流单生成 → 审核）
 * → 付款单（新建 → 保存 → 审核），每步截图。
 *
 * <p>产物：`/home/instance/Gemini/.tmp-shots/demo/freight-finance/` 下的
 * `NN-<slug>.png` 与同目录 `manifest.json`（步骤、状态、单号、失败原因）。
 * 截图/manifest 统一走 `./_demo-helpers` 的 `createDemoRecorder`，本文件只做编排。</p>
 *
 * <p><b>步骤契约（必须遵守，否则会被 demo 工具的前置清理踩掉）</b>：
 * `createDemoRecorder()` 的每个 `step()` / `shot()` 在动作前都会 `settleBeforeStep()`
 * —— 它会 Escape 关掉上一步残留的任何浮层（含**编辑器**）。因此**每个 step 必须
 * 自包含**：打开编辑器 → 填写 → 保存 → 关回执，全部在同一步内完成；不能像普通 e2e
 * 那样「上一步留编辑器、下一步点保存」，否则下一步开始时编辑器已被关闭，保存按钮永远等不到
 * （2026-11-07 实测：三条链都卡在 `clickEditorSave` 等保存按钮 20s 超时）。</p>
 *
 * <p>保存动作全部复用 harness 的原子操作，不自写回执等待：</p>
 * <ul>
 *   <li>{@link saveEditor}：点「保存」→ 等 `.save-result-overlay` → 取回执文本 → 关闭回执；</li>
 *   <li>{@link saveAndAuditEditor}：点「保存并审核」→ 处理「确定审核」确认框 → 关闭回执；</li>
 *   <li>回执文本用 {@link isSaveResultSuccess} 判定成功（与正式用例同一口径）。</li>
 * </ul>
 *
 * <p>**数据依赖**：物流单的明细来自「完成销售 + 已审核出库」的销售订单候选，
 * 由 `createE2eFixtures().ensureCustomerStatementCandidates()` 现造（不存在才造）。
 * 若该前置仍不可用，物流单链记为 skipped 并继续执行后续链条 —— 单步失败不中断整轮。</p>
 *
 * <p>**数据写入开发库**：remark 统一带 `DEMO-FF` 前缀（见 {@link demoRemark}），便于人工识别；
 * 已审核的付款单按后端产品规则不可删除，demo 不做清理（与 01/02 一致）。</p>
 *
 * <p>**只有 Lead 统一串行执行**：共享账号并发会话上限 3，demo 脚本自己跑会驱逐别人的会话。</p>
 */
test.describe('物流/财务链 demo（物流单 → 物流对账单 → 付款单）', () => {
  /*
   * 一个用例跑完三条链：serial 保证不重试、不并发；600s 给「现造销售链前置 + 三次建单审核」
   * 留足余量（真实后端单步最慢的是候选生成与列表刷新）。
   */
  test.describe.configure({ mode: 'serial', retries: 0, timeout: 600_000 })

  test('物流单 / 物流对账单 / 付款单：新建 → 保存 → 审核（逐步截图）', async ({
    page,
    request,
  }) => {
    const demo = await createDemoRecorder(
      page,
      'freight-finance',
      '物流/财务链 demo',
    )
    /** 链条级失败（某一步抛错后该链剩余步骤不再执行，但继续下一条链）。 */
    const chainFailures: string[] = []
    /** 至少有一条链走完才算 demo 有效：三条全挂说明环境坏了，必须红。 */
    let completedChains = 0

    try {
      /* 1. 登录：后续三条链共用同一个会话。 */
      await demo.step('login', '登录 admin_prod · 工作台', async () => {
        await loginE2e(page)
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
        await page.waitForTimeout(1_500)
        return { note: '已登录 admin_prod，进入工作台' }
      })

      /* 2. 前置主数据：结算主体 / 客户 / 供应商 / 物流方（缺什么造什么）。 */
      const fixtures = await createE2eFixtures(request)
      const master = await demo.step(
        'prerequisite-master-data',
        '前置：稳定主数据（结算主体 / 客户 / 供应商 / 物流方）',
        async () => {
          const stable = await fixtures.ensureStableMasterData()
          return {
            stable,
            note: `物流方=${stable.carrier.carrierName}；结算主体=${stable.company.companyName}；供应商=${stable.supplier.supplierName}`,
          }
        },
      )

      /*
       * 3. 前置：物流单候选销售订单（完成销售 + 已审核出库）。
       *
       * 这是**可选项**：候选造不出来通常意味着后端数据/状态口径变化，不应该让整个
       * demo 停摆 —— 记 skipped 后继续跑付款单链（它只依赖主数据）。
       */
      const prerequisiteOrder = await demo.optional(
        'prerequisite-sales-order',
        '前置：可导入的销售订单候选（完成销售 + 已审核出库）',
        async () => {
          await fixtures.ensureCustomerStatementCandidates()
          const candidates = await fixtures.findFreightBillCandidates()
          expect(
            candidates.length,
            'fixture 必须能提供物流单候选销售订单（完成销售 + 已审核出库）',
          ).toBeGreaterThan(0)
          return {
            orderNo: candidates[0].orderNo,
            docs: { sourceSalesOrderNo: candidates[0].orderNo },
            note: `导入来源：销售订单 ${candidates[0].orderNo}`,
          }
        },
      )

      /* ---------------- 链 1：物流单 ---------------- */
      let freightBillNo: string | null = null
      if (!prerequisiteOrder) {
        await demo.skip(
          'freight-bill-chain',
          '物流单：新建 → 保存 → 审核',
          '缺少可导入的销售订单候选（完成销售 + 已审核出库），跳过物流单链',
        )
      } else {
        try {
          freightBillNo = await runFreightBillChain(
            page,
            demo,
            master.stable,
            prerequisiteOrder,
          )
          completedChains += 1
        } catch (error) {
          console.error('[demo:freight-finance] 物流单链失败：', error)
          chainFailures.push(`物流单链：${toErrorMessage(error)}`)
        }
      }

      /* ---------------- 链 2：物流对账单 ---------------- */
      try {
        await runFreightStatementChain(page, demo, freightBillNo)
        completedChains += 1
      } catch (error) {
        console.error('[demo:freight-finance] 物流对账单链失败：', error)
        chainFailures.push(`物流对账单链：${toErrorMessage(error)}`)
      }

      /* ---------------- 链 3：付款单 ---------------- */
      try {
        await runPaymentChain(page, demo, master.stable)
        completedChains += 1
      } catch (error) {
        console.error('[demo:freight-finance] 付款单链失败：', error)
        chainFailures.push(`付款单链：${toErrorMessage(error)}`)
      }
    } catch (error) {
      /* 登录/主数据这类公共前置失败：整轮已经没有可演示的内容，直接让用例红。 */
      chainFailures.push(`公共前置：${toErrorMessage(error)}`)
      throw error
    } finally {
      if (chainFailures.length > 0) {
        test.info().annotations.push({
          type: 'demo-chain-failures',
          description: chainFailures.join(' | '),
        })
        console.warn(
          `[demo:freight-finance] 有 ${chainFailures.length} 条链失败（已记录，见 manifest）：\n- ${chainFailures.join('\n- ')}`,
        )
      }
      /* 失败也要落盘：已截的图 + 走到第几步、哪一步挂了，全部写进 manifest。 */
      await demo.flush()
    }

    expect(
      completedChains,
      `三条链全部未走完，demo 视为失败：${chainFailures.join(' | ')}`,
    ).toBeGreaterThan(0)
  })
})

/* -------------------------------------------------------------------------- */
/* 链 1：物流单                                                                */
/* -------------------------------------------------------------------------- */

/**
 * 共享账号并发会话上限 3：整轮 demo 约 1~2 分钟，期间当前会话可能被其它并发登录挤掉
 * （实测付款单链整页跳转后会落到登录页）。与 harness 的 `spaGoto` 一致：**切模块前重新登录**，
 * 保证当前浏览器上下文持有最新会话。
 */
async function ensureFreshSession(page: Page): Promise<void> {
  await relogin(page).catch(() => undefined)
}

/**
 * 整页跳转 + 登录态兜底：除了 URL 落到 `/login`，还要检测**登录表单本身**
 * （应用可能渲染登录页但 URL 不变），命中后重新登录再跳一次。
 */
async function gotoRouteStable(page: Page, route: string): Promise<void> {
  await gotoRouteE2e(page, route)
  const loginFormVisible = await page
    .locator('#loginName')
    .isVisible()
    .catch(() => false)
  if (!loginFormVisible) return
  await relogin(page).catch(() => undefined)
  await gotoRouteE2e(page, route)
}

/** 物流单：列表 → 新建（物流方 + 导入销售订单明细）→ 保存草稿 → 列表审核。 */
async function runFreightBillChain(
  page: Page,
  demo: DemoRecorder,
  master: StableMasterData,
  sourceOrder: { orderNo: string },
): Promise<string> {
  await demo.step('freight-bill-list', '物流单：列表首屏', async () => {
    await ensureFreshSession(page)
    await gotoRouteStable(page, '/freight-bill')
    await expectModuleHeading(page, '物流单')
    await expectGridTable(page)
    return { note: '物流单列表已加载' }
  })

  const saved = await demo.step(
    'freight-bill-create',
    '物流单：新建（选物流方 + 导入销售订单明细）→ 保存（草稿）',
    async () => {
      await page
        .getByRole('button', { name: /新增|新建/ })
        .first()
        .click()
      const editor = editorPanel(page).last()
      await expect(editor).toBeVisible({ timeout: 30_000 })

      /* 物流方：稳定主数据里的承运商（远端可搜索下拉）。 */
      await searchAndSelectFieldOption(
        page,
        'module-form-carrierid',
        master.carrier.carrierName,
      )

      /* 明细来源：只导入 fixture 的销售订单，避免命中共享库历史候选。 */
      await editor
        .getByRole('button', { name: /选择销售订单导入/ })
        .first()
        .click()
      const selector = parentSelectorPanel(page)
      const selectorKeyword = selector.getByRole('textbox').first()
      await selectorKeyword.fill(sourceOrder.orderNo)
      await selectorKeyword.press('Enter')
      await importFirstParentCandidate(page)

      await expect(
        editor.locator('tbody tr:not(.ant-table-measure-row)').first(),
      ).toBeVisible({ timeout: 30_000 })
      await editor
        .locator('#module-form-remark')
        .fill(demoRemark('DEMO-FF', 'FB'))

      /*
       * 保存 + 等回执 + 关闭回执**在同一步内**完成（见文件头「步骤契约」）：
       * harness 的 saveEditor 是原子动作，回执等待不在 demo 里重写一遍。
       */
      const receipt = await saveEditor(page, editor)
      expect(
        isSaveResultSuccess(receipt),
        `物流单保存回执应表示成功，实际：${receipt}`,
      ).toBe(true)
      const billNo = extractIdAfterLabel(receipt, '物流单号')
      expect(billNo).toMatch(/^\d{15,20}$/)

      /* 回执关闭后回到列表：按单号过滤，截图里能直接看到刚保存的草稿。 */
      await searchList(page, billNo as string)
      await expectActiveRow(page, billNo as string, '草稿')

      return {
        billNo: billNo as string,
        docs: {
          freightBillNo: billNo as string,
          sourceSalesOrderNo: sourceOrder.orderNo,
        },
        note: `物流方=${master.carrier.carrierName}；导入销售订单 ${sourceOrder.orderNo} 明细；保存成功（回执已验证）→ 列表状态草稿`,
      }
    },
  )
  const billNo = saved.billNo

  await demo.step(
    'freight-bill-audited',
    '物流单：列表审核 → 已审核',
    async () => {
      await gotoRouteStable(page, '/freight-bill')
      await expectModuleHeading(page, '物流单')
      await expectGridTable(page)
      await searchList(page, billNo)
      await expectActiveRow(page, billNo, '草稿')

      const overlay = await openVisibleRow(page, billNo)
      const receipt = await saveAndAuditEditor(page, overlay)
      expect(
        isSaveResultSuccess(receipt),
        `物流单审核回执应表示成功，实际：${receipt}`,
      ).toBe(true)

      await expectActiveRow(page, billNo, '已审核')
      return {
        docs: { freightBillNo: billNo },
        note: '双击行打开编辑器 → 保存并审核 → 列表状态「已审核」',
      }
    },
  )

  return billNo
}

/* -------------------------------------------------------------------------- */
/* 链 2：物流对账单                                                            */
/* -------------------------------------------------------------------------- */

/**
 * 物流对账单：列表 → 从物流单生成明细 → 保存草稿 → 列表审核。
 *
 * <p>来源优先用上一条链刚审核的物流单（同一 run 的截图叙事更连贯）；拿不到时退回
 * 候选列表首行 —— 对账单候选接口本来只列「已审核且未被对账」的物流单。</p>
 */
async function runFreightStatementChain(
  page: Page,
  demo: DemoRecorder,
  preferredBillNo: string | null,
): Promise<void> {
  await demo.step(
    'freight-statement-list',
    '物流对账单：列表首屏',
    async () => {
      await ensureFreshSession(page)
      await gotoRouteStable(page, '/freight-statement')
      await expectModuleHeading(page, '物流对账单')
      await expectGridTable(page)
      return { note: '物流对账单列表已加载' }
    },
  )

  const saved = await demo.step(
    'freight-statement-create',
    '物流对账单：从物流单生成（选择物流单 → 导入明细）→ 保存（草稿）',
    async () => {
      await page
        .getByRole('button', { name: /生成物流对账单/ })
        .first()
        .click()
      const editor = editorPanel(page).last()
      await expect(editor).toBeVisible({ timeout: 30_000 })

      await editor
        .getByRole('button', { name: /选择物流单生成明细/ })
        .first()
        .click()
      const source = await importFreightStatementCandidate(
        page,
        preferredBillNo,
      )

      const itemRows = editor.locator('tbody tr:not(.ant-table-measure-row)')
      await expect(itemRows.first()).toBeVisible({ timeout: 30_000 })
      expect(await itemRows.count()).toBeGreaterThan(0)
      await editor
        .locator('#module-form-remark')
        .fill(demoRemark('DEMO-FF', 'FS'))

      const receipt = await saveEditor(page, editor)
      expect(
        isSaveResultSuccess(receipt),
        `物流对账单保存回执应表示成功，实际：${receipt}`,
      ).toBe(true)
      const statementNo = extractIdAfterLabel(receipt, '对账单号')
      expect(statementNo).toMatch(/^\d{15,20}$/)

      await searchList(page, statementNo as string)
      await expectActiveRow(page, statementNo as string, '草稿')

      return {
        statementNo: statementNo as string,
        docs: { freightStatementNo: statementNo as string },
        note: `明细来源=${source}；总重量/总运费由后端按来源物流单重算；保存成功（回执已验证）→ 列表状态草稿`,
      }
    },
  )
  const statementNo = saved.statementNo

  await demo.step(
    'freight-statement-audited',
    '物流对账单：列表审核 → 已审核',
    async () => {
      await gotoRouteStable(page, '/freight-statement')
      await expectModuleHeading(page, '物流对账单')
      await expectGridTable(page)
      await searchList(page, statementNo)
      await expectActiveRow(page, statementNo, '草稿')

      const overlay = await openVisibleRow(page, statementNo)
      const receipt = await saveAndAuditEditor(page, overlay)
      expect(
        isSaveResultSuccess(receipt),
        `物流对账单审核回执应表示成功，实际：${receipt}`,
      ).toBe(true)

      await expectActiveRow(page, statementNo, '已审核')
      return {
        docs: { freightStatementNo: statementNo },
        note: '双击行 → 保存并审核 → 列表状态「已审核」',
      }
    },
  )
}

/**
 * 在「选择物流单生成明细」候选弹层里导入一张物流单。
 *
 * <p>优先按上一条链的物流单号过滤（候选弹层继承物流单列表的「物流单号」关键字筛选）；
 * 过滤不到时清空关键字退回首行候选，并在返回值里标明来源，避免截图看不出导的是哪张单。</p>
 */
async function importFreightStatementCandidate(
  page: Page,
  preferredBillNo: string | null,
): Promise<string> {
  const panel = parentSelectorPanel(page)
  await expect(panel).toBeVisible({ timeout: 30_000 })
  const rows = panel.locator('tbody tr:not(.ant-table-measure-row)')
  await expect(rows.first()).toBeVisible({ timeout: 30_000 })
  await expect(panel.locator('.ant-spin-spinning'))
    .toHaveCount(0, { timeout: 20_000 })
    .catch(() => undefined)

  const keywordInput = panel
    .locator('input[name="keyword"], input[aria-label="物流单号"]')
    .first()
  const canFilter = (await keywordInput.count()) > 0

  /*
   * 先过滤再判断命中，而不是「先导入、失败再回退」：候选命中不到时
   * `importFirstParentCandidate` 会白等 30s 才抛错，一轮 demo 里这一步最不该慢。
   */
  let matchedPreferred = false
  if (preferredBillNo && canFilter) {
    await keywordInput.fill(preferredBillNo)
    await keywordInput.press('Enter')
    await page.waitForTimeout(1_500)
    await expect(panel.locator('.ant-spin-spinning'))
      .toHaveCount(0, { timeout: 20_000 })
      .catch(() => undefined)
    matchedPreferred =
      (await rows.filter({ hasText: preferredBillNo }).count()) > 0
  }

  /* 关键字命中不到（候选状态口径变化 / 筛选字段不叫关键字）：清空过滤退回候选首行。 */
  if (!matchedPreferred && canFilter) {
    await keywordInput.fill('')
    await keywordInput.press('Enter')
    await page.waitForTimeout(1_200)
  }

  await importFirstParentCandidate(page)
  if (!preferredBillNo) return '候选首行'
  return matchedPreferred ? preferredBillNo : '候选首行（关键字未命中，已回退）'
}

/* -------------------------------------------------------------------------- */
/* 链 3：付款单                                                                */
/* -------------------------------------------------------------------------- */

/** 付款单：列表 → 新建（供应商/结算主体/账户/金额）→ 保存草稿 → 列表审核。 */
async function runPaymentChain(
  page: Page,
  demo: DemoRecorder,
  master: StableMasterData,
): Promise<void> {
  await demo.step('payment-list', '付款单：列表首屏', async () => {
    await ensureFreshSession(page)
    await gotoRouteStable(page, '/payment')
    await expectModuleHeading(page, '付款单')
    await expectGridTable(page)
    return { note: '付款单列表已加载' }
  })

  const saved = await demo.step(
    'payment-create',
    '付款单：新建（供应商 / 结算主体 / 账户 / 金额）→ 保存（草稿）',
    async () => {
      await page
        .getByRole('button', { name: /新增|新建/ })
        .first()
        .click()
      const editor = editorPanel(page).last()
      await expect(editor).toBeVisible({ timeout: 30_000 })

      /* 字段顺序与 ops-statement-finance.spec.ts 的付款单用例一致。 */
      await selectFieldOption(page, 'module-form-counterpartytype', '供应商')
      await searchAndSelectFieldOption(
        page,
        'module-form-counterpartyid',
        master.supplier.supplierName,
      )
      await searchAndSelectFieldOption(
        page,
        'module-form-settlementcompanyid',
        master.company.companyName,
      )
      await selectFieldOption(page, 'module-form-paytype', '银行转账')
      await selectFieldOption(page, 'module-form-accountid', 0)
      await editor.locator('#module-form-amount').fill('500')
      await editor
        .locator('#module-form-remark')
        .fill(demoRemark('DEMO-FF', 'PAY'))

      const receipt = await saveEditor(page, editor)
      expect(
        isSaveResultSuccess(receipt),
        `付款单保存回执应表示成功，实际：${receipt}`,
      ).toBe(true)
      const paymentNo = extractIdAfterLabel(receipt, '付款单号')
      expect(paymentNo).toMatch(/^\d{15,20}$/)

      await searchList(page, paymentNo as string)
      await expectActiveRow(page, paymentNo as string, '草稿')

      return {
        paymentNo: paymentNo as string,
        docs: { paymentNo: paymentNo as string },
        note: `供应商=${master.supplier.supplierName}；结算主体=${master.company.companyName}；金额 500；保存成功（回执已验证）→ 列表状态草稿`,
      }
    },
  )
  const paymentNo = saved.paymentNo

  await demo.step('payment-audited', '付款单：列表审核 → 已审核', async () => {
    await gotoRouteStable(page, '/payment')
    await expectModuleHeading(page, '付款单')
    await expectGridTable(page)
    await searchList(page, paymentNo)
    await expectActiveRow(page, paymentNo, '草稿')

    const overlay = await openVisibleRow(page, paymentNo)
    const receipt = await saveAndAuditEditor(page, overlay)
    expect(
      isSaveResultSuccess(receipt),
      `付款单审核回执应表示成功，实际：${receipt}`,
    ).toBe(true)

    await expectActiveRow(page, paymentNo, '已审核')
    return {
      docs: { paymentNo },
      note: '双击行 → 保存并审核 → 列表状态「已审核」（已审核付款单按产品规则不可删除）',
    }
  })
}

/* -------------------------------------------------------------------------- */
/* 小工具                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 错误摘要：**保留前几行关键信息**（`expect(...) failed` 后面几行才是
 * `Locator:` / `Expected:`，只留第一行等于把定位器信息丢了）。
 */
function toErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  /* Playwright 的错误信息可能带 ANSI 颜色控制符：拼进 manifest 前先剥掉（用 fromCharCode 避免正则里出现控制字符）。 */
  const ansiEscape = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
  const lines = raw
    .split('\n')
    .map((line) => line.trim().replace(ansiEscape, ''))
    .filter(Boolean)
  const summary = lines.slice(0, 4).join(' / ')
  return summary.slice(0, 400)
}
