import { Alert, Empty, Flex, Skeleton, Watermark } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { modal } from '@/utils/antd-app'
import { moveItem } from './core'
import { ProjectConfigModal } from './ProjectConfigModal'
import {
  PriceCompareBatchBar,
  PriceCompareProjectPicker,
} from './price-compare-pickers'
import { projectGroupsOf, TOUR_KEY } from './price-compare-support'
import { PriceCompareTour } from './price-compare-tour'
import { SheetPanel } from './SheetPanel'
import { useMaterialBrands } from './useMaterialBrands'
import { usePriceCompareData } from './usePriceCompareData'
import { usePriceComparePricing } from './usePriceComparePricing'
import { useSheetsStore } from './useSheetsStore'
import './price-compare.css'

/** 报单比价页: 顶部胶囊(项目/批次) + 单据表格。 */
export function PriceCompareView() {
  const { data, varieties, projects, catalog, loading, error, mergeMatches } =
    usePriceCompareData()
  const materialBrands = useMaterialBrands()
  const brandOptions = materialBrands.length
    ? materialBrands
    : catalog.map((item) => item.name)

  const store = useSheetsStore()
  const {
    sheets,
    activeId,
    active,
    rows,
    config,
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
  } = store

  const brands = config.brands
  const lengthPremium = config.lengthPremium

  const [configOpen, setConfigOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const spotRef = useRef<HTMLSpanElement>(null)
  const initialized = useRef(false)
  const urlParamsApplied = useRef(false)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    if (initialized.current || !projects.length) return
    initialized.current = true
    assignProjectToUnassigned(
      projects[0].id,
      projects[0].abbr || projects[0].name,
    )
    if (!localStorage.getItem(TOUR_KEY)) setTourOpen(true)
  }, [projects, assignProjectToUnassigned])

  useEffect(() => {
    if (active?.projectId && catalog.length && !config.brands.length)
      setBrands(
        catalog.map((item) => ({ name: item.name, freight: item.freight })),
      )
  }, [active?.projectId, catalog, config.brands.length, setBrands])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

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
  } = usePriceComparePricing({ active, data, isAuthenticated })

  const patchSheetRef = useRef(patchSheet)
  useEffect(() => {
    patchSheetRef.current = patchSheet
  }, [patchSheet])

  useEffect(() => {
    if (!activeSheetId || !activeRefDate || !resolvedRefPeriod) return
    if (resolvedRefPeriod !== activeRefPeriod)
      patchSheetRef.current(activeSheetId, { refPeriod: resolvedRefPeriod })
  }, [activeSheetId, activeRefDate, activeRefPeriod, resolvedRefPeriod])

  useEffect(() => {
    const matches = matchesData
    if (!activeSheetId || !matches?.length) return
    mergeMatches(matches)
    if (isLatestRef) {
      const quoteDate = matches.find((row) => row.quoteDate)?.quoteDate ?? ''
      const period = matches.find((row) => row.period)?.period ?? ''
      patchSheetRef.current(activeSheetId, {
        refDate: quoteDate,
        ...(activeRefPeriod ? {} : { refPeriod: period }),
      })
    }
  }, [activeSheetId, activeRefPeriod, isLatestRef, matchesData, mergeMatches])

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
  const today = new Date().toISOString().slice(0, 10)

  const confirmRemoveSheet = (id: string) =>
    modal.confirm({
      title: '删除该批次？',
      content: '该批次的全部录入内容将一并删除',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => removeSheet(id),
    })

  if (loading) {
    return (
      <div className="price-compare-page">
        <Skeleton active />
      </div>
    )
  }
  if (error) {
    return (
      <div className="price-compare-page">
        <Alert
          type="error"
          showIcon
          title="比价数据加载失败"
          description={error}
        />
      </div>
    )
  }

  return (
    <div id="price-compare-root" className="price-compare-page">
      <div className="price-compare-head">
        <div>
          <h1>报单比价</h1>
        </div>
      </div>

      <PriceCompareProjectPicker
        projects={projects}
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
        active={active}
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
      />

      {active ? (
        <Watermark
          content={['内部资料 · 报单比价', active.name]}
          gap={[140, 120]}
          font={{ fontSize: 12, color: 'rgba(0,0,0,0.035)' }}
        >
          <SheetPanel
            sheet={active}
            data={data}
            varieties={varieties}
            brands={brands}
            rows={rows}
            density="small"
            lengthPremium={lengthPremium}
            patchSheet={patchSheet}
            setRows={setRows}
            onReorderBrands={(from, to) =>
              setBrands((current) => moveItem(current, from, to))
            }
            periods={refPeriods}
            onRefresh={() => {
              void onRefreshPrice()
            }}
            refreshing={refreshing}
            allowHrb400eFallback={config.hrb400eFallback}
            allowedProducts={config.products}
            onOpenConfig={() => setConfigOpen(true)}
            availability={availability}
            spotRef={spotRef}
          />
        </Watermark>
      ) : (
        <Flex justify="center" style={{ padding: 40 }}>
          <Empty description="暂无批次" />
        </Flex>
      )}

      <ProjectConfigModal
        open={configOpen}
        brandOptions={brandOptions}
        varieties={varieties}
        config={config}
        onClose={() => setConfigOpen(false)}
        onSave={(next) => setConfig(next)}
      />

      <PriceCompareTour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        spotRef={spotRef}
      />
    </div>
  )
}
