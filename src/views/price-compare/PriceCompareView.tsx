import {
  FullscreenExitOutlined,
  FullscreenOutlined,
  LockOutlined,
  RedoOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Badge,
  Button,
  Divider,
  Empty,
  Flex,
  Segmented,
  Select,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Tour,
  Typography,
  Watermark,
} from 'antd'
import { useEffect, useRef, useState } from 'react'
import { modal } from '@/utils/antd-app'
import { countMissing, moveItem, resolveRef } from './core'
import { ReportSettingsModal } from './ReportSettingsModal'
import { SheetPanel } from './SheetPanel'
import type { PriceSheet, ProjectOption } from './types'
import { useMaterialBrands } from './useMaterialBrands'
import { usePriceCompareData } from './usePriceCompareData'
import { useSheetsStore } from './useSheetsStore'
import './price-compare.css'

const { Text } = Typography
const TOUR_KEY = 'aries-price-compare-tour'
const SCHEMA_DEFAULT_PREMIUM = 30

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void document.getElementById('price-compare-root')?.requestFullscreen()
  }
}

function projectAbbrOf(
  projects: ProjectOption[],
  projectId: string,
  fallback: string,
): string {
  for (const project of projects) {
    if (project.id === projectId) return project.abbr || project.name
  }
  return fallback || '未指定项目'
}

function projectGroupsOf(
  sheets: PriceSheet[],
): { projectId: string; projectName: string; sheets: PriceSheet[] }[] {
  const byId = new Map<
    string,
    { projectId: string; projectName: string; sheets: PriceSheet[] }
  >()
  for (const sheet of sheets) {
    let group = byId.get(sheet.projectId)
    if (!group) {
      group = {
        projectId: sheet.projectId,
        projectName: sheet.projectName,
        sheets: [],
      }
      byId.set(sheet.projectId, group)
    }
    group.sheets.push(sheet)
  }
  return [...byId.values()]
}

/** 报单比价页: 顶部胶囊(项目/批次) + 单据表格。 */
export function PriceCompareView() {
  const { data, varieties, projects, catalog, loading, error } =
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
    brands,
    settings = { lengthPremium: SCHEMA_DEFAULT_PREMIUM },
    setSettings,
    canUndo,
    canRedo,
    undo,
    redo,
    setRows,
    setBrands,
    setActiveId,
    patchSheet,
    addSheet,
    copyActiveSheet,
    assignProjectToUnassigned,
    removeSheet,
  } = store

  const [density, setDensity] = useState<'small' | 'middle' | 'large'>('small')
  const [fullscreen, setFullscreen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const spotRef = useRef<HTMLSpanElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || !projects.length) return
    initialized.current = true
    assignProjectToUnassigned(
      projects[0].id,
      projects[0].abbr || projects[0].name,
    )
    if (!brands.length)
      setBrands(
        catalog.map((item) => ({ name: item.name, freight: item.freight })),
      )
    if (!localStorage.getItem(TOUR_KEY)) setTourOpen(true)
  }, [projects, catalog, brands.length, assignProjectToUnassigned, setBrands])

  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

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
      content: '批次及其填写内容将一并删除',
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
          <span className="price-compare-desc">
            项目 → 批次 · Ctrl+Z 撤销 · 锁定防改 · 一键截图
          </span>
        </div>
      </div>

      <Flex gap={8} align="center" wrap="wrap" style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          项目
        </Text>
        {projectGroups.map((group) => (
          <Tag.CheckableTag
            key={group.projectId}
            checked={group.projectId === currentGroup?.projectId}
            onChange={() => group.sheets[0] && setActiveId(group.sheets[0].id)}
          >
            {projectAbbrOf(projects, group.projectId, group.projectName)}
          </Tag.CheckableTag>
        ))}
        <Select
          size="small"
          style={{ width: 170 }}
          placeholder="＋ 项目批次"
          showSearch={{ optionFilterProp: 'label' }}
          value={null}
          options={projects
            .filter(
              (project) =>
                !projectGroups.some((group) => group.projectId === project.id),
            )
            .map((project) => ({
              value: project.id,
              label: `${project.abbr} · ${project.name}`,
            }))}
          onChange={(projectId) => {
            const project = projects.find((item) => item.id === projectId)
            if (project)
              addSheet(
                project.id,
                project.abbr || project.name,
                today,
                defaultRefDate,
                defaultRefPeriod,
              )
          }}
        />
      </Flex>

      <Flex
        gap={12}
        align="center"
        wrap="wrap"
        justify="space-between"
        style={{ marginBottom: 8 }}
      >
        <Flex gap={8} align="center">
          <Text type="secondary" style={{ fontSize: 12 }}>
            批次
          </Text>
          <Segmented
            value={activeId}
            onChange={(value) => setActiveId(String(value))}
            options={(currentGroup?.sheets ?? []).map((sheet) => ({
              value: sheet.id,
              label: (
                <span>
                  {sheet.name}
                  {sheet.locked ? (
                    <LockOutlined style={{ marginLeft: 4 }} />
                  ) : null}
                  {countMissing(
                    data,
                    { ...sheet, ...resolveRef(data, sheet) },
                    sheet.rows,
                    brands,
                  ) > 0 ? (
                    <Badge
                      count={countMissing(
                        data,
                        { ...sheet, ...resolveRef(data, sheet) },
                        sheet.rows,
                        brands,
                      )}
                      size="small"
                      color="#faad14"
                      style={{ marginLeft: 6 }}
                    />
                  ) : null}
                </span>
              ),
            }))}
          />
        </Flex>
        <Space size={4}>
          <Button
            size="small"
            onClick={() =>
              addSheet(
                currentGroup?.projectId ?? '',
                currentGroup?.projectName ?? '',
                today,
                defaultRefDate,
                defaultRefPeriod,
              )
            }
          >
            ＋ 新批次
          </Button>
          {active && currentGroup && currentGroup.sheets.length > 1 ? (
            <Button
              size="small"
              danger
              onClick={() => confirmRemoveSheet(active.id)}
            >
              删除批次
            </Button>
          ) : null}
          <Divider type="vertical" style={{ margin: '0 2px' }} />
          <Segmented
            size="small"
            value={density}
            onChange={(value) =>
              setDensity(value as 'small' | 'middle' | 'large')
            }
            options={[
              { label: '紧凑', value: 'small' },
              { label: '适中', value: 'middle' },
              { label: '宽松', value: 'large' },
            ]}
          />
          <Tooltip title={fullscreen ? '退出全屏' : '全屏'}>
            <Button
              size="small"
              icon={
                fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />
              }
              onClick={toggleFullscreen}
            />
          </Tooltip>
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button
              size="small"
              icon={<UndoOutlined />}
              disabled={!canUndo}
              onClick={undo}
            />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Shift+Z / Ctrl+Y)">
            <Button
              size="small"
              icon={<RedoOutlined />}
              disabled={!canRedo}
              onClick={redo}
            />
          </Tooltip>
        </Space>
      </Flex>

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
            density={density}
            lengthPremium={settings?.lengthPremium ?? SCHEMA_DEFAULT_PREMIUM}
            patchSheet={patchSheet}
            setRows={setRows}
            onReorderBrands={(from, to) =>
              setBrands((current) => moveItem(current, from, to))
            }
            onOpenSettings={() => setSettingsOpen(true)}
            onCopySheet={copyActiveSheet}
            spotRef={spotRef}
          />
        </Watermark>
      ) : (
        <Flex justify="center" style={{ padding: 40 }}>
          <Empty description="暂无批次" />
        </Flex>
      )}

      <Flex justify="flex-end" style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          数据源为本地行情快照，正式环境将改为后端接口
        </Text>
      </Flex>

      <ReportSettingsModal
        open={settingsOpen}
        brandOptions={brandOptions}
        brands={brands}
        lengthPremium={settings?.lengthPremium ?? SCHEMA_DEFAULT_PREMIUM}
        onClose={() => setSettingsOpen(false)}
        onSave={({ brands: nextBrands, lengthPremium }) => {
          setBrands(nextBrands)
          setSettings({ lengthPremium })
        }}
      />

      <Tour
        open={tourOpen}
        onClose={() => {
          setTourOpen(false)
          localStorage.setItem(TOUR_KEY, '1')
        }}
        steps={[
          {
            title: '选择项目/批次',
            description: '顶部胶囊切换项目与批次，批次即一次报价',
            target: () => document.body,
          },
          {
            title: '分组与录入',
            description:
              '可在表内添加分组、拖拽排序；逐格录入现货价，回车/上下移动',
            target: () => spotRef.current ?? document.body,
          },
        ]}
      />
    </div>
  )
}
