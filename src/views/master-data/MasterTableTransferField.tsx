import type { TableColumnsType, TableProps } from 'antd'
import {
  Button,
  Flex,
  Form,
  Modal,
  Table,
  Tag,
  Transfer,
  Typography,
} from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DIALOG_LEVEL_2_WIDE_WIDTH,
  dialogLevelProps,
} from '@/components/dialog-levels'
import type { MasterOption } from './master-data-types'
import './master-table-transfer.css'

export type TransferItem = { key: string; title: string }

interface Props {
  value?: (string | number)[]
  onChange?: (value: string[]) => void
  options: MasterOption[]
  disabled?: boolean
  placeholder?: string
  /** 穿梭框表格的列标题（通常是字段名）。 */
  columnTitle?: string
}

const toKey = (value: unknown) => String(value ?? '')

/**
 * 经营品牌等「多选 + 需要浏览对比」的字段控件：表单里只显示已选标签，
 * 点「选择品牌」在弹窗里用**表格穿梭框**（Transfer + Table）选择。
 *
 * <p>为什么不用多选 Select：品牌数量多时下拉只能靠输入过滤，看不出全貌；
 * 表格穿梭框能同时看到「可选 / 已选」两栏并带搜索。表单里内联放穿梭框会把
 * 弹层撑高，所以选择过程放二级弹窗，确认后才回写 Form 值。</p>
 */
export function MasterTableTransferField({
  value,
  onChange,
  options,
  disabled,
  placeholder,
  columnTitle,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<{ brands: string[] }>()
  const bodyRef = useRef<HTMLDivElement | null>(null)

  /*
   * 2 级弹窗的首次焦点落在「可操作区」（搜索框），而不是右上角的关闭按钮：
   * 品牌多时用户打开就想搜索/勾选，默认焦点在 X 上要多按一次 Tab。
   * 用 setTimeout(0) 而不是 afterOpenChange：不依赖动画结束事件（jsdom 里不会触发）。
   */
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      bodyRef.current?.querySelector<HTMLInputElement>('input')?.focus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open])

  const selectedKeys = (value ?? []).map(toKey)
  const items: TransferItem[] = options.map((option) => ({
    key: toKey(option.value),
    title: option.label,
  }))
  const titleByKey = new Map(items.map((item) => [item.key, item.title]))
  const columns: TableColumnsType<TransferItem> = [
    {
      dataIndex: 'title',
      title: columnTitle ?? t('modules.pages.supplier.colBrands'),
      ellipsis: true,
    },
  ]

  const openDialog = () => {
    setOpen(true)
  }

  return (
    <Flex align="center" className="master-transfer-field" gap={8}>
      <button
        aria-label={t('modules.pages.supplier.brandsTransferTitle')}
        className="master-transfer-field-box"
        disabled={disabled}
        onClick={openDialog}
        type="button"
      >
        {selectedKeys.length === 0 ? (
          <Typography.Text type="secondary">
            {placeholder ?? t('modules.pages.supplier.brandsTransferEmpty')}
          </Typography.Text>
        ) : (
          <Flex gap={4} wrap>
            {selectedKeys.map((key) => (
              <Tag key={key} className="master-transfer-field-tag">
                {titleByKey.get(key) ?? key}
              </Tag>
            ))}
          </Flex>
        )}
      </button>
      <Button disabled={disabled} onClick={openDialog}>
        {t('modules.pages.supplier.brandsSelectAction')}
      </Button>

      <Modal
        cancelText={t('common.cancel')}
        centered
        destroyOnHidden
        okText={t('common.confirm')}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        open={open}
        title={t('modules.pages.supplier.brandsTransferTitle')}
        width={DIALOG_LEVEL_2_WIDE_WIDTH}
        {...dialogLevelProps(2)}
      >
        {/* 二级弹窗同样用 antd Form 承载值：确定 = 表单提交，取消自然丢弃 */}
        <div ref={bodyRef}>
          <Form<{ brands: string[] }>
            form={form}
            initialValues={{ brands: selectedKeys }}
            onFinish={(values) => {
              onChange?.(values.brands ?? [])
              setOpen(false)
            }}
          >
            <Form.Item name="brands" style={{ marginBottom: 0 }}>
              <TableTransfer columns={columns} dataSource={items} />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </Flex>
  )
}

type TableTransferProps<Item extends TransferItem> = {
  dataSource: Item[]
  columns: TableColumnsType<Item>
  /** 由 Form.Item 注入：已选 key 列表。 */
  value?: string[]
  /** 由 Form.Item 注入。 */
  onChange?: (targetKeys: string[]) => void
  /** 两栏固定高度（px）：品牌列表默认 380，规格列表条目更多时由调用方按需放大。 */
  sectionHeight?: number
  /** 表体滚动高度（px）；与两栏高度一起保证弹窗不被条目数撑高。 */
  scrollY?: number
  /**
   * 无障碍名：Transfer 自身没有可访问名（`titles` 只命名左右两栏），
   * 读屏只会念「穿梭框」。传了就包一层 `role="group"` 承载这个名字。
   */
  ariaLabel?: string
}

/**
 * Transfer + Table：左右两栏都用表格展示，点击整行即可移动（antd 官方 Table Transfer 形态）。
 *
 * <p>泛型化是为了让「品牌」与「品牌规格」共用同一套穿梭框接线（搜索、整行点击、
 * 批量选择、两栏定高）；两处各写一份会出现"一处能整行点选、另一处不能"的体验差异。</p>
 */
export function TableTransfer<Item extends TransferItem>({
  dataSource,
  columns,
  value,
  onChange,
  sectionHeight = 380,
  scrollY = 280,
  ariaLabel,
}: TableTransferProps<Item>) {
  const targetKeys = value ?? []
  const { t } = useTranslation()
  const listDisabled = false
  const transfer = (
    <Transfer<Item>
      className="master-transfer"
      dataSource={dataSource}
      styles={{
        // 两栏固定高度：表格在内部滚动，品牌 30+ 条也不会把弹窗撑高
        section: { height: sectionHeight },
      }}
      filterOption={(input, item) => item.title.includes(input)}
      onChange={(nextKeys) => onChange?.(nextKeys.map(toKey))}
      actions={[
        t('modules.pages.supplier.brandsTransferRight'),
        t('modules.pages.supplier.brandsTransferLeft'),
      ]}
      showSearch
      showSelectAll={false}
      style={{ width: '100%' }}
      titles={[
        t('modules.pages.supplier.brandsTransferLeft'),
        t('modules.pages.supplier.brandsTransferRight'),
      ]}
      targetKeys={targetKeys}
    >
      {({
        filteredItems,
        onItemSelect,
        onItemSelectAll,
        selectedKeys,
        disabled: transferDisabled,
      }) => {
        const rowSelection: TableProps<Item>['rowSelection'] = {
          getCheckboxProps: () => ({ disabled: transferDisabled }),
          onChange(selectedRowKeys) {
            onItemSelectAll(selectedRowKeys, 'replace')
          },
          selectedRowKeys: selectedKeys,
          selections: [
            Table.SELECTION_ALL,
            Table.SELECTION_INVERT,
            Table.SELECTION_NONE,
          ],
        }
        return (
          <Table<Item>
            columns={columns}
            dataSource={filteredItems}
            pagination={false}
            rowSelection={rowSelection}
            rowKey="key"
            scroll={{ y: scrollY }}
            size="small"
            style={{ pointerEvents: listDisabled ? 'none' : undefined }}
            onRow={({ key }) => ({
              onClick: () => {
                if (!transferDisabled) {
                  onItemSelect(key, !selectedKeys.includes(key))
                }
              },
            })}
          />
        )
      }}
    </Transfer>
  )
  if (!ariaLabel) return transfer
  // Transfer 没有可访问名：用 fieldset 承载名字（role="group" 的语义元素），读屏才听得出这是哪一项的穿梭框
  return (
    <fieldset className="master-transfer-group" aria-label={ariaLabel}>
      {transfer}
    </fieldset>
  )
}
