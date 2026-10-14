import { expect, type Page } from '@playwright/test'
import {
  buttonName,
  expectGridTable,
  expectModuleHeading,
  gotoRoute,
  loginAsE2eUser,
} from './support/business-e2e'
import { captureRunArtifact, writeRunFixture } from './support/run-output'
import { test } from './support/test'

/**
 * 商品资料「导入预览」弹层不得越出覆盖层容器。
 *
 * <p>修复前是 antd Modal（`width=920`，挂在 body 上）：高度跟内容长，35 行预览实测 3845px，
 * 而覆盖层容器（内容区 `.page-stack`）只有 1233×655 —— 标题与「取消 / 确认导入」被顶到容器
 * 外，右侧还透出底层列表页表格与分页。这里在四个视口下用真实后端 dry-run 预览（不落库）
 * 锁定三条不变量：面板在覆盖层容器内、纵向滚动发生在面板内部、横向没有内容越界。</p>
 */

/** 预览表格每页 10 行，且每行 13 条字段差异 —— 足够把面板撑到需要内部滚动。 */
const PREVIEW_ROW_COUNT = 35

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
] as const

const CSV_HEADERS = [
  '商品编码',
  '品牌',
  '材质',
  '类别',
  '规格',
  '长度',
  '单位',
  '数量单位',
  '件重(吨)',
  '每件支数',
  '单价',
  '备注',
]

/** 商品编码留空 → 后端生成 18 位雪花编码，每行都会产出「商品编码: 空 → 3688…」这类差异。 */
function buildCsv() {
  const brands = ['武钢襄钢', '鄂钢', '沙钢', '永钢', '中天']
  const materials = ['HRB400', 'HRB400E', 'HRB500']
  const lines = [CSV_HEADERS.join(',')]
  for (let index = 0; index < PREVIEW_ROW_COUNT; index += 1) {
    lines.push(
      [
        '',
        brands[index % brands.length],
        materials[index % materials.length],
        '螺纹钢',
        String(12 + (index % 20)),
        `${8 + (index % 4)}米`,
        '吨',
        '件',
        '0.002',
        '1',
        '3500.00',
        `导入预览溢出复现行${index + 1}`,
      ].join(','),
    )
  }
  return `${lines.join('\r\n')}\r\n`
}

async function openImportPreview(page: Page, csvPath: string) {
  await gotoRoute(page, '/material')
  await expectModuleHeading(page, '商品资料')
  await expectGridTable(page)

  const chooserPromise = page.waitForEvent('filechooser')
  await page
    .getByRole('button', { name: buttonName('导入') })
    .first()
    .click()
  const chooser = await chooserPromise
  await chooser.setFiles(csvPath)

  // 不绑定具体实现类名：旧实现是 .ant-modal，新实现是覆盖层面板，两者都带 role=dialog
  const dialog = page
    .locator('[role="dialog"]:visible')
    .filter({ hasText: '导入预览' })
    .first()
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  await expect(
    dialog.locator('tbody tr:not(.ant-table-measure-row)').first(),
  ).toBeVisible({ timeout: 30_000 })
  return dialog
}

test.describe('商品资料导入预览弹层的超框防护', () => {
  for (const viewport of VIEWPORTS) {
    test(`视口 ${viewport.width}×${viewport.height} 下预览面板不越出覆盖层容器，长内容在面板内部滚动`, async ({
      page,
      assertNoFatalUiErrors,
    }, testInfo) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })
      await loginAsE2eUser(page)

      // 夹具写进本轮 run 独立的产物目录（见 tests/e2e/README.md「产物目录与并发」）：
      // outputDir 每次 run 启动即被清空，共用 test-results 会让并发 run 互删夹具。
      const csvPath = await writeRunFixture(
        testInfo,
        `material-import-overflow-${viewport.width}x${viewport.height}.csv`,
        buildCsv(),
      )

      await openImportPreview(page, csvPath)

      const metrics = await page.evaluate(() => {
        const container = document.querySelector('.page-stack')
        const dialogEl = [
          ...document.querySelectorAll<HTMLElement>('[role="dialog"]'),
        ].find((el) => (el.textContent ?? '').includes('导入预览'))
        if (!container || !dialogEl) return null
        const rect = (el: Element | null) => {
          if (!el) return null
          const r = el.getBoundingClientRect()
          return {
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            left: Math.round(r.left),
            right: Math.round(r.right),
            width: Math.round(r.width),
            height: Math.round(r.height),
          }
        }
        const body = dialogEl.querySelector<HTMLElement>(
          '.workspace-overlay-body',
        )
        const header = dialogEl.querySelector<HTMLElement>(
          '.workspace-overlay-header',
        )
        const footer = dialogEl.querySelector<HTMLElement>(
          '.workspace-overlay-footer',
        )
        const diffCell = dialogEl.querySelector<HTMLElement>(
          '.material-import-rows-table tbody td:last-child',
        )
        return {
          doc: {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          },
          container: rect(container),
          dialog: rect(dialogEl),
          header: rect(header),
          footer: rect(footer),
          inWorkspaceOverlay: dialogEl.closest('.workspace-overlay') !== null,
          dialogClass: dialogEl.className,
          dialogScroll: {
            scrollWidth: dialogEl.scrollWidth,
            clientWidth: dialogEl.clientWidth,
          },
          body: body
            ? {
                rect: rect(body),
                scrollWidth: body.scrollWidth,
                clientWidth: body.clientWidth,
                scrollHeight: body.scrollHeight,
                clientHeight: body.clientHeight,
                overflowY: getComputedStyle(body).overflowY,
              }
            : null,
          diffCell: diffCell
            ? {
                scrollWidth: diffCell.scrollWidth,
                clientWidth: diffCell.clientWidth,
              }
            : null,
        }
      })

      expect(metrics, '未找到覆盖层容器或导入预览对话框').not.toBeNull()
      if (!metrics) return

      // 截图同样落在本轮 run 目录内；outputDir 已按 run 派生，无需 E2E_ARTIFACT_DIR
      // 这类旁路目录来规避并发 run 的清理。
      await captureRunArtifact(
        page,
        testInfo,
        `import-preview-${viewport.width}x${viewport.height}.png`,
      )

      // 1) 面板必须长在覆盖层容器里，而不是挂到 body 上按视口定位
      expect(metrics.inWorkspaceOverlay).toBe(true)
      expect(metrics.dialogClass).toContain(
        'workspace-overlay-panel--form-dialog',
      )

      // 2) 纵向：面板整体在覆盖层容器内，标题与底部按钮都不出界
      expect(metrics.container).not.toBeNull()
      const container = metrics.container!
      const dialogRect = metrics.dialog!
      expect(dialogRect.top).toBeGreaterThanOrEqual(container.top - 1)
      expect(dialogRect.bottom).toBeLessThanOrEqual(container.bottom + 1)
      expect(dialogRect.height).toBeLessThanOrEqual(container.height + 1)
      expect(metrics.header!.top).toBeGreaterThanOrEqual(container.top - 1)
      expect(metrics.header!.bottom).toBeLessThanOrEqual(container.bottom + 1)
      expect(metrics.footer!.top).toBeGreaterThanOrEqual(container.top - 1)
      expect(metrics.footer!.bottom).toBeLessThanOrEqual(container.bottom + 1)

      // 3) 长内容在面板内部滚动，而不是把面板撑高
      expect(metrics.body).not.toBeNull()
      expect(metrics.body!.overflowY).toBe('auto')
      expect(metrics.body!.scrollHeight).toBeGreaterThan(
        metrics.body!.clientHeight,
      )

      // 4) 横向：文档、面板、面板内容区、差异单元格都不越界
      expect(metrics.doc.scrollWidth).toBeLessThanOrEqual(
        metrics.doc.clientWidth,
      )
      expect(metrics.dialogScroll.scrollWidth).toBeLessThanOrEqual(
        metrics.dialogScroll.clientWidth,
      )
      expect(metrics.body!.scrollWidth).toBeLessThanOrEqual(
        metrics.body!.clientWidth,
      )
      expect(metrics.diffCell).not.toBeNull()
      expect(metrics.diffCell!.scrollWidth).toBeLessThanOrEqual(
        metrics.diffCell!.clientWidth,
      )

      await assertNoFatalUiErrors()
    })
  }
})
