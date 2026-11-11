import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import type { TableColumnsType, TableProps } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  RowContextMenuConfig,
  RowContextMenuMap,
} from '@/components/row-context-menu'
import {
  describeRowDragRow,
  type RowDragDescribeRow,
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

/** 行菜单里「上移 / 下移」的稳定 key（与 antd Menu 的 onClick 分发共用）。 */
const ROW_MOVE_UP_MENU_KEY = 'row-move-up'
const ROW_MOVE_DOWN_MENU_KEY = 'row-move-down'

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
  /** 行选择（antd `rowSelection`）：与列表页同一套「身份列」。 */
  rowSelection?: TableProps<ModuleLineItem>['rowSelection']
  /** 空表文案；不传时沿用 antd 默认空态（见 ModuleItemsTable）。 */
  emptyText?: string
  components?: TableProps<ModuleLineItem>['components']
  rowClassName?: TableProps<ModuleLineItem>['rowClassName']
  /** 明细行右键菜单（按行 key 注入，与行内按钮共用同一份动作）。 */
  itemRowMenus?: RowContextMenuMap
  /**
   * 合计行插槽（antd `Table` 的 `summary`），原样透传给每个分组下的明细表。
   *
   * <p>注意语义：分组视图下每个分组是**独立的表格**，antd 会用「该分组自己的行」
   * 调用这个函数。所以它是「分组小计」而不是「整单合计」；需要整单合计时不要在
   * 分组视图上使用它，应当在分组表之外单独渲染。</p>
   *
   * <p>不传时各行表格的行为与外观完全不变。</p>
   */
  summary?: TableProps<ModuleLineItem>['summary']
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
  rowSelection,
  emptyText,
  components,
  rowClassName,
  itemRowMenus,
  summary,
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
   * 行右键菜单补「上移 / 下移」。
   *
   * <p>顺序调整改成**拖动柄**之后，这是单指针的非拖动替代（WCAG 2.2 SC 2.5.7）：
   * 不按住拖动也能改顺序，且与拖动落位共用同一份 `onItemsReorder`。
   * 边界项置灰（首行不能上移、末行不能下移）。</p>
   */
  const rowMenusWithMove = useMemo<RowContextMenuMap | undefined>(() => {
    if (!dragEnabled) return itemRowMenus
    const menuMap = new Map<string, RowContextMenuConfig>(itemRowMenus ?? [])
    rowIds.forEach((rowId, index) => {
      const existing = menuMap.get(rowId)
      const moveTo = (delta: -1 | 1) => {
        const target = index + delta
        if (target < 0 || target >= rowIds.length) return
        const next = [...rowIds]
        next.splice(index, 1)
        next.splice(target, 0, rowId)
        onItemsReorder?.(next)
      }
      const baseItems = existing?.items ?? []
      menuMap.set(rowId, {
        ariaLabel:
          existing?.ariaLabel ??
          t('modules.table.rowContextMenuLabel', {
            title: describeRowDragRow(rowId, { rowIds, describeRow, t }),
          }),
        items: [
          ...baseItems,
          ...(baseItems.length > 0 ? [{ type: 'divider' as const }] : []),
          {
            key: ROW_MOVE_UP_MENU_KEY,
            label: t('common.rowDragSort.moveUpTip'),
            icon: <ArrowUpOutlined />,
            disabled: index === 0,
          },
          {
            key: ROW_MOVE_DOWN_MENU_KEY,
            label: t('common.rowDragSort.moveDownTip'),
            icon: <ArrowDownOutlined />,
            disabled: index === rowIds.length - 1,
          },
        ],
        onClick: (info) => {
          if (info.key === ROW_MOVE_UP_MENU_KEY) {
            moveTo(-1)
            return
          }
          if (info.key === ROW_MOVE_DOWN_MENU_KEY) {
            moveTo(1)
            return
          }
          existing?.onClick?.(info)
        },
        onOpen: existing?.onOpen,
      })
    })
    return menuMap
  }, [describeRow, dragEnabled, itemRowMenus, onItemsReorder, rowIds, t])

  const tableColumns = useMemo(() => columns, [columns])

  const body = (
    <div className="module-items-groups">
      {groups.map((group) => {
        const viewKind = resolveModuleItemGroupViewKind(moduleKey, group)
        /*
         * 物流对账单 / 物流单按「一张来源单据」成卡：卡片头放单号与合计，
         * 卡体放项目小节。原来每组只是平铺的标题+表格，多个组叠在一起时
         * 组与组的边界只能靠间距区分，长对账单里极易看串行。
         */
        const isFreightCard =
          viewKind === 'freight-project' || viewKind === 'freight-statement'
        return (
          <div
            className={
              isFreightCard
                ? 'module-items-group module-items-group--freight'
                : 'module-items-group'
            }
            key={group.key}
          >
            {viewKind === 'freight-project' ? (
              <div className="module-items-freight-group-body">
                <div className="module-items-project-group">
                  <FreightStatementProjectGroupHeader
                    group={group as ProjectGroup}
                  />
                  <ModuleItemsTable
                    rowSelection={rowSelection}
                    columns={tableColumns}
                    components={rowComponents}
                    dataSource={(group as ProjectGroup).items}
                    emptyText={emptyText}
                    rowClassName={rowClassName}
                    itemRowMenus={rowMenusWithMove}
                    summary={summary}
                  />
                </div>
              </div>
            ) : 'projectGroups' in group ? (
              <>
                <FreightStatementItemGroupHeader group={group} />
                <div className="module-items-freight-group-body">
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
                        rowSelection={rowSelection}
                        columns={tableColumns}
                        components={rowComponents}
                        dataSource={projectGroup.items}
                        emptyText={emptyText}
                        rowClassName={rowClassName}
                        itemRowMenus={rowMenusWithMove}
                        summary={summary}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : viewKind === 'customer-statement' ? (
              <>
                <CustomerStatementItemGroupHeader
                  group={group as CustomerStatementItemGroup<ModuleLineItem>}
                />
                <ModuleItemsTable
                  rowSelection={rowSelection}
                  columns={tableColumns}
                  components={rowComponents}
                  dataSource={group.items}
                  emptyText={emptyText}
                  rowClassName={rowClassName}
                  itemRowMenus={rowMenusWithMove}
                  summary={summary}
                />
              </>
            ) : (
              <ModuleItemsTable
                rowSelection={rowSelection}
                columns={tableColumns}
                components={rowComponents}
                dataSource={group.items}
                emptyText={emptyText}
                rowClassName={rowClassName}
                itemRowMenus={rowMenusWithMove}
                summary={summary}
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
