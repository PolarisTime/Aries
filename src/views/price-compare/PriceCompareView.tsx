import {
  FullscreenExitOutlined,
  FullscreenOutlined,
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
import { isAxiosError } from 'axios'
import { useEffect, useRef, useState } from 'react'
import { syncSteelQuotes } from '@/api/market/steel-quotes'
import { message, modal } from '@/utils/antd-app'
import { countMissing, moveItem, resolveRef } from './core'
import { ProjectConfigModal } from './ProjectConfigModal'
import { SheetPanel } from './SheetPanel'
import type { PriceSheet, ProjectOption } from './types'
import { useMaterialBrands } from './useMaterialBrands'
import { usePriceCompareData } from './usePriceCompareData'
import { useSheetsStore } from './useSheetsStore'
import './price-compare.css'

const { Text } = Typography
const TOUR_KEY = 'aries-price-compare-tour'

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
    config,
    setConfig,
    canUndo,
    canRedo,
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

  const [density, setDensity] = useState<'small' | 'middle' | 'large'>('small')
  const [fullscreen, setFullscreen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
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
    if (!localStorage.getItem(TOUR_KEY)) setTourOpen(true)
  }, [projects, assignProjectToUnassigned])

  useEffect(() => {
    if (active?.projectId && catalog.length && !config.brands.length)
      setBrands(
        catalog.map((item) => ({ name: item.name, freight: item.freight })),
      )
  }, [active?.projectId, catalog, config.brands.length, setBrands])

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

  const onSyncPrice = async () => {
    setSyncing(true)
    try {
      const result = await syncSteelQuotes(active?.refDate || today)
      message.success(
        `已拉取 ${result.articleDate} ${result.period} 行情，共 ${result.rowCount} 条${result.created ? '' : '（已存在，未重复入库）'}`,
      )
    } catch (error) {
      console.error('行情同步失败', error)
      if (isAxiosError(error)) {
        const status = error.response?.status
        const problem = error.response?.data as
          | { detail?: string; title?: string }
          | undefined
        if (status === 401) {
          message.error('登录已失效，请重新登录后再试')
          return
        }
        message.error(
          `行情拉取失败：${problem?.detail || problem?.title || `HTTP ${status ?? ''}`}`,
        )
        return
      }
      message.error(
        `行情拉取失败：${error instanceof Error ? error.message : '请稍后重试'}`,
      )
    } finally {
      setSyncing(false)
    }
  }

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
          <span className="price-compare-desc">
            项目 → 批次 · 分组 · Ctrl+Z 撤销
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
          placeholder="新增项目批次"
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
        <Button size="small" onClick={() => setConfigOpen(true)}>
          配置
        </Button>
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
          <Button
            size="small"
            danger
            disabled={!active || sheets.length <= 1}
            title={sheets.length <= 1 ? '至少保留一个批次' : '删除当前批次'}
            onClick={() => active && confirmRemoveSheet(active.id)}
          >
            删除批次
          </Button>
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
            lengthPremium={lengthPremium}
            patchSheet={patchSheet}
            setRows={setRows}
            onReorderBrands={(from, to) =>
              setBrands((current) => moveItem(current, from, to))
            }
            onSyncPrice={() => {
              void onSyncPrice()
            }}
            syncing={syncing}
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
          行情数据暂取自本地快照，正式环境将接入后端接口
        </Text>
      </Flex>

      <ProjectConfigModal
        open={configOpen}
        brandOptions={brandOptions}
        config={config}
        onClose={() => setConfigOpen(false)}
        onSave={(next) => setConfig(next)}
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
            description: '在顶部切换项目与批次；每个批次对应一次报价',
            target: () => document.body,
          },
          {
            title: '分组与录入',
            description:
              '支持添加分组与拖动排序；录入现货价，按回车或方向键切换行',
            target: () => spotRef.current ?? document.body,
          },
        ]}
      />
    </div>
  )
}
