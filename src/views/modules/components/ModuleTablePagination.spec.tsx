import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  paginationProps: undefined as Record<string, any> | undefined,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
  }),
}))

vi.mock('antd', () => ({
  Pagination: (props: Record<string, any>) => {
    mocks.paginationProps = props
    return (
      <div data-testid="pagination">
        <button
          type="button"
          data-testid="change-page"
          onClick={() => props.onChange?.(3, 50)}
        />
      </div>
    )
  },
}))

import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'

describe('ModuleTablePagination', () => {
  beforeEach(() => {
    mocks.paginationProps = undefined
  })

  it('summarizes all current-page records when no rows are selected', () => {
    render(
      <ModuleTablePagination
        total={95}
        currentPage={2}
        pageSize={20}
        records={[
          {
            id: '1',
            totalWeight: 1.25,
            totalAmount: 100,
            items: [{ id: '11', quantity: 3 }],
          },
          {
            id: '2',
            totalQuantity: 7,
            totalWeight: 2.5,
            totalAmount: 250.5,
          },
        ]}
        selectedRowKeys={[]}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('pagination-summary')).not.toHaveTextContent(
      'modules.workspace.currentPageSummary',
    )
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent(
      'modules.overview.documentCount：2',
    )
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('3.750')
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('350.50')
    expect(screen.getByTestId('pagination-range')).toHaveTextContent(
      'modules.workspace.paginationRange:{"start":21,"end":22,"total":95}',
    )
    expect(
      screen
        .getByTestId('pagination-range')
        .compareDocumentPosition(screen.getByTestId('pagination')),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(mocks.paginationProps).toEqual(
      expect.objectContaining({
        current: 2,
        pageSize: 20,
        pageSizeOptions: ['10', '20', '50', '100'],
        responsive: true,
        showSizeChanger: true,
        total: 95,
      }),
    )
    expect(mocks.paginationProps?.locale).toEqual(
      expect.objectContaining({
        items_per_page: '/ 页',
        page: '页',
      }),
    )
    expect(mocks.paginationProps?.showTotal).toBeUndefined()
  })

  it('summarizes only selected records when rows are selected', () => {
    render(
      <ModuleTablePagination
        total={2}
        currentPage={1}
        pageSize={20}
        records={[
          {
            id: '1',
            totalWeight: 1.25,
            totalAmount: 100,
            items: [{ id: '11', quantity: 3 }],
          },
          {
            id: '2',
            totalQuantity: 7,
            totalWeight: 2.5,
            totalAmount: 250.5,
          },
        ]}
        selectedRowKeys={['2']}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('pagination-summary')).not.toHaveTextContent(
      'common.selected:{"count":1}',
    )
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent(
      'modules.overview.documentCount：1',
    )
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('2.500')
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('250.50')
  })

  it('forwards page and page-size changes', () => {
    const onPageChange = vi.fn()
    render(
      <ModuleTablePagination
        total={95}
        currentPage={2}
        pageSize={20}
        records={[]}
        selectedRowKeys={[]}
        onPageChange={onPageChange}
      />,
    )

    fireEvent.click(screen.getByTestId('change-page'))

    expect(onPageChange).toHaveBeenCalledWith(3, 50)
  })
})
