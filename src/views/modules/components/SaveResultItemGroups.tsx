import type { TableColumnsType } from 'antd'
import { Table } from 'antd'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { ModuleLineItem } from '@/types/module-record'
import type { CustomerStatementItemGroup } from '@/views/modules/customer-statement-item-groups'
import type { FreightStatementProjectGroup } from '@/views/modules/freight-statement-item-groups'
import { CustomerStatementItemGroupHeader } from './CustomerStatementItemGroupHeader'
import {
  FreightStatementItemGroupHeader,
  FreightStatementProjectGroupHeader,
} from './FreightStatementItemGroupHeader'
import {
  type buildModuleItemGroups,
  resolveModuleItemGroupViewKind,
} from './module-item-groups'

/**
 * 保存回执里的只读明细分组表。
 *
 * <p>从 SaveResultOverlay 抽出的原因：分组视图类型有四路分支（运费按项目 /
 * 运费按分组 / 客户对账 / 普通），内联在弹窗里会让弹窗的嵌套与分支数一起越界
 * (react-doctor/no-high-complexity-react-function)。这里只按 viewKind 选择表头，
 * 表格的 rowKey/columns/size/pagination 与分组 DOM 保持逐字不变。</p>
 */

type ModuleItemGroup = ReturnType<typeof buildModuleItemGroups>[number]

interface Props {
  itemColumns: TableColumnsType<ModuleLineItem>
  itemGroups: ModuleItemGroup[]
  moduleKey: ModuleKey
}

function GroupTable({
  columns,
  items,
}: {
  columns: TableColumnsType<ModuleLineItem>
  items: ModuleLineItem[]
}) {
  return (
    <Table
      rowKey={(_, i) => String(i)}
      dataSource={items}
      columns={columns}
      size="small"
      pagination={false}
    />
  )
}

export function SaveResultItemGroups({
  itemColumns,
  itemGroups,
  moduleKey,
}: Props) {
  return (
    <div className="mt-16 module-items-groups">
      {itemGroups.map((group) => {
        const viewKind = resolveModuleItemGroupViewKind(moduleKey, group)
        return (
          <div className="module-items-group" key={group.key}>
            {viewKind === 'freight-project' ? (
              <div className="module-items-project-group">
                <FreightStatementProjectGroupHeader
                  group={group as FreightStatementProjectGroup<ModuleLineItem>}
                />
                <GroupTable
                  columns={itemColumns}
                  items={
                    (group as FreightStatementProjectGroup<ModuleLineItem>)
                      .items
                  }
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
                    <GroupTable
                      columns={itemColumns}
                      items={projectGroup.items}
                    />
                  </div>
                ))}
              </>
            ) : viewKind === 'customer-statement' ? (
              <>
                <CustomerStatementItemGroupHeader
                  group={group as CustomerStatementItemGroup<ModuleLineItem>}
                />
                <GroupTable columns={itemColumns} items={group.items} />
              </>
            ) : (
              <GroupTable columns={itemColumns} items={group.items} />
            )}
          </div>
        )
      })}
    </div>
  )
}
