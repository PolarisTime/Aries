import { computed, defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { ColumnDef, RowSelectionState, Updater } from '@tanstack/vue-table'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DataTable from '@/components/DataTable.vue'
import { useDataTable } from '@/composables/use-data-table'

interface TestRow {
  id: string
  name: string
}

function applyUpdater<T>(state: T, updater: Updater<T>) {
  return typeof updater === 'function'
    ? (updater as (old: T) => T)(state)
    : updater
}

function mountTable(options?: {
  onRowClick?: (row: TestRow) => void
  onRowDoubleClick?: (row: TestRow) => void
}) {
  return mount(defineComponent({
    components: { DataTable },
    setup() {
      const rows = ref<TestRow[]>([
        { id: 'row-1', name: '单据A' },
      ])
      const columns = computed<ColumnDef<TestRow, unknown>[]>(() => [
        { accessorKey: 'name', header: () => '名称' },
      ])
      const rowSelection = ref<RowSelectionState>({})
      const { table } = useDataTable({
        data: rows,
        columns,
        getRowId: (row) => row.id,
        manualPagination: false,
        enableRowSelection: true,
        rowSelection,
        onRowSelectionChange: (updater) => {
          rowSelection.value = applyUpdater(rowSelection.value, updater)
        },
      })

      function rowProps(row: TestRow) {
        const props: Record<string, unknown> = {}
        if (options?.onRowClick) {
          props.onClick = () => options.onRowClick?.(row)
        }
        if (options?.onRowDoubleClick) {
          props.onDblclick = () => options.onRowDoubleClick?.(row)
        }
        return props
      }

      return {
        rowProps,
        table,
      }
    },
    template: '<DataTable :table="table" :row-props="rowProps" />',
  }))
}

async function dispatchMouseEvent(
  wrapper: ReturnType<typeof mountTable>,
  type: 'click' | 'dblclick',
  detail?: number,
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    detail,
  })
  wrapper.find('tbody tr.leo-data-table-row').element.dispatchEvent(event)
  await nextTick()
}

describe('DataTable', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps immediate row selection when no double-click handler is provided', async () => {
    const wrapper = mountTable()

    await wrapper.find('tbody tr.leo-data-table-row').trigger('click')
    await nextTick()

    expect(wrapper.find('tbody tr.leo-data-table-row').classes()).toContain('leo-data-table-row-selected')
  })

  it('delays single-click selection when a double-click handler exists', async () => {
    vi.useFakeTimers()
    const onRowDoubleClick = vi.fn()
    const wrapper = mountTable({ onRowDoubleClick })
    const row = wrapper.find('tbody tr.leo-data-table-row')

    await dispatchMouseEvent(wrapper, 'click', 1)
    expect(row.classes()).not.toContain('leo-data-table-row-selected')

    vi.advanceTimersByTime(220)
    await nextTick()

    expect(onRowDoubleClick).not.toHaveBeenCalled()
    expect(row.classes()).toContain('leo-data-table-row-selected')
  })

  it('cancels the pending single-click selection on double-click', async () => {
    vi.useFakeTimers()
    const onRowDoubleClick = vi.fn()
    const wrapper = mountTable({ onRowDoubleClick })
    const row = wrapper.find('tbody tr.leo-data-table-row')

    await dispatchMouseEvent(wrapper, 'click', 1)
    await dispatchMouseEvent(wrapper, 'click', 2)
    await dispatchMouseEvent(wrapper, 'dblclick', 2)
    vi.advanceTimersByTime(220)
    await nextTick()

    expect(onRowDoubleClick).toHaveBeenCalledTimes(1)
    expect(row.classes()).not.toContain('leo-data-table-row-selected')
  })
})
