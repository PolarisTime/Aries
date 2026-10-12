import { DownloadOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Dropdown, Input, Select, Space } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ModuleTableUtilities } from '@/components/ModuleTableUtilities'
import type { SearchParams } from '@/types/api-raw'
import type { MasterColumnSpec, MasterFilterSpec } from './master-data-types'

interface Props {
  keyword: string
  onKeywordChange: (value: string) => void
  filters: MasterFilterSpec[]
  filterValues: SearchParams
  onFilterChange: (key: string, value: string | undefined) => void
  onSearch: () => void
  onReset: () => void
  keywordPlaceholder: string
  onCreate: () => void
  selectedCount: number
  onDeleteSelected: () => void
  canEdit: boolean
  onEdit: () => void
  canAttach: boolean
  onAttachment: () => void
  exporting: boolean
  onExport: () => void
  columns: MasterColumnSpec[]
  hiddenColumnKeySet: Set<string>
  onToggleColumn: (key: string) => void
  /** 「列设置」弹层的受控开合: 让列头右键菜单的「列设置…」项复用它 */
  columnSettingsOpen?: boolean
  onColumnSettingsOpenChange?: (open: boolean) => void
  selectedRowKeysCount: number
  onClearSelection: () => void
  isFetching: boolean
  onRefresh: () => void
  toolbarExtra?: ReactNode
}

export function MasterDataToolbar({
  keyword,
  onKeywordChange,
  filters,
  filterValues,
  onFilterChange,
  onSearch,
  onReset,
  keywordPlaceholder,
  onCreate,
  selectedCount,
  onDeleteSelected,
  canEdit,
  onEdit,
  canAttach,
  onAttachment,
  exporting,
  onExport,
  columns,
  hiddenColumnKeySet,
  onToggleColumn,
  columnSettingsOpen,
  onColumnSettingsOpenChange,
  selectedRowKeysCount,
  onClearSelection,
  isFetching,
  onRefresh,
  toolbarExtra,
}: Props) {
  const { t } = useTranslation()
  return (
    <>
      <div className="module-grid-filter-region">
        <Space wrap>
          <Input
            aria-label={t('modules.filter.keyword')}
            allowClear
            placeholder={keywordPlaceholder}
            style={{ width: 240 }}
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            onPressEnter={onSearch}
          />
          {filters.map((filter) =>
            filter.type === 'select' ? (
              <Select
                key={filter.key}
                aria-label={filter.placeholder}
                allowClear
                placeholder={filter.placeholder}
                style={{ width: filter.width ?? 160 }}
                value={filterValues[filter.key] as string | undefined}
                onChange={(value) => onFilterChange(filter.key, value)}
                options={filter.options}
              />
            ) : (
              <Input
                key={filter.key}
                aria-label={filter.placeholder}
                allowClear
                placeholder={filter.placeholder}
                style={{ width: filter.width ?? 200 }}
                value={(filterValues[filter.key] as string) ?? ''}
                onChange={(event) =>
                  onFilterChange(filter.key, event.target.value)
                }
                onPressEnter={onSearch}
              />
            ),
          )}
          <Button type="primary" onClick={onSearch}>
            {t('common.search')}
          </Button>
          <Button onClick={onReset}>{t('common.reset')}</Button>
        </Space>
      </div>

      <div className="module-grid-command-region">
        <div className="module-table-toolbar">
          <Space wrap className="module-table-actions">
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
              {t('common.create')}
            </Button>
            {selectedCount ? (
              <Button danger onClick={onDeleteSelected}>
                {t('hooks.toolbarActions.delete')}
              </Button>
            ) : null}
            {canEdit ? (
              <Button onClick={onEdit}>{t('hooks.recordActions.edit')}</Button>
            ) : null}
            {canAttach ? (
              <Button onClick={onAttachment}>
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
            {toolbarExtra}
            <Dropdown
              // 用 click 触发: hover-only 的菜单键盘打不开(WCAG 2.1.1), 且受控 open 会被悬停状态复位
              trigger={['click']}
              open={columnSettingsOpen}
              onOpenChange={onColumnSettingsOpenChange}
              menu={{
                multiple: true,
                selectedKeys: columns.flatMap((column) =>
                  hiddenColumnKeySet.has(column.key) ? [] : [column.key],
                ),
                onClick: ({ key }) => onToggleColumn(key),
                items: columns.map((column) => ({
                  key: column.key,
                  label: column.title,
                })),
              }}
            >
              <Button>{t('common.columnSettings')}</Button>
            </Dropdown>
          </Space>
          <ModuleTableUtilities
            selectedCount={selectedRowKeysCount}
            onClearSelection={onClearSelection}
            isFetching={isFetching}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </>
  )
}
