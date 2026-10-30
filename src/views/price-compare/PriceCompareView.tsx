import { Alert, Empty, Flex, Skeleton, Watermark } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLengthPremiumOptions } from '@/hooks/useLengthPremiumOptions'
import { useMaterialBrands } from '@/hooks/useMaterialBrands'
import { useAuthStore } from '@/stores/authStore'
import { message, modal } from '@/utils/antd-app'
import { moveItem, reconcileSpotInputs } from './core'
import { PriceCompareEditLockBanner } from './PriceCompareEditLockBanner'
import { PriceCompareSaveStatus } from './PriceCompareSaveStatus'
import { PriceCompareSheetMeta } from './PriceCompareSheetMeta'
import {
  PriceCompareBatchBar,
  PriceCompareOverlays,
  PriceCompareProjectPicker,
} from './price-compare-pickers'
import { projectGroupsOf } from './price-compare-support'
import {
  useInitialProjectAssignment,
  usePriceCompareEditorSession,
  usePriceCompareRouteActive,
  useProjectAllowedBrands,
  useSupplierSelectOptions,
  useUndoRedoShortcuts,
} from './price-compare-view-hooks'
import { RenameBatchModal } from './RenameBatchModal'
import { SheetPanel } from './SheetPanel'
import type { PriceSheet } from './types'
import { usePriceCompareReferenceSync } from './use-price-compare-reference-sync'
import {
  useActiveProjectQuoteConfig,
  useEffectiveProjectBrands,
  usePriceCompareData,
} from './usePriceCompareData'
import { usePriceComparePricing } from './usePriceComparePricing'
import { usePurchaseOrderTonnage } from './usePurchaseOrderTonnage'
import { useSheetsStore } from './useSheetsStore'
import './price-compare.css'

/** 报单比价页: 顶部胶囊(项目/批次) + 单据表格。 */
export function PriceCompareView() {
  const { t } = useTranslation()
  const { data, varieties, projects, projectsLoading, catalog, mergeMatches } =
    usePriceCompareData()
  const materialBrands = useMaterialBrands()
  const brandOptions = useMemo(
    () =>
      materialBrands.length ? materialBrands : catalog.map((item) => item.name),
    [materialBrands, catalog],
  )

  const routeActive = usePriceCompareRouteActive()
  const store = useSheetsStore({ routeActive })
  const {
    loading,
    sheets,
    activeId,
    active,
    rows,
    config,
    configLoaded,
    setConfig,
    undo,
    redo,
    setRows,
    setBrands,
    setActiveId,
    patchSheet,
    addSheet,
    assignProjectToUnassigned,
    removeSheet,
    editLock,
    lockConflict,
    readOnly,
    takeoverEditLock,
    discardLocalChangesAndReload,
    hasUnsavedChanges,
    saveStatus,
    retrySave,
  } = store

  const brands = config.brands
  const lengthPremium = config.lengthPremium
  /*
   * 定尺主数据只在这里读一次，往下传两张派生表（加价/排序号）：
   * 逐行/逐格各查一次会产生 N 次缓存读与 N 份派生对象，也没法保证同一页口径一致。
   */
  const { premiumByLength, sortOrderByLength } = useLengthPremiumOptions()

  const [configOpen, setConfigOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const spotRef = useRef<HTMLSpanElement>(null)
  const urlParamsApplied = useRef(false)
  /** 已按项目完成品牌回填的项目 id: 避免用户显式清空品牌后被再次自动回填。 */
  const brandAutoFilledRef = useRef<Set<string>>(new Set())
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const projectAllowedBrands = useProjectAllowedBrands(
    projects,
    active?.projectId,
  )

  const activeProjectQuoteConfig = useActiveProjectQuoteConfig(
    active?.projectId,
    isAuthenticated,
  )

  /**
   * 品牌唯一取源：项目资料优先，资料未限制品牌时后端回退到比价配置并置 fallback=true。
   * 不再用商品品牌目录(catalog)当品牌清单 —— 那会让「资料没配」与「配了这些」看起来一样。
   */
  const effectiveBrands = useEffectiveProjectBrands(
    active?.projectId,
    isAuthenticated,
  )

  const supplierSelectOptions = useSupplierSelectOptions(isAuthenticated)
  useInitialProjectAssignment(projects, assignProjectToUnassigned, setTourOpen)
  usePriceCompareEditorSession(hasUnsavedChanges)
  // 只读态(他人签出)禁用撤销/重做快捷键
  useUndoRedoShortcuts(undo, redo, !readOnly)

  // 配置首次从服务端加载且品牌为空时, 用**有效品牌集合**(项目资料优先 / 回退比价配置)回填;
  // 每个项目只回填一次, 用户显式清空品牌后不再自动回填。运费优先取商品品牌目录里同名品牌的默认值,
  // 目录没有该品牌时按 0 —— 有效品牌集合只给品牌名, 不带运费(运费属于本项目配置)。
  useEffect(() => {
    const projectId = active?.projectId
    if (!projectId || !configLoaded || !effectiveBrands.brands.length) return
    if (brandAutoFilledRef.current.has(projectId)) return
    brandAutoFilledRef.current.add(projectId)
    if (!config.brands.length) {
      const freightByName = new Map(
        catalog.map((item) => [item.name, item.freight] as const),
      )
      setBrands(
        effectiveBrands.brands.map((name) => ({
          name,
          freight: freightByName.get(name) ?? 0,
        })),
      )
    }
  }, [
    active?.projectId,
    configLoaded,
    catalog,
    effectiveBrands.brands,
    config.brands.length,
    setBrands,
  ])

  // 支持从「行情同步」页跳转携带 refDate/refPeriod
  useEffect(() => {
    if (urlParamsApplied.current || !active) return
    urlParamsApplied.current = true
    const params = new URLSearchParams(window.location.search)
    const refDate = params.get('refDate')
    const refPeriod = params.get('refPeriod')
    if (!refDate) return
    patchSheet(active.id, {
      refDate,
      ...(refPeriod ? { refPeriod } : {}),
    })
  }, [active, patchSheet])

  /*
   * 现货同步到别的批次时，每个批次只有它自己配置里的品牌才该被写入：
   * 不同项目的品牌集合可以完全不同。当前批次用**项目配置**（含西本虚拟品牌、
   * 也含用户尚未保存的品牌改动），其它批次用服务端回带的品牌快照。
   */
  const resolveSyncBrands = useCallback(
    (target: PriceSheet) =>
      target.id === active?.id
        ? brands.map((brand) => brand.name)
        : (target.brands ?? []).map((brand) => brand.name),
    [active?.id, brands],
  )

  const {
    activeRefDate,
    activeRefPeriod,
    activeSheetId,
    availability,
    isLatestRef,
    matchesData,
    onRefreshPrice,
    refPeriods,
    refreshing,
    resolvedRefPeriod,
  } = usePriceComparePricing({
    active,
    data,
    isAuthenticated,
    quoteSource: activeProjectQuoteConfig?.quoteSource,
    quoteRegion: activeProjectQuoteConfig?.quoteRegion,
  })

  const purchaseOrderTonnage = usePurchaseOrderTonnage(active, isAuthenticated)

  // 参照日期/时段回填与网价合并, 详见 use-price-compare-reference-sync.ts
  usePriceCompareReferenceSync({
    active,
    activeRefDate,
    activeRefPeriod,
    activeSheetId,
    isLatestRef,
    matchesData,
    mergeMatches,
    patchSheet,
    resolvedRefPeriod,
  })

  // 对账式现货联动：同商品同品牌已有现货价时自动套用到缺省行，避免重复输入。
  useEffect(() => {
    if (!active || !rows.length || !brands.length) return
    const next = reconcileSpotInputs(
      rows,
      active.inputs,
      brands.map((brand) => brand.name),
    )
    if (next !== active.inputs) {
      patchSheet(active.id, { inputs: next })
    }
  }, [active, rows, brands, patchSheet])

  const projectGroups = projectGroupsOf(sheets)
  const currentGroup =
    projectGroups.find((group) => group.projectId === active?.projectId) ??
    projectGroups[0]
  const dataDates = data ? Object.keys(data).sort().reverse() : []
  const defaultRefDate = dataDates[0] ?? ''
  const defaultRefPeriod =
    defaultRefDate && data
      ? (Object.keys(data[defaultRefDate] ?? {})[0] ?? '')
      : ''
  const today = dayjs().format('YYYY-MM-DD')

  /**
   * 正在重命名的批次（null = 弹层关闭）。存 id + 原名：
   * id 用于定位，原名作弹层初始值，避免打开瞬间先渲染一个空输入框。
   */
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(
    null,
  )

  /* 重命名提交：只改 store 里的 name，落库交给既有自动保存（name 已包含在 header 载荷内，
     保存流程按 headerSignature 差异触发），这里不额外发请求，避免与自动保存重复写入。 */
  const submitRename = (name: string) => {
    if (!renaming) return
    patchSheet(renaming.id, { name })
    message.success(t('priceCompare.picker.renameSuccess', { name }))
    setRenaming(null)
  }

  const confirmRemoveSheet = (id: string) =>
    modal.confirm({
      title: t('priceCompare.view.removeSheetConfirmTitle'),
      content: t('priceCompare.view.removeSheetConfirmContent'),
      okText: t('common.delete'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: () => removeSheet(id),
    })

  if (loading) {
    return (
      <div className="price-compare-page">
        <Skeleton active />
      </div>
    )
  }

  return (
    <div id="price-compare-root" className="price-compare-page">
      <div className="price-compare-head">
        <div>
          <h1>{t('priceCompare.view.title')}</h1>
        </div>
        <span className="price-compare-head-status">
          {active ? (
            <PriceCompareSheetMeta
              savedAt={active.savedAt}
              version={active.version}
            />
          ) : null}
          <PriceCompareSaveStatus onRetry={retrySave} status={saveStatus} />
        </span>
      </div>

      {/* 项目 / 批次是同一个上下文的两级, 合成一行工具条:
          项目用下拉、批次用下划线页签, 页签行右侧是新建与更多(删除)。
          不再给这一行套卡片/灰底容器 —— 卡片式页签落在浅底上就是「框套框」。 */}
      <Flex
        className="price-compare-context-bar"
        align="center"
        gap={16}
        wrap="wrap"
      >
        <PriceCompareProjectPicker
          projects={projects}
          projectsLoading={projectsLoading}
          projectGroups={projectGroups}
          currentGroup={currentGroup}
          onSelectSheet={setActiveId}
          onAddProject={(project) =>
            addSheet(
              project.id,
              project.abbr || project.name,
              today,
              defaultRefDate,
              defaultRefPeriod,
            )
          }
        />

        <PriceCompareBatchBar
          activeId={activeId}
          brands={brands}
          currentGroup={currentGroup}
          data={data}
          sheets={sheets}
          onSelectSheet={setActiveId}
          onAddBatch={() =>
            addSheet(
              currentGroup?.projectId ?? '',
              currentGroup?.projectName ?? '',
              today,
              defaultRefDate,
              defaultRefPeriod,
            )
          }
          onDeleteBatch={confirmRemoveSheet}
          onRenameBatch={(id, currentName) =>
            setRenaming({ id, name: currentName })
          }
        />
      </Flex>
      <RenameBatchModal
        open={renaming !== null}
        currentName={renaming?.name ?? ''}
        onCancel={() => setRenaming(null)}
        onSubmit={submitRename}
      />

      {active && effectiveBrands.fallback ? (
        <div className="price-compare-brand-fallback-hint" role="status">
          {t('priceCompare.view.brandFallbackHint', {
            // 兜底文案: 该 key 的 zh-CN/en-US 由另一批 locale 改动一并提交;
            // 即使 key 尚未落地, 这里也必须显示可读中文而不是裸 key(提示是这轮唯一必须"看得见"的东西)。
            defaultValue:
              '该项目未在项目资料限制品牌，暂用比价配置的品牌（建议到「项目资料」补齐允许品牌）',
          })}
        </div>
      ) : null}

      {active && (editLock || lockConflict) ? (
        <PriceCompareEditLockBanner
          conflict={Boolean(lockConflict)}
          lock={editLock}
          onDiscardLocal={() => discardLocalChangesAndReload(active.id)}
          onTakeover={() => takeoverEditLock(active.id)}
        />
      ) : null}

      <PriceCompareSheetArea
        active={active}
        sheets={sheets}
        resolveSyncBrands={resolveSyncBrands}
        watermark={t('priceCompare.view.watermark')}
        noBatchLabel={t('priceCompare.view.noBatch')}
        tonnageLoadFailedLabel={t('priceCompare.sheet.purchaseOrderLoadFailed')}
        data={data}
        varieties={varieties}
        brands={brands}
        rows={rows}
        lengthPremium={lengthPremium}
        lengthPremiums={premiumByLength}
        lengthSortOrders={sortOrderByLength}
        patchSheet={patchSheet}
        setRows={setRows}
        onReorderBrands={(from, to) =>
          setBrands((current) => moveItem(current, from, to))
        }
        refPeriods={refPeriods}
        onRefreshPrice={onRefreshPrice}
        refreshing={refreshing}
        config={config}
        onOpenConfig={() => setConfigOpen(true)}
        availability={availability}
        spotRef={spotRef}
        supplierSelectOptions={supplierSelectOptions}
        onSaveConfig={(next) => setConfig(next)}
        readOnly={readOnly}
        purchaseOrderTonnage={purchaseOrderTonnage}
      />

      <PriceCompareOverlays
        configOpen={configOpen}
        onCloseConfig={() => setConfigOpen(false)}
        brandOptions={brandOptions}
        projectAllowedBrands={projectAllowedBrands}
        varieties={varieties}
        config={config}
        onSaveConfig={(next) => setConfig(next)}
        tourOpen={tourOpen}
        onCloseTour={() => setTourOpen(false)}
        spotRef={spotRef}
      />
    </div>
  )
}

/** 当前单据的比价表格区(含水印与空态)。 */
function PriceCompareSheetArea({
  active,
  sheets,
  resolveSyncBrands,
  watermark,
  noBatchLabel,
  tonnageLoadFailedLabel,
  data,
  varieties,
  brands,
  rows,
  lengthPremium,
  lengthPremiums,
  lengthSortOrders,
  patchSheet,
  setRows,
  onReorderBrands,
  refPeriods,
  onRefreshPrice,
  refreshing,
  config,
  onOpenConfig,
  availability,
  spotRef,
  supplierSelectOptions,
  onSaveConfig,
  readOnly,
  purchaseOrderTonnage,
}: {
  active: ReturnType<typeof useSheetsStore>['active']
  sheets: ReturnType<typeof useSheetsStore>['sheets']
  resolveSyncBrands: (sheet: PriceSheet) => readonly string[]
  watermark: string
  noBatchLabel: string
  tonnageLoadFailedLabel: string
  data: React.ComponentProps<typeof SheetPanel>['data']
  varieties: React.ComponentProps<typeof SheetPanel>['varieties']
  brands: React.ComponentProps<typeof SheetPanel>['brands']
  rows: React.ComponentProps<typeof SheetPanel>['rows']
  lengthPremium: number
  lengthPremiums: React.ComponentProps<typeof SheetPanel>['lengthPremiums']
  lengthSortOrders: React.ComponentProps<typeof SheetPanel>['lengthSortOrders']
  patchSheet: React.ComponentProps<typeof SheetPanel>['patchSheet']
  setRows: React.ComponentProps<typeof SheetPanel>['setRows']
  onReorderBrands: React.ComponentProps<typeof SheetPanel>['onReorderBrands']
  refPeriods: string[]
  onRefreshPrice: () => Promise<void> | void
  refreshing: boolean
  config: ReturnType<typeof useSheetsStore>['config']
  onOpenConfig: () => void
  availability: React.ComponentProps<typeof SheetPanel>['availability']
  spotRef: React.ComponentProps<typeof SheetPanel>['spotRef']
  supplierSelectOptions: React.ComponentProps<typeof SheetPanel>['suppliers']
  onSaveConfig: (next: ReturnType<typeof useSheetsStore>['config']) => void
  readOnly: boolean
  purchaseOrderTonnage: React.ComponentProps<
    typeof SheetPanel
  >['purchaseOrderTonnage']
}) {
  if (!active) {
    return (
      <Flex justify="center" style={{ padding: 40 }}>
        <Empty description={noBatchLabel} />
      </Flex>
    )
  }
  return (
    <Watermark
      content={[watermark, active.name]}
      gap={[140, 120]}
      font={{ fontSize: 12, color: 'rgba(0,0,0,0.035)' }}
    >
      {purchaseOrderTonnage?.isError ? (
        <Alert banner showIcon type="warning" title={tonnageLoadFailedLabel} />
      ) : null}
      <SheetPanel
        key={active.id}
        sheet={active}
        sheets={sheets}
        resolveSyncBrands={resolveSyncBrands}
        data={data}
        varieties={varieties}
        brands={brands}
        rows={rows}
        density="small"
        lengthPremium={lengthPremium}
        lengthPremiums={lengthPremiums}
        lengthSortOrders={lengthSortOrders}
        patchSheet={patchSheet}
        setRows={setRows}
        onReorderBrands={onReorderBrands}
        periods={refPeriods}
        onRefresh={() => {
          void onRefreshPrice()
        }}
        refreshing={refreshing}
        allowHrb400eFallback={config.hrb400eFallback}
        allowedProducts={config.products}
        onOpenConfig={onOpenConfig}
        availability={availability}
        spotRef={spotRef}
        designatedBrands={config.designatedBrands}
        suppliers={supplierSelectOptions}
        remark={config.remark}
        onRemarkChange={(value) => onSaveConfig({ ...config, remark: value })}
        readOnly={readOnly}
        purchaseOrderTonnage={purchaseOrderTonnage}
      />
    </Watermark>
  )
}
