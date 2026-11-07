import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, type Locator, type Page } from '@playwright/test'
import {
  buildRemark,
  findByNo,
  relogin,
  saveAndAuditEditor,
  searchList,
  spaGoto,
  waitForStatus,
} from '../ops-chain-harness'
import { isSaveResultSuccess } from '../support/save-result-match'

/**
 * demo 脚本专用辅助：**逐步截图 + manifest 落盘 + 步骤前置清理 + 可见行定位**。
 *
 * <p>与正式 e2e 的区别：这里的产物是给人看的演示材料（截图 + 步骤清单），
 * 断言只保留「这一步确实生效」的最小集合。因此：</p>
 * <ul>
 *   <li>截图写到仓库外的固定目录（默认 `/home/instance/Gemini/.tmp-shots/demo/<flow>/`），
 *       不产生 git 噪声；</li>
 *   <li>每步一个两位序号前缀（`01-login.png`），与 manifest 里的 `no` 一一对应；</li>
 *   <li>**失败也要落盘**：步骤抛错时尽力截图、把该步标成 `failed`，再由 spec 的
 *       `finally` 调 {@link DemoRecorder.flush} 写 manifest —— 跑挂了也能看到「走到第几步」；</li>
 *   <li>`optional` 用于「页面支持就演示、不支持就记录原因」的可选步骤（如生成客户对账单），
 *       失败只记 `skipped`，不把整条链拖红；</li>
 *   <li>**步骤前置清理**：每步开始前先 Escape 关掉上一步可能残留的浮层（保存回执 / 编辑器），
 *       否则下一个动作的全局定位器会命中隐藏 DOM；</li>
 *   <li>**可见行定位**：多页签布局会把非激活页签的 DOM 以 `display:none` 常驻
 *       （React 19 `Activity`），工作台里的「最近订单」表可能恰好含同一单号 —— 全局
 *       `tbody tr` 定位器会先命中隐藏那一张。因此行级动作统一走
 *       {@link activeGridRow} / {@link openVisibleRow} / {@link auditVisibleRecord}。</li>
 * </ul>
 *
 * <p>本文件只被 demo spec 引用；不要把它接进业务代码或正式用例。</p>
 */

/** demo 截图根目录：仓库外，避免 git 噪声；允许用环境变量覆盖（CI/别的机器）。 */
export const DEMO_SHOT_ROOT =
  process.env.DEMO_SHOT_ROOT?.trim() || '/home/instance/Gemini/.tmp-shots/demo'

/** 截图前等一小会儿，让 antd 浮层/骨架的动画收尾，画面才是稳定终态。 */
const SCREENSHOT_SETTLE_MS = 250

/** manifest 里的步骤状态：成功截图 / 失败 / 主动跳过（可选项未实现或环境不满足）。 */
export type DemoStepStatus = 'captured' | 'failed' | 'skipped'

/** manifest.json 里的单步记录。 */
export interface DemoStepRecord {
  /** 两位序号（`01`、`02`…），与截图文件名前缀一致。 */
  no: string
  /** 截图文件名里的英文短名（kebab-case）。 */
  slug: string
  /** 步骤标题（中文，给人看）。 */
  title: string
  /** 截图绝对路径；`skipped` 步骤没有截图，为空串。 */
  screenshot: string
  status: DemoStepStatus
  /** 该步产出的关键单号（采购订单号 / 入库单号 / 销售订单号 …）。 */
  docs?: Record<string, string>
  /** 补充说明（如「部分出库 2/5」）。 */
  note?: string
  /** 调用方自定义的附加字段（巡检类脚本用来记 route/kind/errors 等）。 */
  meta?: Record<string, unknown>
  /** 失败原因（`status === 'failed'` 时）。 */
  error?: string
  /** 截图本身失败的原因；步骤可能成功但图缺失，单独记录以便排查。 */
  screenshotError?: string
  /** 截图时刻（ISO 字符串）。 */
  at: string
  /** 本步耗时（毫秒）。 */
  durationMs: number
}

/** `<flow>/manifest.json` 的结构。 */
export interface DemoManifest {
  flow: string
  title: string
  generatedAt: string
  durationMs: number
  /** 所有步骤都 `captured` 才为 true（`skipped` 视为未完成，便于一眼看出有缺口）。 */
  ok: boolean
  steps: DemoStepRecord[]
}

/** 步骤动作的返回值：`docs` 写进 manifest，其余字段只供 spec 内部传递。 */
export interface DemoStepExtra {
  docs?: Record<string, string>
  note?: string
  /**
   * 任意附加字段（原样写进 manifest）：巡检类脚本可放 `{ route, kind, errors }`，
   * 业务链可放 `{ amount, status }`，避免为每种 demo 再改一次 helper。
   */
  meta?: Record<string, unknown>
}

export interface DemoRecorder {
  /** 流程标识（即截图子目录名，如 `purchase` / `sales`）。 */
  readonly flow: string
  /** 截图目录绝对路径。 */
  readonly dir: string
  /** manifest.json 绝对路径。 */
  readonly manifestPath: string
  /**
   * 执行一步：动作成功后截图并记为 `captured`；动作失败时尽力截图、记为 `failed`，
   * 然后把原错误**原样抛出**（不吞错，避免 demo 静默半途而废）。
   */
  step<T extends DemoStepExtra>(
    slug: string,
    title: string,
    action: () => Promise<T>,
  ): Promise<T>
  /**
   * 可选项：动作失败只记为 `skipped` 并返回 `null`，不抛出。
   * 用于「现有页面支持就演示，不支持就记录原因」的步骤。
   */
  optional<T extends DemoStepExtra>(
    slug: string,
    title: string,
    action: () => Promise<T>,
  ): Promise<T | null>
  /** 只截图、不执行业务动作（例如登录后的工作台首屏）。 */
  shot(slug: string, title: string, extra?: DemoStepExtra): Promise<void>
  /** 记录一个没有截图的跳过步骤（环境不满足、能力不存在时用）。 */
  skip(slug: string, title: string, reason: string): Promise<void>
  /** 把 manifest.json 落盘（幂等；spec 的 `finally` 里必须调用一次）。 */
  flush(): Promise<void>
}

/** ANSI 颜色转义（`ESC[...m`）清理器；控制字符用 fromCharCode 构造，避免源码出现不可见字符。 */
const ANSI_ESCAPE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')

/**
 * 错误信息压成单行、截断到 500 字符：manifest 要能一眼看出原因，不是整段堆栈。
 *
 * <p>保留 Playwright 错误里的 `Locator:` / `Expected:` 行 —— 只留第一行
 * （"expect(locator).toBeVisible() failed"）无法区分是哪个定位器失败；
 * 同时去掉 ANSI 颜色转义，manifest 是给人读的 JSON。</p>
 */
function toErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const lines = raw
    .replace(ANSI_ESCAPE, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const firstLine = lines[0] || raw.trim()
  const locatorLine = lines.find((line) => line.startsWith('Locator:'))
  const expectedLine = lines.find((line) => line.startsWith('Expected:'))
  const detail = [firstLine, locatorLine, expectedLine]
    .filter((line): line is string => Boolean(line))
    .join(' | ')
  return detail.slice(0, 500)
}

/**
 * 生成带业务前缀的唯一备注（写进单据 remark，便于在开发库里识别 demo 数据）。
 *
 * <p>形如 `DEMO-PUR-E2E-B-<时间戳>-PO-1`：前缀固定，后缀复用 harness 的
 * {@link buildRemark}（时间戳 + 自增计数），保证同一进程内多次运行也不撞号。</p>
 */
export function demoRemark(prefix: string, label: string): string {
  return `${prefix}-${buildRemark(label)}`
}

// ---------------------------------------------------------------------------
// 可见行定位与「列表内审核」：绕开多页签布局的隐藏 DOM
// ---------------------------------------------------------------------------

/**
 * 当前激活的页签面板。
 *
 * <p>`data-tab-active="true"` 是布局层给出的稳定锚点（见 `AppTabContainer`）：
 * 非激活页签的 DOM 被 React 19 `Activity` 以 `display:none` 保留，里面的表格行仍然
 * 存在于文档里且可能含相同单号（典型：工作台“最近订单”表）。任何行级动作都必须
 * 限制在激活面板内，否则 `tbody tr` 会先命中隐藏行。</p>
 */
export function activeTabPanel(page: Page): Locator {
  return page.locator('.leo-tab-panel[data-tab-active="true"]').first()
}

/** 激活面板内、文本命中 keyword 的第一条**可见**数据行。 */
export function activeGridRow(page: Page, keyword: string): Locator {
  return activeTabPanel(page)
    .locator('tbody tr:not(.ant-table-measure-row)')
    .filter({ hasText: keyword })
    .filter({ visible: true })
    .first()
}

/** 断言激活面板内存在该单号的行（可选：再断言行内状态文案）。 */
export async function expectActiveRow(
  page: Page,
  keyword: string,
  expectedText?: string,
): Promise<void> {
  const row = activeGridRow(page, keyword)
  await expect(row).toBeVisible({ timeout: 30_000 })
  if (expectedText) {
    await expect(row).toContainText(expectedText, { timeout: 30_000 })
  }
}

/**
 * 双击激活面板内的可见行并有编辑器浮层出现，返回浮层。
 *
 * <p>这是 harness `openRowEditor` 的 demo 版包装（**不改 harness 公共函数**）：
 * 唯一的区别是行定位限制在激活页签、且必须是可见行。</p>
 */
export async function openVisibleRow(page: Page, no: string): Promise<Locator> {
  const row = activeGridRow(page, no)
  await expect(row).toBeVisible({ timeout: 30_000 })
  await row.dblclick()
  const overlay = page.locator('.workspace-overlay-panel:visible').first()
  await expect(overlay).toBeVisible({ timeout: 30_000 })
  return overlay
}

/**
 * 列表内审核（demo 版 `auditRecordFromList`）：打开可见行 → 保存并审核 → 等状态。
 *
 * <p>与 harness 版本的业务口径完全一致（幂等跳过 + 保存回执成功判定 + `waitForStatus`），
 * 只把行定位换成 {@link openVisibleRow}；因此不会因为隐藏页签里的同号行而卡死。</p>
 */
export async function auditVisibleRecord(
  page: Page,
  args: {
    moduleKey: string
    /** 模块列表路由，如 `/purchase-order`。 */
    route: string
    no: string
    expected?: string
  },
): Promise<void> {
  const expected = args.expected ?? '已审核'
  const found = await findByNo(page.request, args.moduleKey, args.no)
  /* 幂等：已经处于目标状态就不重复审核（与 harness 一致）。 */
  if (found && found.status === expected) return

  await spaGoto(page, args.route)
  await searchList(page, args.no)
  const overlay = await openVisibleRow(page, args.no)
  const resultText = await saveAndAuditEditor(page, overlay)
  expect(
    isSaveResultSuccess(resultText),
    `保存回执应表示成功，实际：${resultText}`,
  ).toBe(true)
  if (found) {
    await waitForStatus(
      page.request,
      args.moduleKey,
      found.id,
      expected,
      45_000,
    )
  }
}

/**
 * 创建 demo 记录器：建目录、统一视口，并提供 {@link DemoRecorder} 的四个动作。
 *
 * <p>视口固定 1600×1000：宽屏能同时看到列表全部列与详情里的指标卡/明细表，
 * 截图便于人工比对与 PPT 引用。</p>
 */
export async function createDemoRecorder(
  page: Page,
  flow: string,
  title: string,
): Promise<DemoRecorder> {
  const dir = path.join(DEMO_SHOT_ROOT, flow)
  const manifestPath = path.join(dir, 'manifest.json')
  await fs.mkdir(dir, { recursive: true })
  await page.setViewportSize({ width: 1600, height: 1000 })

  const startedAt = Date.now()
  const steps: DemoStepRecord[] = []
  /** 序号在 addStep 里自增，保证与 `NN-slug.png` 严格一一对应。 */
  let seq = 0

  /** 截图：失败不抛（步骤状态另记），返回失败原因方便写进 manifest。 */
  async function screenshot(file: string): Promise<string | undefined> {
    try {
      await page.waitForTimeout(SCREENSHOT_SETTLE_MS)
      await page.screenshot({ path: file, animations: 'disabled' })
      return undefined
    } catch (error) {
      return toErrorMessage(error)
    }
  }

  interface AddStepArgs {
    slug: string
    title: string
    status: DemoStepStatus
    extra?: DemoStepExtra
    error?: string
    durationMs: number
    /** `skipped` 步骤不截图（页面可能停在别处，截了反而误导）。 */
    capture: boolean
  }

  async function addStep(args: AddStepArgs): Promise<DemoStepRecord> {
    seq += 1
    const no = String(seq).padStart(2, '0')
    const screenshotPath = path.join(dir, `${no}-${args.slug}.png`)
    const shotError = args.capture
      ? await screenshot(screenshotPath)
      : undefined
    const record: DemoStepRecord = {
      no,
      slug: args.slug,
      title: args.title,
      screenshot: args.capture && !shotError ? screenshotPath : '',
      status: shotError ? 'failed' : args.status,
      at: new Date().toISOString(),
      durationMs: args.durationMs,
    }
    if (args.extra?.docs) record.docs = args.extra.docs
    if (args.extra?.note) record.note = args.extra.note
    if (args.extra?.meta) record.meta = args.extra.meta
    if (args.error) record.error = args.error
    if (shotError) record.screenshotError = shotError
    steps.push(record)
    console.log(
      `[demo:${flow}] ${no} ${record.status} ${args.title}` +
        `${record.screenshot ? ` -> ${record.screenshot}` : ''}` +
        `${record.error ? ` (${record.error})` : ''}`,
    )
    return record
  }

  async function flush(): Promise<void> {
    const manifest: DemoManifest = {
      flow,
      title,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      ok: steps.length > 0 && steps.every((step) => step.status === 'captured'),
      steps: [...steps],
    }
    await fs.writeFile(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    )
    console.log(`[demo:${flow}] manifest -> ${manifestPath}`)
  }

  /**
   * 步骤前置清理：Escape 关掉上一步可能残留的浮层（保存回执 / 编辑器 / 确认框）。
   *
   * <p>为什么必须做：上一步的浮层即使视觉上已关闭，DOM/遮罩残留也会让下一步的
   * `dblclick`、`fill` 命中被遮挡的元素，表现为「locator resolved 但 hidden」。
   * 关闭失败不静默：`toHaveCount(0)` 直接让该步红掉，并保留失败截图。</p>
   */
  /**
   * 当前页面是否已被踢回登录页。
   *
   * <p>demo 与其它 e2e 可能存在并发会话：共享账号的并发登录会把先前的会话挤掉，
   * 页面随即跳 `/login`。这不是业务失败，不应写进 manifest 的 failed。</p>
   */
  function isLoginPage(): boolean {
    return /\/login(?:\?|$)/.test(page.url())
  }

  /**
   * 会话被挤出时重新登录并把当前步骤动作重跑（最多重试 2 次）。
   *
   * <p>安全前提：demo 的业务动作都是幂等的（单据按 remark 先查后建、审核按状态幂等跳过），
   * 重跑不会产生重复单据。只在「页面确实在登录页」时重试，其它失败照常抛出。</p>
   */
  async function runWithLoginRetry<T>(action: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await action()
      } catch (error) {
        if (attempt >= 2 || !isLoginPage()) throw error
        console.log(
          `[demo] 会话被并发登录挤出（第 ${attempt + 1} 次），重新登录后重试当前步骤`,
        )
        await relogin(page)
        await settleBeforeStep()
      }
    }
  }

  async function settleBeforeStep(): Promise<void> {
    /* 会话被挤出时先恢复登录态，否则后续定位器只会一路等到超时。 */
    if (isLoginPage()) {
      await relogin(page)
    }
    const visibleOverlays = page.locator('.workspace-overlay-panel:visible')
    if ((await visibleOverlays.count()) > 0) {
      /* 先 Escape；部分浮层被表单拦截时会先弹「未保存」确认框，再点一次主按钮。 */
      await page.keyboard.press('Escape').catch(() => undefined)
      if ((await visibleOverlays.count()) > 0) {
        const confirm = page.locator('.ant-modal-confirm:visible').last()
        if (await confirm.isVisible().catch(() => false)) {
          await confirm
            .locator('.ant-btn-primary')
            .first()
            .click()
            .catch(() => undefined)
        }
      }
      if ((await visibleOverlays.count()) > 0) {
        const cancel = visibleOverlays
          .last()
          .locator('button.overlay-action-button')
          .filter({ hasText: /取\s*消|关\s*闭/ })
          .first()
        if (await cancel.count()) {
          await cancel.click({ timeout: 5_000 }).catch(() => undefined)
        }
      }
    }
    /* 兜底断言：进下一步前不允许任何可见浮层残留（失败时截图仍会落盘）。 */
    await expect(
      page.locator('.workspace-overlay-panel:visible'),
      '步骤开始前仍有残留浮层未关闭',
    ).toHaveCount(0, { timeout: 15_000 })
  }

  return {
    flow,
    dir,
    manifestPath,
    async step<T extends DemoStepExtra>(
      slug: string,
      title: string,
      action: () => Promise<T>,
    ): Promise<T> {
      const stepStartedAt = Date.now()
      try {
        /* 前置清理：先关掉上一步残留的浮层，再开始本步动作。 */
        await settleBeforeStep()
        const result = await runWithLoginRetry(action)
        await addStep({
          slug,
          title,
          status: 'captured',
          extra: result,
          durationMs: Date.now() - stepStartedAt,
          capture: true,
        })
        return result
      } catch (error) {
        await addStep({
          slug,
          title,
          status: 'failed',
          error: toErrorMessage(error),
          durationMs: Date.now() - stepStartedAt,
          capture: true,
        })
        throw error
      }
    },
    async optional<T extends DemoStepExtra>(
      slug: string,
      title: string,
      action: () => Promise<T>,
    ): Promise<T | null> {
      const stepStartedAt = Date.now()
      try {
        /* 前置清理：先关掉上一步残留的浮层，再开始本步动作。 */
        await settleBeforeStep()
        const result = await runWithLoginRetry(action)
        await addStep({
          slug,
          title,
          status: 'captured',
          extra: result,
          durationMs: Date.now() - stepStartedAt,
          capture: true,
        })
        return result
      } catch (error) {
        const reason = toErrorMessage(error)
        await addStep({
          slug,
          title: `${title}（跳过）`,
          status: 'skipped',
          error: reason,
          durationMs: Date.now() - stepStartedAt,
          capture: false,
        })
        return null
      }
    },
    async shot(
      slug: string,
      title: string,
      extra?: DemoStepExtra,
    ): Promise<void> {
      await settleBeforeStep()
      await addStep({
        slug,
        title,
        status: 'captured',
        extra,
        durationMs: 0,
        capture: true,
      })
    },
    async skip(slug: string, title: string, reason: string): Promise<void> {
      await addStep({
        slug,
        title,
        status: 'skipped',
        error: reason,
        durationMs: 0,
        capture: false,
      })
    },
    flush,
  }
}
