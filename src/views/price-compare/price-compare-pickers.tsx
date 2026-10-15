import { DeleteOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons'
import { Badge, Button, Dropdown, Flex, Select, Tabs } from 'antd'
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
   * 批次切换条。
   *
   * <p>形态依据（saasui.design 的 tabs/segmented 指南、NN/g「Tabs, Used Right」）：
   * ① 一个对象下的**平级分面**才用 tabs —— 批次是同一项目下各自独立的报价单，符合；
   * ② 活动项要有**两个以上**识别信号（下划线 + 字重/颜色对比），不能只靠颜色；
   * ③ 溢出要显式处理，且活动项必须始终可见（antd line tabs 自带折叠与滚动进视野）；
   * ④ **不要给页签再套一层卡片或灰底容器** —— 卡片式页签落在浅灰底上就是「框套框」，
   *    一排小卡片会显得很吵（上一版正是这个毛病）。</p>
   *
   * <p>于是：页签用 line 型（下划线指示器），新建放在页签行右侧直接可见，删除收进行尾的
   * 「更多」菜单 —— 把 × 挂在每个页签上会让整行都是删除入口，低频动作占了高频位置。</p>
   */
  useLayoutEffect(() => {
    /* tablist 自身没有可访问名（rc-tabs 只写 role 与 aria-orientation），落到 DOM 上补，
       并在 rc-tabs 重渲染（页签增删/切换）后重写；写前比对现值避免自触发循环。 */
    const host = hostRef.current
    if (!host) {
      return
    }
    const sync = () => {
      const nav = host.querySelector('[role="tablist"]')
      if (nav && nav.getAttribute('aria-label') !== listLabel) {
        nav.setAttribute('aria-label', listLabel)
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
  }, [listLabel])

  const canDelete = sheets.length > 1 && Boolean(activeId)

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
          type="line"
          size="small"
          activeKey={activeId}
          onChange={(key) => onSelectSheet(key)}
          items={(currentGroup?.sheets ?? []).map((sheet) => {
            const missing = countMissing(
              data,
              { ...sheet, ...resolveRef(data, sheet) },
              sheet.rows,
              brands,
            )
            return {
              key: sheet.id,
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
      <Button
        className="price-compare-batch-add"
        size="small"
        type="text"
        icon={<PlusOutlined />}
        onClick={onAddBatch}
      >
        {t('priceCompare.picker.newBatch')}
      </Button>
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              label: t('priceCompare.picker.deleteCurrentBatch'),
              danger: true,
              disabled: !canDelete,
            },
          ],
          onClick: ({ key }) => {
            if (key === 'delete' && canDelete) {
              onDeleteBatch(activeId)
            }
          },
        }}
      >
        <Button
          size="small"
          type="text"
          icon={<MoreOutlined />}
          aria-label={t('priceCompare.picker.a11y.more')}
        />
      </Dropdown>
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
