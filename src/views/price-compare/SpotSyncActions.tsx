import { DownOutlined, SyncOutlined } from '@ant-design/icons'
import { Button, Dropdown, type MenuProps } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchQuoteSheetEditLock } from '@/api/market/quote-edit-locks'
import { message } from '@/utils/antd-app'
import { confirmDanger } from '@/utils/confirm-danger'
import {
  applySpotSyncChanges,
  planSpotSync,
  type SpotSyncPlan,
  type SpotSyncScope,
} from './spot-sync'
import type { PriceSheet } from './types'
import './spot-sync-actions.css'

/**
 * 「同步现货价」的三个作用域按钮。
 *
 * <p><b>为什么必须带影响面确认</b>：项目级/全部同步会写到**别的批次**，而别的批次里
 * 同商品的价格可能是别人手工报的、与当前批次本就不同。覆盖它们属于「严重且不易察觉」
 * 的操作，按 NN/g《Confirmation Dialogs》的要求，确认框必须<b>具体</b>说明后果
 * （会覆盖多少处、涉及哪些批次），而不是问一句「确定吗」；确认按钮文案也要直接说明
 * 动作（「覆盖并同步」），并沿用仓库唯一出口 {@link confirmDanger} 把默认焦点放在
 * 「取消」上。</p>
 *
 * <p>三档作用域是包含关系：「项目级」「全部」都以当前批次为准向外推，且**都把当前
 * 批次包含在内** —— 当前批次内部也会被补齐（例如先填了价格、之后又改了某行规格，
 * 输入时的自动联动不会回头补）。</p>
 */
export interface SpotSyncActionsProps {
  activeSheet: PriceSheet | undefined
  sheets: readonly PriceSheet[]
  /** 解析某批次参与同步的品牌（不同项目的品牌配置可能不同）。 */
  resolveBrands: (sheet: PriceSheet) => readonly string[]
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  /**
   * 查询某批次是否被**他人**签出（后端 `ensureWritable` 会以 409 拒绝写入）。
   * 抽成参数便于测试注入，默认走真实接口。
   */
  checkLockedByOther?: (serverId: string) => Promise<boolean>
}

async function defaultCheckLockedByOther(serverId: string): Promise<boolean> {
  const lock = await fetchQuoteSheetEditLock(serverId)
  return lock.locked && !lock.mine
}

export function SpotSyncActions({
  activeSheet,
  sheets,
  resolveBrands,
  patchSheet,
  checkLockedByOther = defaultCheckLockedByOther,
}: SpotSyncActionsProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState<SpotSyncScope | null>(null)

  /**
   * 三个作用域合并成一个下拉后的菜单项。
   *
   * <p>合并前是三个并排按钮：「当前批次内同步 / 项目级同步 / 全部同步」。
   * 三个问题：① 都没说**同步什么**（现货价）；② 「项目级同步」是形容词，不像动作对象；
   * ③ 「全部同步」与「项目级同步」的差别只能靠 tooltip 才知道「全部」指全部项目。
   * 现在统一为「同步现货价 → 选范围」，每项直接写清**覆盖到哪一层**。</p>
   *
   * <p>作用域是包含关系，且都以当前批次为准向外推（三档都把当前批次包含在内）。</p>
   */
  const menuItems = useMemo<MenuProps['items']>(() => {
    const scopeKeys: SpotSyncScope[] = ['sheet', 'project', 'all']
    return [
      // 不可点的一行，把「以谁为准」说在前面，避免用户以为是把别处的值同步进来
      {
        key: 'source-hint',
        disabled: true,
        label: (
          <span className="spot-sync-menu__hint">
            {t('priceCompare.spotSync.sourceHint', {
              sheet: activeSheet?.name ?? '—',
            })}
          </span>
        ),
      },
      { type: 'divider' },
      ...scopeKeys.map((key) => ({
        key,
        label: (
          <div className="spot-sync-menu__item">
            <span className="spot-sync-menu__title">
              {t(`priceCompare.spotSync.scope.${key}.title`)}
            </span>
            <span className="spot-sync-menu__desc">
              {t(`priceCompare.spotSync.scope.${key}.desc`)}
            </span>
          </div>
        ),
      })),
    ]
  }, [activeSheet?.name, t])

  const run = useCallback(
    async (scope: SpotSyncScope) => {
      if (!activeSheet || busy) return
      setBusy(scope)
      try {
        /*
         * 先探锁、再算计划：被他人签出的批次必须在确认框里就标成"跳过"，
         * 否则用户确认后会收到一串 409 失败提示，而且失败发生在写入之后（更难收拾）。
         * 探锁失败(网络/权限)按"不跳过"处理，交由真实写入时的冲突分支兜底。
         */
        const locked = new Set<string>()
        const candidates = new Set<string>()
        const plan0 = planSpotSync({
          sheets,
          activeSheetId: activeSheet.id,
          scope,
          resolveBrands,
        })
        for (const target of plan0.targets) {
          const sheet = sheets.find((item) => item.id === target.sheetId)
          if (sheet?.serverId) candidates.add(sheet.serverId)
        }
        await Promise.all(
          [...candidates].map(async (serverId) => {
            try {
              if (await checkLockedByOther(serverId)) locked.add(serverId)
            } catch {
              // 探锁失败不阻断：真实写入时仍会按 409 走冲突处理
            }
          }),
        )

        const plan = planSpotSync({
          sheets,
          activeSheetId: activeSheet.id,
          scope,
          resolveBrands,
          lockedSheetIds: locked,
        })

        if (!plan.totalChanges) {
          message.info(t('priceCompare.spotSync.nothingToSync'))
          return
        }

        confirmDanger({
          title: t('priceCompare.spotSync.confirmTitle'),
          content: <SpotSyncImpact plan={plan} />,
          okText: t('priceCompare.spotSync.confirmOk'),
          cancelText: t('common.cancel'),
          onOk: () => {
            for (const target of plan.targets) {
              const sheet = sheets.find((item) => item.id === target.sheetId)
              if (!sheet) continue
              patchSheet(target.sheetId, {
                inputs: applySpotSyncChanges(sheet.inputs, target.changes),
              })
            }
            /*
             * 只承诺"已应用"，不承诺"已保存"：真正落库走 store 的自动保存，
             * 目标批次里可能因数据本身不合法（实测：历史行吨位超过采购订单订货量）
             * 被后端 422 拒绝。说成"已同步"会让用户以为全部成功。
             */
            message.success(
              t('priceCompare.spotSync.applied', {
                batches: plan.targets.length,
                cells: plan.totalChanges,
              }),
            )
          },
        })
      } finally {
        setBusy(null)
      }
    },
    [
      activeSheet,
      busy,
      checkLockedByOther,
      patchSheet,
      resolveBrands,
      sheets,
      t,
    ],
  )

  return (
    <span className="price-compare-spot-sync">
      <Dropdown
        menu={{
          items: menuItems,
          onClick: ({ key }) => {
            if (key === 'sheet' || key === 'project' || key === 'all') {
              void run(key)
            }
          },
        }}
        trigger={['click']}
        disabled={Boolean(busy) || !activeSheet}
      >
        <Button
          aria-label={t('priceCompare.spotSync.actionA11y')}
          icon={<SyncOutlined />}
          loading={Boolean(busy)}
          disabled={Boolean(busy) || !activeSheet}
        >
          {t('priceCompare.spotSync.action')}
          <DownOutlined className="spot-sync-caret" />
        </Button>
      </Dropdown>
    </span>
  )
}

/**
 * 确认框里的影响面清单。
 *
 * <p>按 NN/g 的「具体化」要求逐条列出：以哪个批次为准、会改到哪些批次、其中多少处是
 * **覆盖已有值**（真正的破坏性部分）——只给总数不给分布，用户无法判断该不该继续。</p>
 */
function SpotSyncImpact({ plan }: { plan: SpotSyncPlan }) {
  const { t } = useTranslation()
  return (
    <div className="spot-sync-impact">
      <p className="spot-sync-impact__summary">
        {t('priceCompare.spotSync.confirmSummary', {
          sheet: plan.sourceSheetName,
          batches: plan.targets.length,
          cells: plan.totalChanges,
          overwrite: plan.totalOverwrite,
          fill: plan.totalFill,
        })}
      </p>
      <ul className="spot-sync-impact__list">
        {plan.targets.map((target) => (
          <li key={target.sheetId}>
            {t('priceCompare.spotSync.impactLine', {
              sheet: target.sheetName,
              cells: target.changes.length,
              overwrite: target.overwriteCount,
              fill: target.fillCount,
            })}
          </li>
        ))}
      </ul>
      {plan.totalSubstituted > 0 ? (
        <p className="spot-sync-impact__substituted">
          {t('priceCompare.spotSync.substituted', {
            count: plan.totalSubstituted,
          })}
        </p>
      ) : null}
      {plan.skipped.length ? (
        <p className="spot-sync-impact__skipped">
          {t('priceCompare.spotSync.skipped', {
            count: plan.skipped.length,
            names: plan.skipped.map((skip) => skip.sheetName).join('、'),
          })}
        </p>
      ) : null}
    </div>
  )
}
