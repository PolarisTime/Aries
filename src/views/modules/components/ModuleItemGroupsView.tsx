import type { TableColumnsType, TableProps } from 'antd'
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
  onRowDragOver?: (recordId: string, event: React.DragEvent) => void
}

/** 按模块语义渲染分组明细：物流单按项目分组，其余按单据分组复用同一表格。 */
export function ModuleItemGroupsView({
  groups,
  moduleKey,
  columns,
  emptyText,
  components,
  rowClassName,
  onRowDragOver,
}: Props) {
  const onRow = onRowDragOver
    ? (record: ModuleLineItem) => ({
        onDragOver: (event: React.DragEvent<Element>) =>
          onRowDragOver(record.id, event),
      })
    : undefined

  return (
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
                  columns={columns}
                  components={components}
                  dataSource={(group as ProjectGroup).items}
                  emptyText={emptyText}
                  rowClassName={rowClassName}
                  onRow={onRow}
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
                      columns={columns}
                      components={components}
                      dataSource={projectGroup.items}
                      emptyText={emptyText}
                      rowClassName={rowClassName}
                      onRow={onRow}
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
                  columns={columns}
                  components={components}
                  dataSource={group.items}
                  emptyText={emptyText}
                  rowClassName={rowClassName}
                  onRow={onRow}
                />
              </>
            ) : (
              <ModuleItemsTable
                columns={columns}
                components={components}
                dataSource={group.items}
                emptyText={emptyText}
                rowClassName={rowClassName}
                onRow={onRow}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
