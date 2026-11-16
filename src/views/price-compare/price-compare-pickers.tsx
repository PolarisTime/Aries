import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Dropdown, Flex, Select, Tabs } from 'antd'
import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchLowestBrandQuotes } from '@/api/market/supplier-price-lists'
import {
  deriveSheetPricing,
  LOWEST_QUOTES_QUERY_KEY,
  LOWEST_QUOTES_QUERY_OPTIONS,
} from './core'
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
  projectsLoading = false,
  projectGroups,
}: {
  currentGroup: ProjectGroup | undefined
  onAddProject: (project: ProjectOption) => void
  onSelectSheet: (sheetId: string) => void
  projects: ProjectOption[]
  /** 项目清单来自后端接口，加载中时下拉显示 loading 而不是"空列表"。 */
  projectsLoading?: boolean
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
        loading={projectsLoading}
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
  allowHrb400eFallback = false,
  brands,
  currentGroup,
  data,
  onAddBatch,
  onDeleteBatch,
  onRenameBatch,
  onSelectSheet,
  sheets,
}: {
  activeId: string
  /**
   * 抗震牌号代取开关（项目配置 `hrb400eFallback`）。
   *
   * <p>缺价角标必须与表格同一口径：代取命中算「有价」，因此这里要与单据头/表格
   * 用同一个布尔值。缺省 `false` 与项目配置默认值一致；上层若已拿到配置就显式传入。</p>
   */
  allowHrb400eFallback?: boolean
  brands: Brand[]
  currentGroup: ProjectGroup | undefined
  data: PriceData
  onAddBatch: () => void
  onDeleteBatch: (id: string) => void
  /** 打开「重命名批次」弹层（弹层与提交由父组件持有，这里只负责发起） */
  onRenameBatch: (id: string, currentName: string) => void
  onSelectSheet: (id: string) => void
  sheets: PriceSheet[]
}) {
  const { t } = useTranslation()
  const hostRef = useRef<HTMLDivElement>(null)
  const listLabel = t('priceCompare.picker.a11y.batchList')
  /** 当前批次。重命名要带出"原名"作弹层初始值，找不到时菜单项禁用。 */
  const activeSheet = sheets.find((sheet) => sheet.id === activeId)
  /**
   * 缺价角标的数据源：与 `SheetPanel` 共用 `LOWEST_QUOTES_QUERY_KEY`
   * （同一份 react-query 缓存，不会多打一次接口），再交给 `deriveSheetPricing`
   * 这个唯一出口算缺价。
   *
   * <p>报价还没取到（首屏加载中/查询失败）时**不显示角标**：此时任何"缺价"都只是在
   * 报"数据还没来"，会把整批格子误标成缺价。</p>
   */
  const lowestQuotesQuery = useQuery({
    queryKey: LOWEST_QUOTES_QUERY_KEY,
    queryFn: ({ signal }) => fetchLowestBrandQuotes(undefined, signal),
    ...LOWEST_QUOTES_QUERY_OPTIONS,
  })
  const quotes = lowestQuotesQuery.data
  /**
   * 批次切换条：一整行 antd 卡片页签（`type="card"`），右侧是「新建批次」与「更多」。
   *
   * <p>形态依据：批次是同一项目下各自独立的报价单，属于平级分面，适合 tabs；
   * 用卡片型而不是下划线型，是因为批次是**单据级上下文**（像打开的多个单据页签），
   * 卡片页签自带边界，切走哪一张一眼可见；下划线型更适合同一表单内的轻量分面。</p>
   *
   * <p>删除/重命名仍收在「更多」菜单里（低频且危险），不挂在每个页签的 × 上；
   * 溢出由 antd 自带的 more 折叠，活动页签始终可见。</p>
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
    <Flex className="price-compare-batch-bar" gap={8} align="center">
      <div className="price-compare-batch-tabs" ref={hostRef}>
        <Tabs
          type="card"
          size="small"
          activeKey={activeId}
          onChange={(key) => onSelectSheet(key)}
          items={(currentGroup?.sheets ?? []).map((sheet) => {
            // 与表格同口径：派生后仍没有现货价的格子才算缺价（代取命中算有价）
            const missing = quotes
              ? deriveSheetPricing(sheet, quotes, {
                  allowHrb400eFallback,
                  brands,
                  data,
                  rows: sheet.rows,
                }).missingCount
              : 0
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
          'aria-label': t('priceCompare.picker.a11y.more'),
          items: [
            {
              key: 'rename',
              icon: <EditOutlined />,
              /* 文案带省略号: 点了会打开弹层，让用户先知道（AGENTS.md 上下文菜单契约） */
              label: t('priceCompare.picker.renameCurrentBatch'),
              disabled: !activeSheet,
            },
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              label: t('priceCompare.picker.deleteCurrentBatch'),
              danger: true,
              disabled: !canDelete,
            },
          ],
          onClick: ({ key }) => {
            if (key === 'rename' && activeSheet) {
              onRenameBatch(activeId, activeSheet.name)
            }
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
  projectAllowedBrands,
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
  projectAllowedBrands: React.ComponentProps<
    typeof ProjectConfigModal
  >['projectAllowedBrands']
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
        projectAllowedBrands={projectAllowedBrands}
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
