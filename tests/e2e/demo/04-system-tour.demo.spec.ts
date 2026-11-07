import fs from 'node:fs/promises'
import path from 'node:path'
import { expect } from '@playwright/test'
import { loginE2e } from '../ops-e2e-support'
import { test } from '../support/test'
import { createDemoRecorder } from './_demo-helpers'
import {
  clickTopMenuItem,
  collectRoutablePages,
  countDataRows,
  dismissOverlays,
  ensureFullPermissions,
  layoutTabs,
  openFirstRowOverlay,
  pageSlug,
  readPageTitle,
  TOUR_VIEWPORT,
  type TourJumpResult,
  type TourPageResult,
  toErrorMessage,
  tourGoto,
  trackConsoleErrors,
  waitForPageReady,
  writeJsonFile,
} from './_tour-helpers'

/**
 * 全站页面与跳转巡检 demo：把「每个页面能不能打开、首屏长什么样、双击首行进的是详情还是
 * 编辑器、控制台有没有报错」一次性截成图 + 落成清单，供人工过一遍全站。
 *
 * <p>产物：`/home/instance/Gemini/.tmp-shots/demo/system-tour/`</p>
 * <ul>
 *   <li>`NN-<page>-list.png`：每页列表首屏整屏截图；</li>
 *   <li>`NN-<page>-overlay.png`：双击首行后的弹层截图（该页有数据行时）；</li>
 *   <li>`manifest.json`：`createDemoRecorder` 写的步骤清单（每步含 `meta.route / key / kind /
 *       rows / overlayTitle / errors`，`screenshot` 即该步截图绝对路径）；</li>
 *   <li>`pages.json`：按任务要求整理的**每页一条**视图
 *       `{route, title, listScreenshot, overlayScreenshot?, kind, errors}`，
 *       外加 `jumps`（顶部菜单跳转检查点）与 `failures`（失败清单）。</li>
 * </ul>
 *
 * <p>页面清单**运行时从 `src/config/page-registry*.ts` 解析**（排除 `routeless` 被并页），
 * 自带兜底快照，详见 `./_tour-helpers.ts`。</p>
 *
 * <p>**单页失败不中断整轮**：每页 try/catch，失败原因写进 `failures` 与 `pages.json`，
 * 继续下一页；最后仍输出完整清单。</p>
 *
 * <p>**只有 Lead 统一串行执行**：共享账号并发会话上限 3，本脚本自己跑会驱逐别人的会话。</p>
 */
test.describe('全站页面与跳转巡检 demo', () => {
  /*
   * 900s：29 条路由 ×（整页加载 + 首屏等待 + 截图）+ 有数据行的页面各多一次双击/弹层/关闭。
   * 真实后端下按经验 2~4 分钟；留足余量给慢页面（比价 / 行情 / 资金流水）。
   */
  test.describe.configure({ mode: 'serial', retries: 0, timeout: 900_000 })

  test('逐页巡检全部可路由页面 + 顶部菜单跳转 + 标签页开关（逐步截图）', async ({
    page,
  }) => {
    const demo = await createDemoRecorder(
      page,
      'system-tour',
      '全站页面与跳转巡检 demo',
    )
    const tracker = trackConsoleErrors(page)
    const drafts: PageDraft[] = []
    const jumps: Array<TourJumpResult & { slug: string }> = []
    const failures: string[] = []

    try {
      /* 0. 登录：整轮只登录一次，之后每页整页跳转都靠 addInitScript 注入的会话。 */
      await demo.step(
        'login',
        '登录 admin_prod · 工作台（补齐会话权限）',
        async () => {
          await loginE2e(page)
          await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
          /*
           * e2e 注入的用户对象只有 id/loginName/userName，permissions 被丢掉了：
           * 权限过滤会让受权限控制的菜单/标签（比如供应商报价表）整页缺失。
           * 这里用 addInitScript 在每次导航的会话注入之后把 permissions 补成 ['*']。
           */
          await ensureFullPermissions(page)
          await page.waitForTimeout(1_200)
          return {
            note: '已登录 admin_prod；permissions 已补成 [*]，避免权限过滤让页面/菜单缺失',
          }
        },
      )

      /* 1. 解析注册表：拿到全部非 routeless 页面（运行时解析，不写死清单）。 */
      const routable = await collectRoutablePages()
      expect(
        routable.length,
        '从 src/config/page-registry*.ts 解析到的可路由页面数量异常（应约 30 个）',
      ).toBeGreaterThanOrEqual(20)
      console.log(
        `[system-tour] 可路由页面 ${routable.length} 个：${routable
          .map((entry) => entry.route)
          .join(', ')}`,
      )

      /* 2. 逐页巡检：goto → 首屏截图 → 双击首行判定弹层 → 截图 → 关闭。 */
      for (const [index, definition] of routable.entries()) {
        const no = String(index + 1).padStart(2, '0')
        const slug = pageSlug(definition.route)
        tracker.reset()

        const draft: PageDraft = {
          no,
          route: definition.route,
          key: definition.key,
          titleKey: definition.titleKey,
          title: '',
          hiddenInMenu: definition.hiddenInMenu,
          rows: 0,
          kind: 'none',
          errors: [],
          listSlug: `${slug}-list`,
          overlaySlug: `${slug}-overlay`,
        }

        /* 2.1 列表首屏（页面级失败只记录，继续下一页）。 */
        try {
          await demo.step(
            `${slug}-list`,
            `${definition.route}：首屏`,
            async () => {
              await tourGoto(page, definition.route)
              await waitForPageReady(page)
              draft.title = (await readPageTitle(page)) || definition.titleKey
              draft.rows = await countDataRows(page)
              draft.errors = tracker.drain()
              return {
                meta: {
                  route: definition.route,
                  key: definition.key,
                  view: definition.view,
                  title: draft.title,
                  rows: draft.rows,
                  kind: draft.rows > 0 ? 'list' : 'none',
                  errors: draft.errors,
                },
                note: `标题=${draft.title || '(空)'}；数据行=${draft.rows}；控制台错误=${draft.errors.length}`,
              }
            },
          )
        } catch (error) {
          draft.error = toErrorMessage(error)
          draft.errors = tracker.drain()
          failures.push(`${definition.route} 首屏：${draft.error}`)
          drafts.push(draft)
          console.warn(
            `[system-tour] ${definition.route} 首屏失败，继续下一页：${draft.error}`,
          )
          continue
        }

        /* 2.2 没有数据行：不双击，记一条 skipped（截图仍保留列表首屏）。 */
        if (draft.rows === 0) {
          await demo.skip(
            `${slug}-overlay`,
            `${definition.route}：双击首行探测弹层`,
            '页面没有数据行（空态 / 非列表页），跳过弹层探测',
          )
          drafts.push(draft)
          continue
        }

        /* 2.3 有数据行：双击首行，判定进的是「详情」还是「编辑弹层」。 */
        try {
          const probe = await demo.step(
            `${slug}-overlay`,
            `${definition.route}：双击首行 → 弹层判定`,
            async () => {
              const overlay = await openFirstRowOverlay(page)
              const overlayErrors = tracker.drain()
              return {
                overlay,
                meta: {
                  route: definition.route,
                  key: definition.key,
                  title: draft.title,
                  rows: draft.rows,
                  kind: overlay.kind,
                  overlayTitle: overlay.title,
                  panelFound: overlay.panelFound,
                  errors: overlayErrors,
                },
                note: `弹层=${overlay.kind}${overlay.title ? `「${overlay.title}」` : ''}；控制台错误=${overlayErrors.length}`,
              }
            },
          )
          /* 任务要求的 kind 只有 detail|editor|list|none；`other`（确认框/导入预览）归入 list。 */
          draft.kind =
            probe.overlay.kind === 'none' || probe.overlay.kind === 'other'
              ? 'list'
              : probe.overlay.kind
          draft.overlayKind =
            probe.overlay.kind === 'none' ? undefined : probe.overlay.kind
          draft.overlayTitle = probe.overlay.title
          draft.errors = [
            ...draft.errors,
            ...((probe.meta?.errors as string[] | undefined) ?? []),
          ]
        } catch (error) {
          draft.kind = 'list'
          draft.error = toErrorMessage(error)
          draft.errors = [...draft.errors, ...tracker.drain()]
          failures.push(`${definition.route} 弹层：${draft.error}`)
          console.warn(
            `[system-tour] ${definition.route} 弹层探测失败，继续下一页：${draft.error}`,
          )
        } finally {
          /* 弹层截图在 demo.step 里已经拍完，这里只负责把页面恢复干净。 */
          await dismissOverlays(page)
        }

        drafts.push(draft)
      }

      /* 3. 跳转验证：顶部菜单点击 → URL 与标题变化。 */
      const jumpSpecs = [
        {
          name: '菜单跳转：销售 → 销售订单',
          group: '销售',
          item: '销售订单',
          route: '/sales-order',
          title: '销售订单',
          slug: 'jump-sales-order',
        },
        {
          name: '菜单跳转：采购 → 采购订单',
          group: '采购',
          item: '采购订单',
          route: '/purchase-order',
          title: '采购订单',
          slug: 'jump-purchase-order',
        },
        {
          name: '菜单跳转：物流 → 物流单',
          group: '物流',
          item: '物流单',
          route: '/freight-bill',
          title: '物流单',
          slug: 'jump-freight-bill',
        },
      ] as const

      for (const spec of jumpSpecs) {
        tracker.reset()
        try {
          const result = await demo.step(spec.slug, spec.name, async () => {
            await clickTopMenuItem(page, spec.group, spec.item)
            await expect(page).toHaveURL(
              new RegExp(`${escapeRegExp(spec.route)}(?:$|[?#])`),
              { timeout: 25_000 },
            )
            await waitForPageReady(page)
            const actualUrl = page.url()
            const actualTitle = await readPageTitle(page)
            /* URL 与标题都要变：只变 URL 说明标题/标签没跟上，只变标题说明没真跳转。 */
            expect(actualTitle, `跳转后标题应为「${spec.title}」`).toContain(
              spec.title,
            )
            const errors = tracker.drain()
            return {
              actualUrl,
              actualTitle,
              errors,
              meta: {
                route: spec.route,
                title: actualTitle,
                kind: 'list',
                errors,
              },
              note: `URL=${actualUrl}；标题=${actualTitle}`,
            }
          })
          jumps.push({
            name: spec.name,
            group: spec.group,
            item: spec.item,
            expectedRoute: spec.route,
            actualUrl: result.actualUrl,
            expectedTitle: spec.title,
            actualTitle: result.actualTitle,
            ok: true,
            slug: spec.slug,
            note: `URL=${result.actualUrl}；标题=${result.actualTitle}；控制台错误=${result.errors.length}`,
          })
        } catch (error) {
          const message = toErrorMessage(error)
          failures.push(`${spec.name}：${message}`)
          jumps.push({
            name: spec.name,
            group: spec.group,
            item: spec.item,
            expectedRoute: spec.route,
            actualUrl: page.url(),
            expectedTitle: spec.title,
            actualTitle: '',
            ok: false,
            slug: spec.slug,
            note: message,
          })
          console.warn(`[system-tour] ${spec.name} 失败：${message}`)
        }
      }

      /* 4. 标签页：切回「销售订单」标签 → 关闭「采购订单」标签。 */
      const tabs = layoutTabs(page)
      const tabCountBefore = await tabs.count()
      tracker.reset()

      try {
        await demo.step(
          'tabs-switch',
          '标签页：点击「销售订单」标签切回',
          async () => {
            const target = page
              .locator('.leo-tabbar .leo-tabbar-label')
              .filter({ hasText: '销售订单' })
              .first()
            await expect(target).toBeVisible({ timeout: 20_000 })
            await target.click()
            await expect(page).toHaveURL(/\/sales-order(?:$|[?#])/, {
              timeout: 20_000,
            })
            await waitForPageReady(page)
            const count = await tabs.count()
            const activeTitle = await readPageTitle(page)
            return {
              meta: { tabCount: count, activeTitle, kind: 'list' },
              note: `切回后标签数=${count}；当前页=${activeTitle}`,
            }
          },
        )
      } catch (error) {
        const message = toErrorMessage(error)
        failures.push(`标签页切换：${message}`)
        console.warn(`[system-tour] 标签页切换失败：${message}`)
      }

      try {
        await demo.step(
          'tabs-close',
          '标签页：关闭「采购订单」标签',
          async () => {
            const target = tabs.filter({ hasText: '采购订单' }).first()
            if ((await target.count()) === 0) {
              throw new Error(
                '标签条里没有「采购订单」标签（可能被已打开标签上限淘汰）',
              )
            }
            await target.hover()
            await target
              .locator('.ant-tabs-tab-remove')
              .first()
              .click({ timeout: 10_000 })
            await expect(tabs).toHaveCount(tabCountBefore - 1, {
              timeout: 25_000,
            })
            const after = await tabs.count()
            return {
              meta: { before: tabCountBefore, after, kind: 'list' },
              note: `关闭前=${tabCountBefore}；关闭后=${after}`,
            }
          },
        )
      } catch (error) {
        const message = toErrorMessage(error)
        failures.push(`标签页关闭：${message}`)
        console.warn(`[system-tour] 标签页关闭失败：${message}`)
      }
    } catch (error) {
      /* 登录或注册表解析这类公共前置失败：整轮已经没有可巡检的内容。 */
      const message = toErrorMessage(error)
      failures.push(`公共前置：${message}`)
      console.error(`[system-tour] 公共前置失败，巡检中断：${message}`)
      throw error
    } finally {
      /*
       * 落盘顺序：先写 `createDemoRecorder` 的 manifest（步骤与截图路径的唯一权威），
       * 再按截图里的 slug 反查绝对路径，生成任务要求的「每页一条」pages.json。
       */
      await demo.flush()
      try {
        const manifest = JSON.parse(
          await fs.readFile(demo.manifestPath, 'utf8'),
        ) as { steps?: Array<{ no: string; slug: string; screenshot: string }> }
        const stepBySlug = new Map(
          (manifest.steps ?? []).map((step) => [step.slug, step]),
        )
        /*
         * 页面序号取**列表首屏那一步**的编号（截图文件名前缀），而不是注册表下标：
         * 这样 `pages.json` 里的 no 与 `NN-<page>-list.png` 的 NN 严格一致。
         */
        const pages: TourPageResult[] = drafts.map((draft) => ({
          no: stepBySlug.get(draft.listSlug)?.no ?? draft.no,
          route: draft.route,
          key: draft.key,
          titleKey: draft.titleKey,
          title: draft.title,
          hiddenInMenu: draft.hiddenInMenu,
          rows: draft.rows,
          kind: draft.kind,
          overlayTitle: draft.overlayTitle,
          overlayKind: draft.overlayKind,
          listScreenshot: stepBySlug.get(draft.listSlug)?.screenshot ?? '',
          overlayScreenshot: draft.overlayKind
            ? stepBySlug.get(draft.overlaySlug)?.screenshot
            : undefined,
          errors: draft.errors,
          error: draft.error,
        }))
        const resolvedJumps: TourJumpResult[] = jumps.map((jump) => ({
          name: jump.name,
          group: jump.group,
          item: jump.item,
          expectedRoute: jump.expectedRoute,
          actualUrl: jump.actualUrl,
          expectedTitle: jump.expectedTitle,
          actualTitle: jump.actualTitle,
          ok: jump.ok,
          screenshot: stepBySlug.get(jump.slug)?.screenshot,
          note: jump.note,
        }))
        const summary = {
          routeCount: pages.length,
          loaded: pages.filter((entry) => !entry.error).length,
          withRows: pages.filter((entry) => entry.rows > 0).length,
          detail: pages.filter((entry) => entry.kind === 'detail').length,
          editor: pages.filter((entry) => entry.kind === 'editor').length,
          list: pages.filter((entry) => entry.kind === 'list').length,
          none: pages.filter((entry) => entry.kind === 'none').length,
          pagesWithConsoleErrors: pages.filter(
            (entry) => entry.errors.length > 0,
          ).length,
          consoleErrorTotal: pages.reduce(
            (total, entry) => total + entry.errors.length,
            0,
          ),
          jumpsOk: resolvedJumps.filter((jump) => jump.ok).length,
          failures: failures.length,
        }
        await writeJsonFile(path.join(demo.dir, 'pages.json'), {
          flow: 'system-tour',
          title: '全站页面与跳转巡检',
          generatedAt: new Date().toISOString(),
          viewport: TOUR_VIEWPORT,
          /* 步骤级清单（截图路径的唯一权威）由 createDemoRecorder 写在同目录 manifest.json。 */
          manifestPath: demo.manifestPath,
          summary,
          pages,
          jumps: resolvedJumps,
          failures,
        })
        console.log(
          `[system-tour] 汇总：${JSON.stringify(summary)}\n` +
            `[system-tour] 清单 -> ${path.join(demo.dir, 'pages.json')}`,
        )
      } catch (error) {
        console.warn(
          `[system-tour] pages.json 生成失败（manifest.json 已正常落盘）：${toErrorMessage(error)}`,
        )
      }

      if (failures.length > 0) {
        test.info().annotations.push({
          type: 'tour-failures',
          description: failures.join(' | '),
        })
      }
    }

    /* 巡检至少要把全部页面都走一遍：页面清单被解析坏时这里会红，避免「静默漏页」。 */
    expect(drafts.length, '巡检页面数与注册表解析结果不一致').toBe(
      (await collectRoutablePages()).length,
    )
  })
})

/** 巡检过程中每页的草稿（截图路径在 finally 里从 manifest 反查后补齐）。 */
interface PageDraft
  extends Omit<TourPageResult, 'listScreenshot' | 'overlayScreenshot'> {
  /** 列表首屏步骤的 slug（对应 manifest 里的截图）。 */
  listSlug: string
  /** 弹层步骤的 slug。 */
  overlaySlug: string
}

/** 正则转义（路由里有 `-`，只有 `/` 需要转义也可以，统一处理更稳）。 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
