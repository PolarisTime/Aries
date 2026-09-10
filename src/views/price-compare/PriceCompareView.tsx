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
  Card,
  Empty,
  Flex,
  Form,
  Input,
  Segmented,
  Select,
  Skeleton,
  Space,
  Tabs,
  Tooltip,
  Tour,
  Typography,
  Watermark,
} from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { modal } from '@/utils/antd-app'
import { BrandSettingsDrawer } from './BrandSettingsDrawer'
import { countMissing } from './core'
import { SheetPanel } from './SheetPanel'
import type { Brand, PriceSheet, ProjectOption } from './types'
import { usePriceCompareData } from './usePriceCompareData'
import { useSheetsStore } from './useSheetsStore'
import './price-compare.css'

const { Text } = Typography
const TOUR_KEY = 'aries-price-compare-tour'

const SHEET_STATUS_COLOR: Record<string, string> = {
  报价: '#1677ff',
  已报: '#faad14',
  成交: '#389e0d',
  作废: '#bfbfbf',
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

type ProjectGroup = {
  projectId: string
  projectName: string
  sheets: PriceSheet[]
}

function SheetTabLabel({
  sheet,
  onRename,
}: {
  sheet: { id: string; name: string; status: string; locked: boolean }
  onRename: (id: string, name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(sheet.name)
  if (editing) {
    return (
      <Input
        size="small"
        autoFocus
        style={{ width: 120 }}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          setEditing(false)
          if (draft.trim()) onRename(sheet.id, draft.trim())
        }}
        onPressEnter={() => {
          setEditing(false)
          if (draft.trim()) onRename(sheet.id, draft.trim())
        }}
        onClick={(event) => event.stopPropagation()}
      />
    )
  }
  return (
    <span
      onDoubleClick={() => {
        setDraft(sheet.name)
        setEditing(true)
      }}
      title="双击重命名"
    >
      {sheet.name}{' '}
      <span style={{ color: SHEET_STATUS_COLOR[sheet.status] ?? '#8c8c8c' }}>
        ●
      </span>
      {sheet.locked ? <LockOutlined style={{ marginLeft: 4 }} /> : null}
    </span>
  )
}

type BrandFormValues = { brands: Brand[] }

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void document.getElementById('price-compare-root')?.requestFullscreen()
  }
}

type PriceCompareHeaderProps = {
  density: 'small' | 'middle' | 'large'
  fullscreen: boolean
  canUndo: boolean
  canRedo: boolean
  onDensityChange: (value: 'small' | 'middle' | 'large') => void
  onToggleFullscreen: () => void
  onUndo: () => void
  onRedo: () => void
}

/** 页面头: 标题 + 密度/全屏/撤销/重做。 */
function PriceCompareHeader({
  density,
  fullscreen,
  canUndo,
  canRedo,
  onDensityChange,
  onToggleFullscreen,
  onUndo,
  onRedo,
}: PriceCompareHeaderProps) {
  return (
    <div className="price-compare-head">
      <div>
        <h1>报单比价</h1>
        <span className="price-compare-desc">
          项目 → 批次 → 类别分组 · Ctrl+Z 撤销 · 锁定防改 · 一键截图
        </span>
      </div>
      <Space>
        <Segmented
          size="small"
          value={density}
          onChange={(value) =>
            onDensityChange(value as 'small' | 'middle' | 'large')
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
            onClick={onToggleFullscreen}
          />
        </Tooltip>
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button
            size="small"
            icon={<UndoOutlined />}
            disabled={!canUndo}
            onClick={onUndo}
          />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Shift+Z / Ctrl+Y)">
          <Button
            size="small"
            icon={<RedoOutlined />}
            disabled={!canRedo}
            onClick={onRedo}
          />
        </Tooltip>
      </Space>
    </div>
  )
}

type ProjectBatchTabsProps = {
  projects: ProjectOption[]
  projectGroups: ProjectGroup[]
  activeProjectId: string
  activeId: string
  projectItems: import('antd').TabsProps['items']
  batchItems: import('antd').TabsProps['items']
  onSwitchProject: (projectId: string) => void
  onSwitchBatch: (id: string) => void
  onAddBatch: () => void
  onRemoveBatch: (id: string) => void
  onAddProjectBatch: (projectId: string) => void
}

/** 大 Tab(项目) -> 批次 Tab。 */
function ProjectBatchTabs({
  projects,
  projectGroups,
  activeProjectId,
  activeId,
  projectItems,
  batchItems,
  onSwitchProject,
  onSwitchBatch,
  onAddBatch,
  onRemoveBatch,
  onAddProjectBatch,
}: ProjectBatchTabsProps) {
  const availableProjects = (() => {
    const options: { value: string; label: string }[] = []
    for (const project of projects) {
      let used = false
      for (const group of projectGroups) {
        if (group.projectId === project.id) {
          used = true
          break
        }
      }
      if (!used)
        options.push({
          value: project.id,
          label: `${project.abbr} · ${project.name}`,
        })
    }
    return options
  })()

  return (
    <>
      <Tabs
        size="small"
        activeKey={activeProjectId}
        onChange={onSwitchProject}
        items={projectItems}
        tabBarExtraContent={
          <Select
            size="small"
            style={{ width: 190 }}
            placeholder="＋ 项目批次"
            showSearch={{ optionFilterProp: 'label' }}
            value={null}
            options={availableProjects}
            onChange={onAddProjectBatch}
          />
        }
      />
      <Tabs
        type="editable-card"
        size="small"
        activeKey={activeId}
        onChange={onSwitchBatch}
        onEdit={(target, action) =>
          action === 'add' ? onAddBatch() : onRemoveBatch(String(target))
        }
        items={batchItems}
      />
    </>
  )
}

/** 比价页: 多单据 + 品牌分项对比。 */
export function PriceCompareView() {
  const { data, varieties, projects, catalog, loading, error } =
    usePriceCompareData()
  const store = useSheetsStore()
  const {
    sheets,
    activeId,
    active,
    rows,
    brands,
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
    removeSheet,
  } = store

  const [density, setDensity] = useState<'small' | 'middle' | 'large'>('small')
  const [fullscreen, setFullscreen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [form] = Form.useForm<BrandFormValues>()

  const brandSelectRef = useRef<HTMLSpanElement>(null)
  const spotRef = useRef<HTMLSpanElement>(null)
  const captureBtnRef = useRef<HTMLSpanElement>(null)

  // 数据源就绪后, 首次访问展示引导; 并按品牌数据源初始化默认品牌
  useEffect(() => {
    if (!catalog.length) return
    if (brands.length === 0) {
      setBrands(
        catalog.map((item) => ({ name: item.name, freight: item.freight })),
      )
    }
    if (!localStorage.getItem(TOUR_KEY)) setTourOpen(true)
  }, [catalog, brands.length, setBrands])

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

  const openSettings = () => {
    form.setFieldsValue({ brands: brands.map((brand) => ({ ...brand })) })
    setSettingsOpen(true)
  }
  const saveSettings = () => {
    void form.validateFields().then((values) => {
      const next = (values.brands ?? []).reduce<Brand[]>((list, brand) => {
        if (brand.name)
          list.push({ name: brand.name, freight: Number(brand.freight) || 0 })
        return list
      }, [])
      setBrands(next)
      setSettingsOpen(false)
    })
  }

  const confirmRemoveSheet = (id: string) =>
    modal.confirm({
      title: '删除该单据？',
      content: '单据及其填写内容将一并删除',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => removeSheet(id),
    })

  const projectGroups = useMemo(() => {
    const groups: ProjectGroup[] = []
    for (const sheet of sheets) {
      let group = groups.find((item) => item.projectId === sheet.projectId)
      if (!group) {
        group = {
          projectId: sheet.projectId,
          projectName: sheet.projectName,
          sheets: [],
        }
        groups.push(group)
      }
      group.sheets.push(sheet)
    }
    return groups
  }, [sheets])

  const activeProjectId = active?.projectId ?? projectGroups[0]?.projectId ?? ''

  const projectTabItems = useMemo(
    () =>
      projectGroups.map((group) => ({
        key: group.projectId,
        label: (
          <span>
            {projectAbbrOf(projects, group.projectId, group.projectName)}{' '}
            <Badge count={group.sheets.length} size="small" color="#1677ff" />
          </span>
        ),
      })),
    [projectGroups, projects],
  )

  const batchTabItems = useMemo(() => {
    const items = []
    for (const group of projectGroups) {
      if (group.projectId !== activeProjectId) continue
      for (const sheet of group.sheets) {
        const missing = countMissing(data, sheet, sheet.rows, brands)
        items.push({
          key: sheet.id,
          closable: sheets.length > 1,
          label: (
            <span>
              <SheetTabLabel
                sheet={sheet}
                onRename={(id, name) => patchSheet(id, { name })}
              />{' '}
              {missing > 0 ? (
                <Badge count={missing} size="small" color="#faad14" />
              ) : null}
            </span>
          ),
        })
      }
    }
    return items
  }, [projectGroups, activeProjectId, data, brands, sheets.length, patchSheet])

  const switchProject = (projectId: string) => {
    const group = projectGroups.find((item) => item.projectId === projectId)
    if (group?.sheets.length) setActiveId(group.sheets[0].id)
  }

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
      <PriceCompareHeader
        density={density}
        onDensityChange={setDensity}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      <ProjectBatchTabs
        projects={projects}
        projectGroups={projectGroups}
        activeProjectId={activeProjectId}
        activeId={activeId}
        projectItems={projectTabItems}
        batchItems={batchTabItems}
        onSwitchProject={switchProject}
        onSwitchBatch={setActiveId}
        onAddBatch={() =>
          addSheet(active?.projectId ?? '', active?.projectName ?? '')
        }
        onRemoveBatch={(id) => confirmRemoveSheet(id)}
        onAddProjectBatch={(projectId) => {
          const project = projects.find((item) => item.id === projectId)
          if (project) addSheet(project.id, project.abbr || project.name)
        }}
      />

      {active ? (
        <Watermark
          content={['内部资料 · 报单比价', active.name]}
          gap={[140, 120]}
          font={{ fontSize: 12, color: 'rgba(0,0,0,0.06)' }}
        >
          <SheetPanel
            sheet={active}
            data={data}
            varieties={varieties}
            catalog={catalog}
            brands={brands}
            rows={rows}
            density={density}
            patchSheet={patchSheet}
            setRows={setRows}
            setBrands={setBrands}
            onOpenSettings={openSettings}
            onCopySheet={copyActiveSheet}
            brandSelectRef={brandSelectRef}
            spotRef={spotRef}
            captureBtnRef={captureBtnRef}
          />
        </Watermark>
      ) : (
        <Card>
          <Empty description="暂无批次">
            <Button
              type="primary"
              onClick={() =>
                addSheet(projects[0]?.id ?? '', projects[0]?.abbr ?? '')
              }
            >
              新建批次
            </Button>
          </Empty>
        </Card>
      )}

      <Flex justify="flex-end" style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          数据源为本地行情快照，正式环境将改为后端接口
        </Text>
      </Flex>

      <BrandSettingsDrawer
        open={settingsOpen}
        catalog={catalog}
        form={form}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
      />

      <Tour
        open={tourOpen}
        onClose={() => {
          setTourOpen(false)
          localStorage.setItem(TOUR_KEY, '1')
        }}
        steps={[
          {
            title: '选择品牌',
            description: '勾选参与比价的品牌，网价自动取自行情数据源',
            target: () => brandSelectRef.current ?? document.body,
          },
          {
            title: '录入现货价',
            description: '支持 Excel 复制一列粘贴、回车/上下键切换、锁定防改',
            target: () => spotRef.current ?? document.body,
          },
          {
            title: '截图发出去',
            description: '一键截图或复制图片，可直接粘贴到聊天工具发送',
            target: () => captureBtnRef.current ?? document.body,
          },
        ]}
      />
    </div>
  )
}
