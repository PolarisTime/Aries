import { Empty, Flex, Skeleton, Watermark } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PriceCompareSaveStatus } from '@/components/PriceCompareSaveStatus'
import { useLengthPremiumOptions } from '@/hooks/useLengthPremiumOptions'
import { useMaterialBrands } from '@/hooks/useMaterialBrands'
import { useAuthStore } from '@/stores/authStore'
import { message, modal } from '@/utils/antd-app'
import { PriceCompareEditLockBanner } from './PriceCompareEditLockBanner'
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
  useUndoRedoShortcuts,
} from './price-compare-view-hooks'
import { RenameBatchModal } from './RenameBatchModal'
import { type SheetCollabBridge, SheetPanel } from './SheetPanel'
import { usePriceCompareReferenceSync } from './use-price-compare-reference-sync'
import {
  useActiveProjectQuoteConfig,
  usePriceCompareData,
} from './usePriceCompareData'
import { usePriceComparePricing } from './usePriceComparePricing'
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
    setHrb400eFallback,
    undo,
    redo,
    setRows,
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
  const { premiumByLength } = useLengthPremiumOptions()

  const [configOpen, setConfigOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [collabTonRemarkWritable, setCollabTonRemarkWritable] = useState(false)
  const collabBridgeRef = useRef<SheetCollabBridge | null>(null)
  const spotRef = useRef<HTMLSpanElement>(null)
  const urlParamsApplied = useRef(false)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const handleCollabStateChange = useCallback(
    (bridge: SheetCollabBridge | null) => {
      collabBridgeRef.current = bridge
      setCollabTonRemarkWritable(Boolean(bridge?.active && bridge.writable))
    },
    [],
  )

  const handleUndo = useCallback(() => {
    const bridge = collabBridgeRef.current
    if (bridge?.active && bridge.writable) {
      bridge.undo()
      return
    }
    undo()
  }, [undo])

  const handleRedo = useCallback(() => {
    const bridge = collabBridgeRef.current
    if (bridge?.active && bridge.writable) {
      bridge.redo()
      return
    }
    redo()
  }, [redo])

  const projectAllowedBrands = useProjectAllowedBrands(
    projects,
    active?.projectId,
  )

  const activeProjectQuoteConfig = useActiveProjectQuoteConfig(
    active?.projectId,
    isAuthenticated,
  )

  useInitialProjectAssignment(projects, assignProjectToUnassigned, setTourOpen)
  usePriceCompareEditorSession(hasUnsavedChanges)
  // 协作可写时支持仅撤销自己的 ton/remark 改动；非协作只读态禁用快捷键
  useUndoRedoShortcuts(
    handleUndo,
    handleRedo,
    !readOnly || collabTonRemarkWritable,
  )

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
        </span>
      </div>

      {/* 项目 / 批次是同一个上下文的两级：项目一行（低频切换），批次一行（高频切换）。
          批次行本身是一排页签，不再额外套卡片或灰底容器。 */}
      <Flex className="price-compare-context-bar" vertical gap={8}>
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
          allowHrb400eFallback={config.hrb400eFallback}
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

      {/*
       * 锁横幅只在「他人占用」或「保存冲突」时出现：
       * 自己正常编辑时不需要一条常驻的「你正在编辑该批次」提示带，白占一行高度。
       */}
      {active && (lockConflict || (editLock && !editLock.mine)) ? (
        <PriceCompareEditLockBanner
          collabTonRemarkWritable={collabTonRemarkWritable}
          conflict={Boolean(lockConflict)}
          lock={editLock}
          onDiscardLocal={() => discardLocalChangesAndReload(active.id)}
          onTakeover={() => takeoverEditLock(active.id)}
        />
      ) : null}

      <PriceCompareSheetArea
        active={active}
        watermark={t('priceCompare.view.watermark')}
        noBatchLabel={t('priceCompare.view.noBatch')}
        data={data}
        varieties={varieties}
        brands={brands}
        rows={rows}
        lengthPremium={lengthPremium}
        lengthPremiums={premiumByLength}
        patchSheet={patchSheet}
        setRows={setRows}
        refPeriods={refPeriods}
        onRefreshPrice={onRefreshPrice}
        refreshing={refreshing}
        config={config}
        onOpenConfig={() => setConfigOpen(true)}
        availability={availability}
        spotRef={spotRef}
        readOnly={readOnly}
        onCollabStateChange={handleCollabStateChange}
        onToggleHrb400eFallback={
          configLoaded
            ? () => {
                void setHrb400eFallback(!config.hrb400eFallback)
              }
            : undefined
        }
      />

      <div className="price-compare-save-status-row">
        <PriceCompareSaveStatus onRetry={retrySave} status={saveStatus} />
      </div>

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
  watermark,
  noBatchLabel,
  data,
  varieties,
  brands,
  rows,
  lengthPremium,
  lengthPremiums,
  patchSheet,
  setRows,
  refPeriods,
  onRefreshPrice,
  refreshing,
  config,
  onOpenConfig,
  availability,
  spotRef,
  readOnly,
  onCollabStateChange,
  onToggleHrb400eFallback,
}: {
  active: ReturnType<typeof useSheetsStore>['active']
  watermark: string
  noBatchLabel: string
  data: React.ComponentProps<typeof SheetPanel>['data']
  varieties: React.ComponentProps<typeof SheetPanel>['varieties']
  brands: React.ComponentProps<typeof SheetPanel>['brands']
  rows: React.ComponentProps<typeof SheetPanel>['rows']
  lengthPremium: number
  lengthPremiums: React.ComponentProps<typeof SheetPanel>['lengthPremiums']
  patchSheet: React.ComponentProps<typeof SheetPanel>['patchSheet']
  setRows: React.ComponentProps<typeof SheetPanel>['setRows']
  refPeriods: string[]
  onRefreshPrice: () => Promise<void> | void
  refreshing: boolean
  config: ReturnType<typeof useSheetsStore>['config']
  onOpenConfig: () => void
  availability: React.ComponentProps<typeof SheetPanel>['availability']
  spotRef: React.ComponentProps<typeof SheetPanel>['spotRef']
  readOnly: boolean
  onCollabStateChange?: (bridge: SheetCollabBridge | null) => void
  /** 项目配置已加载后可切换 HRB400E 参考价；加载中不展示按钮。 */
  onToggleHrb400eFallback?: () => void
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
      <SheetPanel
        key={active.id}
        sheet={active}
        data={data}
        varieties={varieties}
        brands={brands}
        rows={rows}
        density="small"
        lengthPremium={lengthPremium}
        lengthPremiums={lengthPremiums}
        patchSheet={patchSheet}
        setRows={setRows}
        periods={refPeriods}
        onRefresh={() => {
          void onRefreshPrice()
        }}
        refreshing={refreshing}
        allowHrb400eFallback={config.hrb400eFallback}
        onToggleHrb400eFallback={onToggleHrb400eFallback}
        allowedProducts={config.products}
        onOpenConfig={onOpenConfig}
        availability={availability}
        spotRef={spotRef}
        readOnly={readOnly}
        onCollabStateChange={onCollabStateChange}
      />
    </Watermark>
  )
}
