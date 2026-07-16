import {
  ProTable,
  type ProTableProps,
} from '@ant-design/pro-components/es/table'

type TableRecord = object
type TableParams = Record<string, unknown>

const TypedProTable = ProTable as <
  DataType extends TableRecord,
  Params extends TableParams = TableParams,
  ValueType = 'text',
>(
  props: ProTableProps<DataType, Params, ValueType>,
) => React.JSX.Element

export type AppProTableProps<
  DataType extends TableRecord,
  Params extends TableParams = TableParams,
  ValueType = 'text',
> = ProTableProps<DataType, Params, ValueType>

export function AppProTable<
  DataType extends TableRecord,
  Params extends TableParams = TableParams,
  ValueType = 'text',
>({
  cardBordered = true,
  cardProps,
  options = false,
  search = false,
  size = 'middle',
  ...tableProps
}: AppProTableProps<DataType, Params, ValueType>): React.JSX.Element {
  const mergedCardProps =
    cardProps === false
      ? false
      : {
          ...cardProps,
          className: ['system-list-card', cardProps?.className]
            .filter(Boolean)
            .join(' '),
        }

  return (
    <TypedProTable<DataType, Params, ValueType>
      {...tableProps}
      cardBordered={cardBordered}
      cardProps={mergedCardProps}
      options={options}
      search={search}
      size={size}
    />
  )
}
