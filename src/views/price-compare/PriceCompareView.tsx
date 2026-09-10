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
  Segmented,
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
import { CATEGORIES, countMissing, makeRow } from './core'
import { SheetPanel } from './SheetPanel'
import type { Brand } from './types'
import { usePriceCompareData } from './usePriceCompareData'
import { useSheetsStore } from './useSheetsStore'
import './price-compare.css'

const { Text } = Typography
const TOUR_KEY = 'aries-price-compare-tour'

type BrandFormValues = { brands: Brand[] }

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void document.getElementById('price-compare-root')?.requestFullscreen()
  }
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

  const addPriceRow = (category = '螺纹钢') => {
    setRows((list) => [...list, makeRow(category)])
  }

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

  const tabItems = useMemo(
    () =>
      sheets.map((sheet) => {
        const missing = countMissing(data, sheet, rows, brands)
        return {
          key: sheet.id,
          closable: sheets.length > 1,
          label: (
            <span>
              {sheet.name} {sheet.locked ? <LockOutlined /> : null}{' '}
              {missing > 0 ? (
                <Badge count={missing} size="small" color="#faad14" />
              ) : null}
            </span>
          ),
        }
      }),
    [sheets, data, rows, brands],
  )

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
            多单据 · 手工录入（回车/上下切换）· Ctrl+Z 撤销 · 锁定防改 ·
            一键截图
          </span>
        </div>
        <Space>
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
          <Button size="small" onClick={() => addPriceRow(CATEGORIES[0])}>
            ＋规格行
          </Button>
        </Space>
      </div>

      <Tabs
        type="editable-card"
        size="small"
        activeKey={activeId}
        onChange={setActiveId}
        onEdit={(target, action) =>
          action === 'add'
            ? addSheet(sheets[0]?.projectId ?? '')
            : confirmRemoveSheet(String(target))
        }
        items={tabItems}
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
            projects={projects}
            catalog={catalog}
            brands={brands}
            rows={rows}
            density={density}
            patchSheet={patchSheet}
            setRows={setRows}
            setBrands={setBrands}
            onOpenSettings={openSettings}
            brandSelectRef={brandSelectRef}
            spotRef={spotRef}
            captureBtnRef={captureBtnRef}
          />
        </Watermark>
      ) : (
        <Card>
          <Empty description="暂无单据">
            <Button type="primary" onClick={() => addSheet('')}>
              新建单据
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
