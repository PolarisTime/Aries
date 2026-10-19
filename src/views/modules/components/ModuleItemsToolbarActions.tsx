import {
  DeleteOutlined,
  DownOutlined,
  ImportOutlined,
  PlusOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Button, Dropdown } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ModulePageConfig } from '@/types/module-page'
import type {
  FreightStatementSortDirection,
  FreightStatementSortMode,
} from '@/views/modules/freight-statement-item-groups'
import { ColumnSettingsPopover } from './ColumnSettingsPopover'

/**
 * 明细工具栏的操作区（新增/导入/排序/列设置/删除/保存审核）。
 *
 * <p>从 ModuleEditorItemsSection 抽出：这组按钮各自带状态守卫（能力、导入中、
 * 保存中、是否有勾选、运费结算的特殊排序菜单），内联在明细区会把控制流复杂度
 * 推过 react-doctor 阈值 (no-high-complexity-react-function)。列设置的临时开合
 * 列设置弹层的开合状态仍留在明细区：切换到「费用」页签会卸载工具栏，
 * 状态下沉到工具栏会丢失，与改造前行为不一致。</p>
 *
 * <p>按钮顺序、按钮类名、图标与文案保持逐字不变，DOM 结构只多了一层组件边界。</p>
 */

interface Props {
  /** 列设置弹层的开合状态仍由明细区持有: 切页签卸载工具栏后不丢状态(与改造前一致)。 */
  columnSettingsOpen: boolean
  onColumnSettingsOpenChange: (open: boolean) => void
  capabilities: {
    addManualItems: boolean
    importParentItems: boolean
    autoSortItems: boolean
    save: boolean
    audit: boolean
  }
  config: ModulePageConfig
  extraActions?: React.ReactNode
  freightStatementSortDirection: FreightStatementSortDirection
  itemColumnOrder: string[]
  onAddItem: () => void
  onAutoSortItems: (mode?: FreightStatementSortMode) => void
  onItemColumnOrderChange: (order: string[]) => void
  onOpenParentSelector: () => void
  onRemoveSelectedItems: () => void
  onToggleItemColumn: (key: string) => void
  parentImportVisible: boolean
  parentImporting: boolean
  saving: boolean
  selectedItemCount: number
  /**
   * 明细工具栏行末的保存组（取消 / 保存 / 保存并审核）。
   *
   * <p>节点由 `ModuleEditorItemsSection` **单一处构建**并同时交给两个页签，
   * 这里只负责摆放，避免两处各建一份导致行为分叉。</p>
   */
  footerActions?: React.ReactNode
  visibleItemColumnKeys: string[]
}

export function ModuleItemsToolbarActions({
  columnSettingsOpen,
  onColumnSettingsOpenChange,
  capabilities,
  config,
  extraActions,
  freightStatementSortDirection,
  itemColumnOrder,
  onAddItem,
  onAutoSortItems,
  onItemColumnOrderChange,
  onOpenParentSelector,
  onRemoveSelectedItems,
  onToggleItemColumn,
  parentImportVisible,
  parentImporting,
  saving,
  selectedItemCount,
  footerActions,
  visibleItemColumnKeys,
}: Props) {
  const { t } = useTranslation()

  const freightStatementSortMenuItems: MenuProps['items'] = [
    {
      key: 'sourceNo',
      label: t('modules.itemsSection.autoSortBySourceNo'),
    },
    {
      key: 'billTime',
      label: t(
        freightStatementSortDirection === 'asc'
          ? 'modules.itemsSection.autoSortByBillTimeAscending'
          : 'modules.itemsSection.autoSortByBillTimeDescending',
      ),
    },
  ]

  return (
    <>
      {capabilities.addManualItems && (
        <Button
          type="primary"
          className="overlay-action-button"
          icon={<PlusOutlined />}
          disabled={saving}
          onClick={onAddItem}
        >
          {t('modules.itemsSection.addItem')}
        </Button>
      )}
      {parentImportVisible && (
        <Button
          className="overlay-action-button"
          icon={<ImportOutlined />}
          loading={parentImporting}
          disabled={saving || !capabilities.importParentItems}
          onClick={onOpenParentSelector}
        >
          {config.parentImport?.buttonText ||
            t('modules.itemsSection.importItems', {
              label:
                config.parentImport?.label ||
                t('modules.itemsSection.parentDoc'),
            })}
        </Button>
      )}
      {capabilities.autoSortItems &&
        (config.key === 'freight-statement' ? (
          <Dropdown
            menu={{
              items: freightStatementSortMenuItems,
              onClick: ({ key }) =>
                onAutoSortItems(key as FreightStatementSortMode),
            }}
            trigger={['click']}
          >
            <Button
              className="overlay-action-button"
              icon={<SortAscendingOutlined />}
              disabled={saving}
            >
              {t('modules.itemsSection.autoSortItems')}
              <DownOutlined />
            </Button>
          </Dropdown>
        ) : (
          <Button
            className="overlay-action-button"
            icon={<SortAscendingOutlined />}
            disabled={saving}
            onClick={() => onAutoSortItems()}
          >
            {t('modules.itemsSection.autoSortItems')}
          </Button>
        ))}
      <ColumnSettingsPopover
        columns={config.itemColumns ?? []}
        orderedKeys={itemColumnOrder}
        visibleKeys={visibleItemColumnKeys}
        onToggle={onToggleItemColumn}
        onOrderChange={onItemColumnOrderChange}
        open={columnSettingsOpen}
        onOpenChange={onColumnSettingsOpenChange}
      />
      {extraActions}
      {selectedItemCount > 0 && (
        <Button
          danger
          className="overlay-action-button"
          icon={<DeleteOutlined />}
          disabled={saving}
          onClick={onRemoveSelectedItems}
        >
          {t('modules.itemsSection.deleteSelected')} ({selectedItemCount})
        </Button>
      )}
      {footerActions}
    </>
  )
}
