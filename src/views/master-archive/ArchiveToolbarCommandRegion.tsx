import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Space, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'

/**
 * 主数据列表页工具栏的命令区（新建 / 批量删除 / 编辑 / 附件 / 导出 / 列设置 / 清空选择 / 刷新）。
 *
 * <p>项目资料页与物流方资料页的这段结构原本逐字节相同，抽成组件避免两处各自漂移：
 * 无障碍属性（`aria-label`、`aria-live`）、列设置的 click 触发语义、按钮文案都只维护一份。</p>
 *
 * <p>刻意只收布尔量而不收记录对象：这里不需要判断「能不能删/能不能改」，
 * 把能力判断留在各页面（那里才有 `ModuleKey` 上下文）。</p>
 */
export interface ArchiveToolbarCommandRegionProps {
  /** 可配置显隐的列 key（顺序即下拉顺序）。 */
  columnKeys: readonly string[]
  columnLabels: Record<string, string>
  hiddenColumnKeys: string[]
  onToggleColumn: (key: string) => void
  /** 列设置弹层开合；调用方未受控时可不传（Dropdown 自行管理）。 */
  columnSettingsOpen?: boolean
  onColumnSettingsOpenChange?: (open: boolean) => void
  onCreate: () => void
  showDelete: boolean
  onDeleteSelected: () => void
  showEdit: boolean
  onEditSelected: () => void
  showAttachment: boolean
  onAttachmentSelected: () => void
  exporting: boolean
  onExport: () => void
  selectedRowKeysCount: number
  onClearSelection: () => void
  isFetching: boolean
  onRefresh: () => void
}

export function ArchiveToolbarCommandRegion({
  columnKeys,
  columnLabels,
  hiddenColumnKeys,
  onToggleColumn,
  columnSettingsOpen,
  onColumnSettingsOpenChange,
  onCreate,
  showDelete,
  onDeleteSelected,
  showEdit,
  onEditSelected,
  showAttachment,
  onAttachmentSelected,
  exporting,
  onExport,
  selectedRowKeysCount,
  onClearSelection,
  isFetching,
  onRefresh,
}: ArchiveToolbarCommandRegionProps) {
  const { t } = useTranslation()
  // Set 查找: 列设置下拉的选中判定在 filter 里逐项做, 用数组 includes 会退化成 O(n²)。
  const hiddenKeySet = new Set(hiddenColumnKeys)

  return (
    <div className="module-grid-command-region">
      <div className="module-table-toolbar">
        <Space wrap className="module-table-actions">
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            {t('common.create')}
          </Button>
          {showDelete ? (
            <Button danger onClick={onDeleteSelected}>
              {t('hooks.toolbarActions.delete')}
            </Button>
          ) : null}
          {showEdit ? (
            <Button onClick={onEditSelected}>
              {t('hooks.recordActions.edit')}
            </Button>
          ) : null}
          {showAttachment ? (
            <Button onClick={onAttachmentSelected}>
              {t('hooks.recordActions.attachment')}
            </Button>
          ) : null}
          <Button
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={onExport}
          >
            {t('common.export')}
          </Button>
          <Dropdown
            // 用 click 触发: hover-only 的菜单键盘打不开(WCAG 2.1.1), 且受控 open 会被悬停状态复位
            trigger={['click']}
            menu={{
              multiple: true,
              selectedKeys: columnKeys.filter((key) => !hiddenKeySet.has(key)),
              onClick: ({ key }) => {
                onToggleColumn(key)
              },
              items: columnKeys.map((key) => ({
                key,
                label: columnLabels[key],
              })),
            }}
            open={columnSettingsOpen}
            onOpenChange={onColumnSettingsOpenChange}
          >
            <Button>{t('common.columnSettings')}</Button>
          </Dropdown>
        </Space>
        <div className="module-table-utilities">
          {selectedRowKeysCount ? (
            <>
              <span className="module-table-selected-count" aria-live="polite">
                {t('common.selected', { count: selectedRowKeysCount })}
              </span>
              <Tooltip title={t('common.clearSelection')}>
                <Button
                  size="small"
                  type="text"
                  className="module-table-clear-selection-button"
                  aria-label={t('common.clearSelection')}
                  onClick={onClearSelection}
                >
                  ✕
                </Button>
              </Tooltip>
            </>
          ) : null}
          <Tooltip title={t('common.refresh')}>
            <Button
              type="text"
              className="module-table-refresh-button"
              aria-label={t('common.refresh')}
              icon={<ReloadOutlined />}
              loading={isFetching}
              onClick={onRefresh}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
