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

  it('renders page-specific overview items', () => {
    render(
      <ModuleTablePagination
        total={95}
        currentPage={2}
        pageSize={20}
        currentItemCount={2}
        overviewItems={[
          { label: '商品数', value: '12' },
          { label: '正常商品', value: '10' },
        ]}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('pagination-summary')).toHaveTextContent(
      '商品数：12',
    )
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent(
      '正常商品：10',
    )
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
    expect(mocks.paginationProps?.locale).toBeUndefined()
    expect(mocks.paginationProps?.showTotal).toBeUndefined()
  })

  it('omits the overview region when a page has no summary items', () => {
    render(
      <ModuleTablePagination
        total={2}
        currentPage={1}
        pageSize={20}
        currentItemCount={2}
        overviewItems={[]}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('pagination-summary')).toBeNull()
  })

  it('forwards page and page-size changes', () => {
    const onPageChange = vi.fn()
    render(
      <ModuleTablePagination
        total={95}
        currentPage={2}
        pageSize={20}
        currentItemCount={0}
        overviewItems={[]}
        onPageChange={onPageChange}
      />,
    )

    fireEvent.click(screen.getByTestId('change-page'))

    expect(onPageChange).toHaveBeenCalledWith(3, 50)
  })
})
