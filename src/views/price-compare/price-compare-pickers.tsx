import { Badge, Flex, Select, Tabs } from 'antd'
import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { countMissing, resolveRef } from './core'
import { ProjectConfigModal } from './ProjectConfigModal'
import { resolveProjectSelection } from './price-compare-support'
import { PriceCompareTour } from './price-compare-tour'
import type { Brand, PriceData, PriceSheet, ProjectOption } from './types'
import './price-compare-context-bar.css'

type ProjectGroup = {
  projectId: string
  projectName: string
  sheets: PriceSheet[]
}

/**
 * 项目选择器。
 *
 * <p>重构前这里是「一排项目胶囊 + 另一个『新增项目批次』下拉」：两个控件做同一件事
 * （选项目），后者点开看到的还是一列**项目**，用户得先猜「新增项目批次」到底是选项目
 * 还是选批次，而且它只列出还没有批次的项目，与旁边那排胶囊内容还不同。</p>
 *
 * <p>现在合并成一处可搜索的选择器：选项右侧写明该项目当前有几个批次（或「未建批次」）。
 * 选中已有批次的项目 = 切到它的第一个批次；选中还没有批次的项目 = 就地给它建一个批次，
 * 即原来那个下拉的行为，不再需要单独的入口。</p>
 */
export function PriceCompareProjectPicker({
  currentGroup,
  onAddProject,
  onSelectSheet,
  projects,
  projectGroups,
}: {
  currentGroup: ProjectGroup | undefined
  onAddProject: (project: ProjectOption) => void
  onSelectSheet: (sheetId: string) => void
  projects: ProjectOption[]
  projectGroups: ProjectGroup[]
}) {
  const { t } = useTranslation()
  const countOf = (projectId: string) =>
    projectGroups.find((group) => group.projectId === projectId)?.sheets
      .length ?? 0
  const nameOf = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    return (
      project?.abbr ||
      project?.name ||
      currentGroup?.projectName ||
      t('priceCompare.sheet.unspecifiedProject')
    )
  }
  /* 未指定项目、以及后端有批次但不在随包项目清单里的项目: 补一个选项, 否则选择器
     会显示成空白。它的批次状态按当前分组里的批次数量写, 与清单内项目的口径一致。 */
  const orphanOptions =
    currentGroup && !projects.some((item) => item.id === currentGroup.projectId)
      ? [
          {
            value: currentGroup.projectId,
            label: `${
              currentGroup.projectName ||
              t('priceCompare.sheet.unspecifiedProject')
            }${t('priceCompare.picker.batchCount', { n: currentGroup.sheets.length })}`,
          },
        ]
      : []
  return (
    <Flex
      className="price-compare-context-row"
      gap={8}
      align="center"
      wrap="wrap"
    >
      <span className="price-compare-context-label">
        {t('priceCompare.picker.project')}
      </span>
      <Select
        className="price-compare-project-select"
        size="small"
        aria-label={t('priceCompare.picker.a11y.project')}
        showSearch={{ optionFilterProp: 'label' }}
        /* 下拉按内容自适应宽度: 选项要放下「项目名 + 批次状态」, 跟着选择器宽度走会把
           状态后缀截断成「（5 个…」, 反而看不出有几个批次。 */
        popupMatchSelectWidth={false}
        value={currentGroup?.projectId}
        options={[
          ...orphanOptions,
          ...projects.map((project) => {
            const count = countOf(project.id)
            return {
              value: project.id,
              label: `${project.abbr || project.name}${
                count > 0
                  ? t('priceCompare.picker.batchCount', { n: count })
                  : t('priceCompare.picker.noBatch')
              }`,
            }
          }),
        ]}
        /* 选中框只显示项目名: 「N 个批次」是给下拉里挑选时看的, 放在框里既冗余又会
           把框撑宽(宽度不够时被省略号截掉, 反而看不出是哪个项目)。 */
        labelRender={(option) => <span>{nameOf(String(option.value))}</span>}
        onChange={(projectId) => {
          const action = resolveProjectSelection(
            projectId,
            projectGroups,
            projects,
          )
          if (action?.type === 'select') {
            onSelectSheet(action.sheetId)
            return
          }
          if (action?.type === 'create') {
            onAddProject(action.project)
          }
        }}
      />
    </Flex>
  )
}

export function PriceCompareBatchBar({
  activeId,
  brands,
  currentGroup,
  data,
  onAddBatch,
  onDeleteBatch,
  onSelectSheet,
  sheets,
}: {
  activeId: string
  brands: Brand[]
  currentGroup: ProjectGroup | undefined
  data: PriceData
  onAddBatch: () => void
  onDeleteBatch: (id: string) => void
  onSelectSheet: (id: string) => void
  sheets: PriceSheet[]
}) {
  const { t } = useTranslation()
  const hostRef = useRef<HTMLDivElement>(null)
  const listLabel = t('priceCompare.picker.a11y.batchList')
  /**
   * 批次页签。
   *
   * <p>重构前这里是「一排分段控件 + 两个常驻按钮（新批次 / 删除批次）」：新建与删除本来
   * 就是挂在「批次」这个对象上的动作，摊成两个按钮既占地方，又把「删除」摆成常驻的危险色
   * 按钮，容易被当成这一屏的主操作。</p>
   *
   * <p>改成可关闭页签后，两件事回到对象本身：末尾的 `+` 新建，每个页签上的 × 删除
   * （仍走原有的二次确认），只剩一个批次时不给关闭。缺项角标照旧跟在批次名后面。</p>
   */
  useLayoutEffect(() => {
    /* antd 6.6.4 的 Tabs 不透传关闭按钮可访问名（rc-tabs 硬编码英文 `remove`），
       tablist 自身也没有可访问名 —— 与顶部页面标签栏同一处理：落到 DOM 上接管，
       并在 rc-tabs 重渲染（标签增删/切换）后重写。写前先比对现值，避免自触发循环。 */
    const host = hostRef.current
    if (!host) {
      return
    }
    const sync = () => {
      const nav = host.querySelector('[role="tablist"]')
      if (nav && nav.getAttribute('aria-label') !== listLabel) {
        nav.setAttribute('aria-label', listLabel)
      }
      for (const button of host.querySelectorAll('.ant-tabs-tab-remove')) {
        const name =
          button
            .closest('.ant-tabs-tab')
            ?.querySelector('.ant-tabs-tab-btn')
            ?.textContent?.trim() ?? ''
        const label = t('priceCompare.picker.a11y.closeBatch', { name })
        if (button.getAttribute('aria-label') !== label) {
          button.setAttribute('aria-label', label)
        }
      }
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label'],
    })
    return () => observer.disconnect()
  }, [listLabel, t])

  return (
    <Flex
      className="price-compare-context-row"
      gap={8}
      align="center"
      wrap="wrap"
    >
      <span className="price-compare-context-label">
        {t('priceCompare.picker.batch')}
      </span>
      <div className="price-compare-batch-tabs" ref={hostRef}>
        <Tabs
          type="editable-card"
          size="small"
          activeKey={activeId}
          onChange={(key) => onSelectSheet(key)}
          onEdit={(targetKey, action) => {
            if (action === 'add') {
              onAddBatch()
              return
            }
            if (typeof targetKey === 'string') {
              onDeleteBatch(targetKey)
            }
          }}
          items={(currentGroup?.sheets ?? []).map((sheet) => {
            const missing = countMissing(
              data,
              { ...sheet, ...resolveRef(data, sheet) },
              sheet.rows,
              brands,
            )
            return {
              key: sheet.id,
              closable: sheets.length > 1,
              label: (
                <span>
                  {sheet.name}
                  {missing > 0 ? (
                    <Badge
                      count={missing}
                      size="small"
                      color="var(--color-warning)"
                      style={{ marginLeft: 6 }}
                    />
                  ) : null}
                </span>
              ),
            }
          })}
        />
      </div>
    </Flex>
  )
}

/** 比价页浮层(项目配置弹窗 + 引导)。 */
export function PriceCompareOverlays({
  configOpen,
  onCloseConfig,
  brandOptions,
  varieties,
  config,
  onSaveConfig,
  tourOpen,
  onCloseTour,
  spotRef,
}: {
  configOpen: boolean
  onCloseConfig: () => void
  brandOptions: React.ComponentProps<typeof ProjectConfigModal>['brandOptions']
  varieties: React.ComponentProps<typeof ProjectConfigModal>['varieties']
  config: React.ComponentProps<typeof ProjectConfigModal>['config']
  onSaveConfig: React.ComponentProps<typeof ProjectConfigModal>['onSave']
  tourOpen: boolean
  onCloseTour: () => void
  spotRef: React.RefObject<HTMLSpanElement | null>
}) {
  return (
    <>
      <ProjectConfigModal
        open={configOpen}
        brandOptions={brandOptions}
        varieties={varieties}
        config={config}
        onClose={onCloseConfig}
        onSave={onSaveConfig}
      />
      <PriceCompareTour
        open={tourOpen}
        onClose={onCloseTour}
        spotRef={spotRef}
      />
    </>
  )
}
