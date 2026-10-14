import type { TableColumnsType, TableColumnType, TableProps } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { RowContextMenuMap } from '@/components/row-context-menu'
import {
  type RowDragDescribeRow,
  RowDragSortMoveButtons,
  RowDragSortRow,
  RowDragSortScope,
} from '@/components/table/row-drag'
import type { ModuleLineItem } from '@/types/module-page'
import type { CustomerStatementItemGroup } from '@/views/modules/customer-statement-item-groups'
import type {
  FreightStatementItemGroup,
  FreightStatementProjectGroup,
} from '@/views/modules/freight-statement-item-groups'
import { CustomerStatementItemGroupHeader } from './CustomerStatementItemGroupHeader'
import {
  FreightStatementItemGroupHeader,
  FreightStatementProjectGroupHeader,
} from './FreightStatementItemGroupHeader'
import { ModuleItemsTable } from './ModuleItemsTable'
import { resolveModuleItemGroupViewKind } from './module-item-groups'

type ProjectGroup = FreightStatementProjectGroup<ModuleLineItem>

export type ModuleItemGroup =
  | ProjectGroup
  | FreightStatementItemGroup<ModuleLineItem>
  | CustomerStatementItemGroup<ModuleLineItem>
  | {
      key: string
      sourceNo: string
      billTime: string
      customerName: string
      projectName: string
      totalQuantity: number
      totalWeightTon: number
      items: ModuleLineItem[]
    }

interface Props {
  groups: ModuleItemGroup[]
  moduleKey: string
  columns: TableColumnsType<ModuleLineItem>
  emptyText: string
  components?: TableProps<ModuleLineItem>['components']
  rowClassName?: TableProps<ModuleLineItem>['rowClassName']
  /** 明细行右键菜单（按行 key 注入，与行内按钮共用同一份动作）。 */
  itemRowMenus?: RowContextMenuMap
  /**
   * 明细行序变化(整行长按拖动 / 键盘 Alt+↑↓ 落位): 新的 id 顺序即最终顺序。
   * <p>不传表示该模块不允许手工排序(只读、上游导入锁定、或行为表显式禁用),
   * 此时不挂任何拖动监听, 行序完全由上游/自动排序决定。</p>
   */
  onItemsReorder?: (nextIds: string[]) => void
  /** 播报与按钮可访问名用的行名(物料名), 默认「第 N 行」。**禁止返回 id**。 */
  describeRow?: RowDragDescribeRow
}

/** 分组行摊平: 普通分组直接取 items, 物流对账单分组要再摊平 projectGroups。 */
function flattenGroupItems(group: ModuleItemGroup): ModuleLineItem[] {
  if ('items' in group && Array.isArray(group.items)) return group.items
  if ('projectGroups' in group && Array.isArray(group.projectGroups)) {
    return group.projectGroups.flatMap((projectGroup) => projectGroup.items)
  }
  return []
}

/** 按模块语义渲染分组明细：物流单按项目分组，其余按单据分组复用同一表格。 */
export function ModuleItemGroupsView({
  groups,
  moduleKey,
  columns,
  emptyText,
  components,
  rowClassName,
  itemRowMenus,
  onItemsReorder,
  describeRow,
}: Props) {
  /*
   * 分组视图里所有行共用一个拖动作用域: 行 id 取**扁平 items 顺序**,
   * 与写回的行模型数组一一对应(分组只是渲染切片, 顺序的权威仍是 items 数组)。
   * 物流对账单这类"分组下再分项目组"的形态要把项目组的行一并摊平。
   */
  const rowIds = groups.flatMap((group) =>
    flattenGroupItems(group).map((item) => item.id),
  )
  const { t } = useTranslation()
  const dragEnabled = Boolean(onItemsReorder)
  const rowComponents = useMemo<TableProps<ModuleLineItem>['components']>(
    () =>
      dragEnabled
        ? {
            ...components,
            body: { ...components?.body, row: RowDragSortRow },
          }
        : components,
    [components, dragEnabled],
  )

  /**
   * 顺序列: **可点击的上移/下移按钮**(WCAG 2.2 SC 2.5.7 要求的非拖动替代)。
   *
   * <p>只给拖拽 + 键盘拖拽并不满足该条 —— 它要求"功能可用单指针、且不做拖动操作"
   * 就能完成。按钮与拖动落位共用同一份 moveRow, 因此不会出现两套顺序口径。</p>
   */
  const reorderColumn = useMemo<TableColumnType<ModuleLineItem>>(
    () => ({
      key: 'rowReorder',
      width: 76,
      align: 'center',
      title: t('common.rowDragSort.moveColumnTitle'),
      render: (_value, item) => <RowDragSortMoveButtons rowId={item.id} />,
    }),
    [t],
  )
  const tableColumns = useMemo(
    () => (dragEnabled ? [...columns, reorderColumn] : columns),
    [columns, dragEnabled, reorderColumn],
  )

  const body = (
    <div className="module-items-groups">
      {groups.map((group) => {
        const viewKind = resolveModuleItemGroupViewKind(moduleKey, group)
        return (
          <div className="module-items-group" key={group.key}>
            {viewKind === 'freight-project' ? (
              <div className="module-items-project-group">
                <FreightStatementProjectGroupHeader
                  group={group as ProjectGroup}
                />
                <ModuleItemsTable
                  columns={tableColumns}
                  components={rowComponents}
                  dataSource={(group as ProjectGroup).items}
                  emptyText={emptyText}
                  rowClassName={rowClassName}
                  itemRowMenus={itemRowMenus}
                />
              </div>
            ) : 'projectGroups' in group ? (
              <>
                <FreightStatementItemGroupHeader group={group} />
                {group.projectGroups.map((projectGroup) => (
                  <div
                    className="module-items-project-group"
                    key={projectGroup.key}
                  >
                    <FreightStatementProjectGroupHeader
                      group={projectGroup}
                      showSubtotal={false}
                    />
                    <ModuleItemsTable
                      columns={tableColumns}
                      components={rowComponents}
                      dataSource={projectGroup.items}
                      emptyText={emptyText}
                      rowClassName={rowClassName}
                      itemRowMenus={itemRowMenus}
                    />
                  </div>
                ))}
              </>
            ) : viewKind === 'customer-statement' ? (
              <>
                <CustomerStatementItemGroupHeader
                  group={group as CustomerStatementItemGroup<ModuleLineItem>}
                />
                <ModuleItemsTable
                  columns={tableColumns}
                  components={rowComponents}
                  dataSource={group.items}
                  emptyText={emptyText}
                  rowClassName={rowClassName}
                  itemRowMenus={itemRowMenus}
                />
              </>
            ) : (
              <ModuleItemsTable
                columns={tableColumns}
                components={rowComponents}
                dataSource={group.items}
                emptyText={emptyText}
                rowClassName={rowClassName}
                itemRowMenus={itemRowMenus}
              />
            )}
          </div>
        )
      })}
    </div>
  )

  if (!onItemsReorder) return body

  return (
    <RowDragSortScope
      describeRow={describeRow}
      onReorder={(nextIds) => onItemsReorder(nextIds)}
      rowIds={rowIds}
    >
      {body}
    </RowDragSortScope>
  )
}
