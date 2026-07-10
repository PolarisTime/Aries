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
        <span data-testid="pagination-total">
          {props.showTotal?.(props.total, [21, 40])}
        </span>
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

  it('renders a responsive size-changing paginator with the visible range', () => {
    render(
      <ModuleTablePagination
        total={95}
        currentPage={2}
        pageSize={20}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('pagination-total')).toHaveTextContent(
      'modules.workspace.paginationRange:{"start":21,"end":40,"total":95}',
    )
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
  })

  it('forwards page and page-size changes', () => {
    const onPageChange = vi.fn()
    render(
      <ModuleTablePagination
        total={95}
        currentPage={2}
        pageSize={20}
        onPageChange={onPageChange}
      />,
    )

    fireEvent.click(screen.getByTestId('change-page'))

    expect(onPageChange).toHaveBeenCalledWith(3, 50)
  })
})
