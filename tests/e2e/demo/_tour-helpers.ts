import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { type ConsoleMessage, expect, type Page } from '@playwright/test'
import { loginE2e } from '../ops-e2e-support'
import { activeTabPanel } from './_demo-helpers'

/**
 * 全站页面巡检（`04-system-tour`）专用辅助。
 *
 * <p>**只放「巡检需要、但截图/manifest 工具不该关心」的能力**：从 `src/config/page-registry*.ts`
 * 解析可路由页面清单、页面就绪等待、列表行/弹层判定、顶部菜单与标签页操作、控制台错误收集。
 * 截图与 manifest 一律复用 `./_demo-helpers` 的 `createDemoRecorder`（Lead 指定该文件由
 * task-9 独占，不重复造第二套截图工具）。</p>
 *
 * <p>页面清单**运行时从注册表源码解析**，不写死数组：新增/退役页面后巡检自动跟上。
 * 解析结果异常（少于 20 条，说明格式被我改坏或注册表大改）时回退到内置快照并打印告警 ——
 * 宁可巡检旧清单，也不要静默只巡一半页面。</p>
 *
 * <p>**只有 Lead 统一串行执行**：共享账号并发会话上限 3，本脚本自己跑会驱逐别人的会话。</p>
 */

/** 视口与 demo 工具保持一致（1600×1000，宽屏能同时看到列表全部列与详情指标卡）。 */
export const TOUR_VIEWPORT = { width: 1600, height: 1000 } as const

/** 菜单分组顺序：与 `src/config/navigation-registry.ts` 的 `menuGroupOrder` 保持一致。 */
export const MENU_GROUP_ORDER = [
  'master',
  'market',
  'purchase',
  'sales',
  'inventory',
  'freight',
  'statements',
  'finance',
  'system',
] as const

/** 从 `page-registry-*.ts` 解析出来的一条页面定义（只保留巡检需要的字段）。 */
export interface RegistryPage {
  /** `AppPageDefinition.key`。 */
  key: string
  /** 实际路由（= `menuKey`，注册表里带前导斜杠）。 */
  route: string
  /** 页面标题的 i18n key（运行时标题以 DOM 为准，这里只做兜底/日志）。 */
  titleKey: string
  /** 视图类型（`business-grid` / `master-material` / ...）。 */
  view: string
  /** 所属菜单分组（`menuParent`）。 */
  group?: string
  /** 是否隐藏于菜单（`hiddenInMenu`，如资金流水：有独立路由但不进菜单）。 */
  hiddenInMenu: boolean
  /** 是否 `routeless` 被并页（有页面定义但没有独立路由，入口是宿主页的 `?tab=`）。 */
  routeless: boolean
  /** 访问所需权限码（缺省=所有登录用户可见）。 */
  requiredPermission?: string
  /** 来源文件名，便于排查解析异常。 */
  sourceFile: string
}

/**
 * 解析失败时的兜底清单（约 2026-11 的 29 个可路由页面，已按菜单顺序排好）。
 *
 * <p>只在注册表解析异常时使用；正常路径完全以 `src/config/page-registry*.ts` 为准。</p>
 */
export const PAGES_FALLBACK_SNAPSHOT: ReadonlyArray<
  Pick<
    RegistryPage,
    'key' | 'route' | 'titleKey' | 'view' | 'group' | 'hiddenInMenu'
  >
> = [
  {
    key: 'dashboard',
    route: '/dashboard',
    titleKey: 'pages.dashboard',
    view: 'dashboard',
    hiddenInMenu: false,
  },
  {
    key: 'material',
    route: '/material',
    titleKey: 'pages.material',
    view: 'master-material',
    group: 'master',
    hiddenInMenu: false,
  },
  {
    key: 'supplier',
    route: '/supplier',
    titleKey: 'pages.supplier',
    view: 'business-grid',
    group: 'master',
    hiddenInMenu: false,
  },
  {
    key: 'customer',
    route: '/customer',
    titleKey: 'pages.customer',
    view: 'business-grid',
    group: 'master',
    hiddenInMenu: false,
  },
  {
    key: 'project',
    route: '/project',
    titleKey: 'pages.project',
    view: 'master-project',
    group: 'master',
    hiddenInMenu: false,
  },
  {
    key: 'carrier',
    route: '/carrier',
    titleKey: 'pages.carrier',
    view: 'business-grid',
    group: 'master',
    hiddenInMenu: false,
  },
  {
    key: 'warehouse',
    route: '/warehouse',
    titleKey: 'pages.warehouse',
    view: 'business-grid',
    group: 'master',
    hiddenInMenu: false,
  },
  {
    key: 'price-compare',
    route: '/price-compare',
    titleKey: 'pages.price-compare',
    view: 'price-compare',
    group: 'market',
    hiddenInMenu: false,
  },
  {
    key: 'supplier-quote',
    route: '/supplier-quote',
    titleKey: 'pages.supplier-quote',
    view: 'supplier-quote',
    group: 'market',
    hiddenInMenu: false,
  },
  {
    key: 'market-sync',
    route: '/market-sync',
    titleKey: 'pages.market-sync',
    view: 'market-sync',
    group: 'market',
    hiddenInMenu: false,
  },
  {
    key: 'purchase-order',
    route: '/purchase-order',
    titleKey: 'pages.purchase-order',
    view: 'business-grid',
    group: 'purchase',
    hiddenInMenu: false,
  },
  {
    key: 'purchase-inbound',
    route: '/purchase-inbound',
    titleKey: 'pages.purchase-inbound',
    view: 'business-grid',
    group: 'purchase',
    hiddenInMenu: false,
  },
  {
    key: 'sales-order',
    route: '/sales-order',
    titleKey: 'pages.sales-order',
    view: 'business-grid',
    group: 'sales',
    hiddenInMenu: false,
  },
  {
    key: 'sales-contract',
    route: '/sales-contract',
    titleKey: 'pages.sales-contract',
    view: 'sales-contract',
    group: 'sales',
    hiddenInMenu: false,
  },
  {
    key: 'sales-outbound',
    route: '/sales-outbound',
    titleKey: 'pages.sales-outbound',
    view: 'business-grid',
    group: 'sales',
    hiddenInMenu: false,
  },
  {
    key: 'sales-return',
    route: '/sales-return',
    titleKey: 'pages.sales-return',
    view: 'business-grid',
    group: 'sales',
    hiddenInMenu: false,
  },
  {
    key: 'inventory',
    route: '/inventory',
    titleKey: 'pages.inventory',
    view: 'inventory',
    group: 'inventory',
    hiddenInMenu: false,
  },
  {
    key: 'freight-bill',
    route: '/freight-bill',
    titleKey: 'pages.freight-bill',
    view: 'business-grid',
    group: 'freight',
    hiddenInMenu: false,
  },
  {
    key: 'customer-statement',
    route: '/customer-statement',
    titleKey: 'pages.customer-statement',
    view: 'business-grid',
    group: 'statements',
    hiddenInMenu: false,
  },
  {
    key: 'freight-statement',
    route: '/freight-statement',
    titleKey: 'pages.freight-statement',
    view: 'business-grid',
    group: 'statements',
    hiddenInMenu: false,
  },
  {
    key: 'finance-overview',
    route: '/finance-overview',
    titleKey: 'pages.finance-overview',
    view: 'finance-overview',
    group: 'finance',
    hiddenInMenu: false,
  },
  {
    key: 'receipt',
    route: '/receipt',
    titleKey: 'pages.receipt',
    view: 'business-grid',
    group: 'finance',
    hiddenInMenu: false,
  },
  {
    key: 'payment',
    route: '/payment',
    titleKey: 'pages.payment',
    view: 'business-grid',
    group: 'finance',
    hiddenInMenu: false,
  },
  {
    key: 'cash-ledger',
    route: '/cash-ledger',
    titleKey: 'pages.cash-ledger',
    view: 'cash-ledger',
    group: 'finance',
    hiddenInMenu: true,
  },
  {
    key: 'company-setting',
    route: '/company-setting',
    titleKey: 'pages.company-setting',
    view: 'company-setting',
    group: 'system',
    hiddenInMenu: false,
  },
  {
    key: 'print-template',
    route: '/print-template',
    titleKey: 'pages.print-template',
    view: 'print-template',
    group: 'system',
    hiddenInMenu: false,
  },
  {
    key: 'operation-log',
    route: '/operation-log',
    titleKey: 'pages.operation-log',
    view: 'operation-log',
    group: 'system',
    hiddenInMenu: false,
  },
  {
    key: 'role-management',
    route: '/role',
    titleKey: 'pages.role-management',
    view: 'role-management',
    group: 'system',
    hiddenInMenu: false,
  },
  {
    key: 'user-accounts',
    route: '/user-accounts',
    titleKey: 'pages.user-accounts',
    view: 'user-accounts',
    group: 'system',
    hiddenInMenu: false,
  },
]

/** 巡检时对每条路由做的判定结果（写进 `pages.json`）。 */
export interface TourPageResult {
  /** 页面序号（两位，与截图文件名前缀一致）。 */
  no: string
  /** 路由。 */
  route: string
  /** 注册表 key。 */
  key: string
  /** i18n 标题 key（注册表值，DOM 标题缺失时兜底）。 */
  titleKey: string
  /** 运行时读到的页面标题（优先取外壳标签文本）。 */
  title: string
  /** 是否隐藏于菜单。 */
  hiddenInMenu: boolean
  /** 列表数据行数（`tbody tr.ant-table-row`）。 */
  rows: number
  /** 双击首行的结果：detail=详情弹层 editor=编辑弹层 list=没有弹层 none=无数据行。 */
  kind: 'detail' | 'editor' | 'list' | 'none'
  /** 弹层标题（`kind` 为 detail/editor 时）。 */
  overlayTitle?: string
  /** 双击后实际探测到的弹层类型（`other` 表示弹层存在但既不是详情也不是编辑器）。 */
  overlayKind?: 'detail' | 'editor' | 'other'
  /** 列表整屏截图绝对路径。 */
  listScreenshot: string
  /** 弹层截图绝对路径（双击首行成功打开弹层时）。 */
  overlayScreenshot?: string
  /** 该页加载/交互期间收集到的控制台错误（已过滤良性噪声）。 */
  errors: string[]
  /** 加载失败原因（页面打不开/超时等）。 */
  error?: string
}

/** 跳转检查点结果（写进 `pages.json.jumps`）。 */
export interface TourJumpResult {
  name: string
  group: string
  item: string
  expectedRoute: string
  actualUrl: string
  expectedTitle: string
  actualTitle: string
  ok: boolean
  screenshot?: string
  note?: string
}

/* -------------------------------------------------------------------------- */
/* 仓库根与注册表解析                                                          */
/* -------------------------------------------------------------------------- */

/** 定位仓库根（`src/config/page-registry.ts` + `package.json` 所在目录）。 */
export function resolveRepoRoot(startDir = process.cwd()): string {
  let current = path.resolve(startDir)
  for (let depth = 0; depth < 5; depth += 1) {
    if (
      existsSync(path.join(current, 'src', 'config', 'page-registry.ts')) &&
      existsSync(path.join(current, 'package.json'))
    ) {
      return current
    }
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return path.resolve(startDir)
}

/**
 * 解析单个注册表文件里的页面定义块。
 *
 * <p>注册表是「`export const xxxPageDefinitions: AppPageDefinition[] = [ {...}, {...} ]`」，
 * 顶层元素固定缩进两个空格。按行扫描 `  {` / `  },` 切块，再在块内取字段 —— 不做完整
 * TS 解析，够用且不引依赖；注释行不参与取值（注册表里有大段中文说明）。</p>
 */
function parseRegistryFile(source: string, sourceFile: string): RegistryPage[] {
  const blocks: string[][] = []
  let current: string[] | null = null
  for (const line of source.split(/\r?\n/)) {
    if (/^\s{2}\{\s*$/.test(line)) {
      current = []
      continue
    }
    if (current && /^\s{2}\},?\s*$/.test(line)) {
      blocks.push(current)
      current = null
      continue
    }
    if (current) current.push(line)
  }

  const pages: RegistryPage[] = []
  for (const block of blocks) {
    const code = block
      .filter((line) => {
        const trimmed = line.trim()
        return (
          trimmed.length > 0 &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('*')
        )
      })
      .join('\n')
    const stringField = (field: string): string | undefined =>
      new RegExp(`\\b${field}:\\s*'([^']*)'`).exec(code)?.[1]
    const flagField = (field: string): boolean =>
      new RegExp(`\\b${field}:\\s*true`).test(code)

    const key = stringField('key')
    const menuKey = stringField('menuKey')
    if (!key || !menuKey) continue
    pages.push({
      key,
      route: menuKey,
      titleKey: stringField('titleKey') ?? '',
      view: stringField('view') ?? '',
      group: stringField('menuParent'),
      hiddenInMenu: flagField('hiddenInMenu'),
      routeless: flagField('routeless'),
      requiredPermission: stringField('requiredPermission'),
      sourceFile,
    })
  }
  return pages
}

/** 读取注册表目录下全部 `page-registry-*.ts`（排除纯类型文件）。 */
export async function readRegistryPages(
  repoRoot = resolveRepoRoot(),
): Promise<RegistryPage[]> {
  const dir = path.join(repoRoot, 'src', 'config')
  const entries = await fs.readdir(dir)
  const files = entries
    .filter((file) => /^page-registry-.*\.ts$/.test(file))
    .filter((file) => !file.endsWith('-types.ts'))
    .sort()
  const pages: RegistryPage[] = []
  for (const file of files) {
    const source = await fs.readFile(path.join(dir, file), 'utf8')
    pages.push(...parseRegistryFile(source, file))
  }
  return pages
}

/** 按菜单分组排序（工作台固定最前），组内保持注册表文件顺序。 */
function sortByMenuOrder(pages: RegistryPage[]): RegistryPage[] {
  const rank = (page: RegistryPage): number => {
    if (page.route === '/dashboard') return -1
    const index = MENU_GROUP_ORDER.indexOf(
      (page.group ?? '') as (typeof MENU_GROUP_ORDER)[number],
    )
    return index < 0 ? MENU_GROUP_ORDER.length : index
  }
  return pages
    .map((page, index) => ({ page, index }))
    .sort(
      (left, right) =>
        rank(left.page) - rank(right.page) || left.index - right.index,
    )
    .map((entry) => entry.page)
}

/**
 * 巡检目标页面：注册表里**所有非 routeless 页面**（有独立路由的页面）。
 *
 * <p>`routeless` 是被并进宿主页标签的定义（商品类别 / 定尺加价 / 值映射 / 取价地区），
 * 没有独立路由，访问旧深链会落到宿主页，不参与逐页 goto。</p>
 */
export async function collectRoutablePages(
  repoRoot = resolveRepoRoot(),
): Promise<RegistryPage[]> {
  const all = await readRegistryPages(repoRoot)
  const routable = all.filter((page) => !page.routeless)
  if (routable.length >= 20) return sortByMenuOrder(routable)

  console.warn(
    `[system-tour] 注册表解析只得到 ${routable.length} 个可路由页面，回退到内置快照` +
      `（${PAGES_FALLBACK_SNAPSHOT.length} 条）。请检查注册表格式是否改变` +
      '（解析逻辑见 tests/e2e/demo/_tour-helpers.ts）。',
  )
  return sortByMenuOrder(
    PAGES_FALLBACK_SNAPSHOT.map((page) => ({
      ...page,
      routeless: false,
      requiredPermission: undefined,
      sourceFile: 'snapshot',
    })),
  )
}

/* -------------------------------------------------------------------------- */
/* 控制台错误收集                                                              */
/* -------------------------------------------------------------------------- */

/** 控制台错误收集器：按「当前页面」分段，`reset` 开新段、`drain` 取走本段。 */
export interface ConsoleTracker {
  reset: () => void
  drain: () => string[]
}

const BENIGN_CONSOLE_PATTERNS = [
  /ResizeObserver loop/i,
  /Failed to load resource: the server responded with a status of 4\d\d/,
  /Failed to read the 'localStorage' property from 'Window'/,
  /Accessing element\.ref was removed in React 19/,
  /* 详情面网价核查的请求会在页面切换时被主动取消，属预期噪声。 */
  /net-price-check/i,
]

function isBenignConsole(message: string): boolean {
  return BENIGN_CONSOLE_PATTERNS.some((pattern) => pattern.test(message))
}

/**
 * 收集控制台 error 与未捕获异常（**不判红，只记录**）。
 *
 * <p>巡检的产物是「哪里亮红灯」的清单，不是「一条断言失败就中断整轮」：页面级错误
 * 写进 manifest 对应条目，由人看报告决定修哪一页。</p>
 */
export function trackConsoleErrors(page: Page): ConsoleTracker {
  let bucket: string[] = []
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error') return
    const text = message.text().trim()
    if (!text || isBenignConsole(text)) return
    bucket.push(text.slice(0, 300))
  })
  page.on('pageerror', (error) => {
    bucket.push(`pageerror: ${error.message.slice(0, 300)}`)
  })
  return {
    reset: () => {
      bucket = []
    },
    drain: () => {
      const drained = bucket
      bucket = []
      return drained
    },
  }
}

/* -------------------------------------------------------------------------- */
/* 页面就绪与标题                                                              */
/* -------------------------------------------------------------------------- */

/** 补齐会话 permissions：e2e 注入的用户对象丢了 permissions，权限过滤会让菜单/标签缺失。 */
export async function ensureFullPermissions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      const raw = localStorage.getItem('aries-user')
      if (!raw) return
      const user = JSON.parse(raw) as Record<string, unknown>
      localStorage.setItem(
        'aries-user',
        JSON.stringify({ ...user, permissions: ['*'] }),
      )
    } catch {
      /* 用户 JSON 坏了就让页面按未登录处理，交给巡检结果暴露。 */
    }
  })
}

/**
 * 直接 goto；若落到登录页则重新登录后重试一次。
 *
 * <p>判定要**两条都看**：URL 变 `/login` 是一种；还有一种更隐蔽 —— 应用渲染了登录表单
 * 但 URL 仍是目标路由（会话恢复失败时的兜底跳转），只看 URL 会误判为「页面已加载」，
 * 后续标题/数据行全部取不到。共享账号并发会话上限 3，巡检 29 页期间被挤掉是现实风险。</p>
 */
export async function tourGoto(page: Page, route: string): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(300)
    const redirectedToLogin = /\/login(?:\?|$)/.test(page.url())
    const loginFormVisible = await page
      .locator('#loginName')
      .isVisible()
      .catch(() => false)
    if (!redirectedToLogin && !loginFormVisible) return
    await loginE2e(page)
  }
  await page.goto(route, { waitUntil: 'domcontentloaded' })
}

/**
 * 等首屏稳定：页面标题（或外壳标签）可见 + 骨架/加载态收尾。
 *
 * <p>超时都不抛，交给调用方按「页面失败」记录并继续下一页 —— 巡检不能因为某一页
 * 渲染慢就整轮停住。两层标记取「先到者」：部分页面（工作台 / 独立视图）没有
 * `.app-pro-page-accessible-header`，但外壳标签一定有。</p>
 */
export async function waitForPageReady(page: Page): Promise<void> {
  const readyMarker = page
    .locator(
      '.app-pro-page-accessible-header h1, .leo-tabbar .ant-tabs-tab-active .leo-tabbar-label, h1',
    )
    .first()
  await readyMarker
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => undefined)
  await page
    .locator('.ant-spin-spinning')
    .first()
    .waitFor({ state: 'hidden', timeout: 8_000 })
    .catch(() => undefined)
  /* lazy 路由 chunk + 首屏接口一般在这段时间内收尾，截图才是稳定画面。 */
  await page.waitForTimeout(500)
}

/**
 * 读页面标题：优先外壳标签文本（业务页标签即页面名），其次页面 h1。
 *
 * <p>dashboard 的 h1 是问候语（「你好，xxx」），标签文本才是「工作台」。</p>
 */
export async function readPageTitle(page: Page): Promise<string> {
  const tabLabel = await page
    .locator('.leo-tabbar .ant-tabs-tab-active .leo-tabbar-label')
    .first()
    .textContent()
    .catch(() => '')
  if (tabLabel?.trim()) return tabLabel.trim()
  const heading = await page
    .locator('.app-pro-page-accessible-header h1, h1')
    .first()
    .textContent()
    .catch(() => '')
  return (heading || '').trim()
}

/**
 * 巡检用的「当前页签面板」作用域。
 *
 * <p>布局层把**非激活页签**的 DOM 用 React 19 `Activity` 以 `display:none` 保留
 * （`data-tab-active="true"` 是激活态锚点，见 `AppTabContainer`）：里面的表格行仍然存在，
 * 直接 `tbody tr` 会先命中隐藏行。优先限制在激活面板内，面板不存在时退回整页。</p>
 */
async function activeScope(page: Page) {
  const panel = activeTabPanel(page)
  return (await panel.count()) > 0 ? panel : page
}

/**
 * 列表数据行数（排除 antd 的测量行；只数当前激活页签内的可见行）。
 *
 * <p>**必须先等数据行出现再计数**：首屏就绪（标题可见）不等于接口已返回，
 * 直接 count 会把「还在加载」记成「无数据」，后面的双击探测因此被全部跳过
 * （实测 `/customer` 首屏 15 行只数到 0）。8s 内没有数据行按空页处理；
 * 结果为 0 时再等 2s 复测一次，兜住慢接口 / 骨架屏二次渲染。</p>
 */
export async function countDataRows(page: Page): Promise<number> {
  const scope = await activeScope(page)
  await scope
    .locator('tbody tr.ant-table-row')
    .first()
    .waitFor({ state: 'visible', timeout: 8_000 })
    .catch(() => undefined)
  const countVisible = () =>
    scope.locator('tbody tr.ant-table-row:visible').count()
  const firstCount = await countVisible()
  if (firstCount > 0) return firstCount
  await page.waitForTimeout(2_000)
  return countVisible()
}

/* -------------------------------------------------------------------------- */
/* 弹层判定与关闭                                                              */
/* -------------------------------------------------------------------------- */

/** 双击首行后的弹层判定结果。 */
export interface OverlayProbe {
  kind: 'detail' | 'editor' | 'other' | 'none'
  title: string
  panelFound: boolean
}

/**
 * 双击列表首行，判定打开的是「详情」还是「编辑弹层」。
 *
 * <p>判定口径（与仓库既有约定一致）：</p>
 * <ul>
 *   <li>详情：弹层内出现 `.module-detail-surface` / `.module-detail-card`
 *       （`ModuleRecordDetailContent`）；</li>
 *   <li>编辑器：弹层内出现 `.editor-form-shell` 或「保存」按钮
 *       （`ModuleEditorWorkspace`）；</li>
 *   <li>其它：弹层/modal 存在但两者都不匹配（如确认框、导入预览）。</li>
 * </ul>
 */
export async function openFirstRowOverlay(page: Page): Promise<OverlayProbe> {
  const scope = await activeScope(page)
  const row = scope.locator('tbody tr.ant-table-row:visible').first()
  if ((await row.count()) === 0) {
    return { kind: 'none', title: '', panelFound: false }
  }
  await row.dblclick({ timeout: 15_000 }).catch(() => undefined)
  await page.waitForTimeout(1_200)

  const panel = page.locator('.workspace-overlay-panel:visible').last()
  if ((await panel.count()) > 0) {
    const title = (
      await panel
        .locator('.workspace-overlay-title')
        .first()
        .textContent()
        .catch(() => '')
    )?.trim()
    const detailMarkers = await panel
      .locator(
        '.module-detail-surface, .module-detail-card, .module-record-detail-content',
      )
      .count()
    const editorMarkers = await panel
      .locator('.editor-form-shell, .module-editor-form-shell')
      .count()
    const saveButtons = await panel
      .getByRole('button', { name: /保\s*存/ })
      .count()
    const kind: OverlayProbe['kind'] =
      detailMarkers > 0
        ? 'detail'
        : editorMarkers > 0 || saveButtons > 0
          ? 'editor'
          : 'other'
    return { kind, title: title || '', panelFound: true }
  }

  /* 抽屉（antd Drawer）：角色管理 / 用户账号等页面的编辑入口可能是抽屉而不是浮层。 */
  const drawer = page.locator('.ant-drawer-content:visible').last()
  if ((await drawer.count()) > 0) {
    const title = (
      await drawer
        .locator('.ant-drawer-title')
        .first()
        .textContent()
        .catch(() => '')
    )?.trim()
    const editorMarkers = await drawer
      .locator('.editor-form-shell, form')
      .count()
    return {
      kind: editorMarkers > 0 ? 'editor' : 'other',
      title: title || '',
      panelFound: true,
    }
  }

  const modal = page.locator('.ant-modal:visible').last()
  if ((await modal.count()) > 0) {
    const title = (
      await modal
        .locator('.ant-modal-title')
        .first()
        .textContent()
        .catch(() => '')
    )?.trim()
    const detailMarkers = await modal.locator('.module-detail-surface').count()
    const editorMarkers = await modal
      .locator('.editor-form-shell, form')
      .count()
    const kind: OverlayProbe['kind'] =
      detailMarkers > 0 ? 'detail' : editorMarkers > 0 ? 'editor' : 'other'
    return { kind, title: title || '', panelFound: true }
  }

  return { kind: 'none', title: '', panelFound: false }
}

/**
 * 关闭当前弹层（Escape → 确认框 → 关闭按钮兜底），确保下一页巡检从干净状态开始。
 *
 * <p>编辑器按 Esc 可能弹「放弃修改？」确认框；这里点主按钮确认放弃（巡检没有修改过内容，
 * 正常情况下不会出现）。</p>
 */
export async function dismissOverlays(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const panel = page.locator('.workspace-overlay-panel:visible').last()
    if ((await panel.count()) === 0) break
    await page.keyboard.press('Escape').catch(() => undefined)
    await page.waitForTimeout(350)
    const confirm = page.locator('.ant-modal-confirm:visible').last()
    if ((await confirm.count()) > 0) {
      await confirm
        .locator('.ant-btn-primary')
        .last()
        .click({ timeout: 5_000 })
        .catch(() => undefined)
      await page.waitForTimeout(300)
    }
  }

  const leftover = page.locator('.workspace-overlay-panel:visible').last()
  if ((await leftover.count()) > 0) {
    await leftover
      .locator('.workspace-overlay-close')
      .first()
      .click({ timeout: 5_000 })
      .catch(() => undefined)
    await page.waitForTimeout(300)
  }

  const drawer = page.locator('.ant-drawer-content:visible').last()
  if ((await drawer.count()) > 0) {
    await drawer
      .locator('.ant-drawer-close')
      .first()
      .click({ timeout: 5_000 })
      .catch(() => page.keyboard.press('Escape').catch(() => undefined))
    await page.waitForTimeout(300)
  }

  const modal = page.locator('.ant-modal:visible').last()
  if ((await modal.count()) > 0) {
    await page.keyboard.press('Escape').catch(() => undefined)
    await page.waitForTimeout(250)
  }
}

/* -------------------------------------------------------------------------- */
/* 顶部菜单与标签页                                                            */
/* -------------------------------------------------------------------------- */

/** 点顶部菜单分组 → 子菜单项（SPA 内跳转，保留标签页状态）。 */
export async function clickTopMenuItem(
  page: Page,
  group: string,
  item: string,
): Promise<void> {
  const groupTrigger = page
    .getByRole('menuitem', { name: group, exact: true })
    .first()
  await expect(groupTrigger).toBeVisible({ timeout: 20_000 })
  await groupTrigger.click()
  const menuItems = page.locator(
    '.ant-menu-submenu-popup:visible .ant-menu-item, .ant-menu-popup:visible .ant-menu-item',
  )
  const target = menuItems.filter({ hasText: item }).first()
  await expect(target).toBeVisible({ timeout: 20_000 })
  await target.click()
}

/** 标签页条（`.leo-tabbar` 里的 antd tab）。 */
export function layoutTabs(page: Page) {
  return page.locator('.leo-tabbar .ant-tabs-tab')
}

/* -------------------------------------------------------------------------- */
/* 通用小工具                                                                  */
/* -------------------------------------------------------------------------- */

/** 路由 → 文件名短名（`/user-accounts` → `user-accounts`）。 */
export function pageSlug(route: string): string {
  const trimmed = route.replace(/^\/+/, '')
  const slug = trimmed
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug || 'root'
}

/** 错误信息压成单行（manifest 里只留一行，最多 400 字）。 */
export function toErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const firstLine = raw.split('\n')[0]?.trim() || raw.trim()
  return firstLine.slice(0, 400)
}

/** 写 JSON 文件（自动建目录）。 */
export async function writeJsonFile(
  filePath: string,
  value: unknown,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}
