import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  useQueryMock,
  loadBusinessPageConfigMock,
  listClientSettingsMock,
  isDisplaySwitchEnabledMock,
  listAllBusinessModuleRowsMock,
  buildWeightOverviewMock,
  buildStatementLinkOptionsMock,
} = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  loadBusinessPageConfigMock: vi.fn(),
  listClientSettingsMock: vi.fn(),
  isDisplaySwitchEnabledMock: vi.fn().mockReturnValue(false),
  listAllBusinessModuleRowsMock: vi.fn(),
  buildWeightOverviewMock: vi.fn(),
  buildStatementLinkOptionsMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: 'keepPreviousData',
  useQuery: useQueryMock,
}))

vi.mock('@/api/system-settings', () => ({
  DISPLAY_SWITCH_CODES: {
    weightOnlyPurchaseInbounds: 'weightOnlyPurchaseInbounds',
    weightOnlySalesOutbounds: 'weightOnlySalesOutbounds',
    showSnowflakeId: 'showSnowflakeId',
  },
  isDisplaySwitchEnabled: isDisplaySwitchEnabledMock,
  listClientSettings: listClientSettingsMock,
}))

vi.mock('@/api/business', () => ({
  listAllBusinessModuleRows: listAllBusinessModuleRowsMock,
}))

vi.mock('@/config/business-page-loader', () => ({
  loadBusinessPageConfig: loadBusinessPageConfigMock,
}))

vi.mock('@/config/business-pages/shared', () => ({
  buildWeightOverview: buildWeightOverviewMock,
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    businessPageConfig: vi.fn((key: string) => ['businessPageConfig', key]),
    clientSettings: ['clientSettings'],
    statementLinkOptions: vi.fn((key: string) => ['statementLinkOptions', key]),
  },
}))

vi.mock('@/module-system/module-adapter-finance-links', () => ({
  buildStatementLinkOptions: buildStatementLinkOptionsMock,
}))

import { useModulePageConfig } from './useModulePageConfig'

describe('useModulePageConfig', () => {
  const defaultProps = {
    moduleKey: 'sales-order',
  }

  beforeEach(() => {
    vi.resetAllMocks()
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false })
    isDisplaySwitchEnabledMock.mockReturnValue(false)
  })

  it('returns config from query', () => {
    const config = {
      key: 'sales-order',
      columns: [],
      formFields: [],
      detailFields: [],
    }
    useQueryMock.mockReturnValue({ data: config, isLoading: false })

    const { result } = renderHook(() => useModulePageConfig(defaultProps))
    expect(result.current.config).toEqual(config)
  })

  it('uses initialConfig when query data is not available', () => {
    const initialConfig = {
      key: 'sales-order',
      columns: [],
      formFields: [],
      detailFields: [],
    }
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false })

    const { result } = renderHook(() =>
      useModulePageConfig({ ...defaultProps, initialConfig }),
    )
    expect(result.current.config).toEqual(initialConfig)
    expect(useQueryMock.mock.calls[0][0].placeholderData()).toBe(initialConfig)
  })

  it('returns loading state', () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: true })

    const { result } = renderHook(() => useModulePageConfig(defaultProps))
    expect(result.current.isLoading).toBe(true)
  })

  it('detects invoice assist modules', () => {
    const { result } = renderHook(() =>
      useModulePageConfig({ moduleKey: 'invoice-receipt' }),
    )
    expect(result.current.supportsInvoiceAssist).toBe(true)
  })

  it('does not detect invoice assist for other modules', () => {
    const { result } = renderHook(() => useModulePageConfig(defaultProps))
    expect(result.current.supportsInvoiceAssist).toBe(false)
  })

  it('detects snowflake ID display switch', () => {
    isDisplaySwitchEnabledMock.mockImplementation(
      (_data: any, code: string) => code === 'showSnowflakeId',
    )

    const { result } = renderHook(() => useModulePageConfig(defaultProps))
    expect(result.current.showSnowflakeId).toBe(true)
  })

  it('applies weight-only view config when enabled', () => {
    const config = {
      key: 'purchase-inbound',
      columns: [
        { dataIndex: 'totalAmount', title: 'Total Amount' },
        { dataIndex: 'totalWeight', title: 'Total Weight' },
      ],
      detailFields: [
        { key: 'totalAmount', title: 'Total Amount' },
        { key: 'totalWeight', title: 'Total Weight' },
      ],
      formFields: [
        { key: 'inboundNo', label: 'Inbound No', type: 'input' },
        { key: 'totalAmount', label: 'Total Amount', type: 'input' },
      ],
      itemColumns: [
        { dataIndex: 'materialCode', title: 'Material' },
        { dataIndex: 'weightAdjustmentAmount', title: 'Adjustment Amount' },
        { dataIndex: 'weightTon', title: 'Weight' },
      ],
    }
    useQueryMock.mockReturnValue({ data: config, isLoading: false })
    isDisplaySwitchEnabledMock.mockImplementation(
      (_data: any, code: string) => code === 'weightOnlyPurchaseInbounds',
    )

    const { result } = renderHook(() =>
      useModulePageConfig({ moduleKey: 'purchase-inbound' }),
    )

    expect(result.current.config?.columns).toHaveLength(1)
    expect(result.current.config?.columns[0].dataIndex).toBe('totalWeight')
    expect(
      result.current.config?.formFields?.map((field) => field.key),
    ).toEqual(['inboundNo'])
    expect(
      result.current.config?.itemColumns?.map((column) => column.dataIndex),
    ).toEqual(['materialCode', 'weightTon'])
    result.current.config?.buildOverview([{ totalWeight: 10 }] as any)
    expect(buildWeightOverviewMock).toHaveBeenCalledWith([{ totalWeight: 10 }])
  })

  it('handles receipt module with statement link catalog', () => {
    useQueryMock.mockReturnValue({
      data: {
        key: 'receipt',
        columns: [],
        formFields: [{ key: 'sourceStatementId', title: 'Source' }],
        detailFields: [],
      },
      isLoading: false,
    })

    const { result } = renderHook(() =>
      useModulePageConfig({ moduleKey: 'receipt' }),
    )

    expect(result.current.config).toBeDefined()
  })

  it('handles payment module with statement link catalog', () => {
    useQueryMock.mockReturnValue({
      data: {
        key: 'payment',
        columns: [],
        formFields: [{ key: 'sourceStatementId', title: 'Source' }],
        detailFields: [],
      },
      isLoading: false,
    })

    const { result } = renderHook(() =>
      useModulePageConfig({ moduleKey: 'payment' }),
    )

    expect(result.current.config).toBeDefined()
  })

  it('defaults receipt statement link fields to an empty list', () => {
    useQueryMock.mockReturnValue({
      data: {
        key: 'receipt',
        columns: [],
        detailFields: [],
      },
      isLoading: false,
    })

    const { result } = renderHook(() =>
      useModulePageConfig({ moduleKey: 'receipt' }),
    )

    expect(result.current.config?.formFields).toEqual([])
  })

  it('falls back to initialConfig when key does not match', () => {
    const initialConfig = {
      key: 'sales-order',
      columns: [],
      formFields: [],
      detailFields: [],
    }
    useQueryMock.mockReturnValue({
      data: {
        key: 'other-module',
        columns: [],
        formFields: [],
        detailFields: [],
      },
      isLoading: false,
    })

    const { result } = renderHook(() =>
      useModulePageConfig({ ...defaultProps, initialConfig }),
    )
    expect(result.current.config).toEqual(initialConfig)
  })

  it('applies weight-only view for sales-outbound', () => {
    const config = {
      key: 'sales-outbound',
      columns: [
        { dataIndex: 'totalAmount', title: 'Total Amount' },
        { dataIndex: 'totalWeight', title: 'Total Weight' },
      ],
      detailFields: [
        { key: 'totalAmount', title: 'Total Amount' },
        { key: 'totalWeight', title: 'Total Weight' },
      ],
      itemColumns: [
        { dataIndex: 'materialCode', title: 'Material' },
        { dataIndex: 'unitPrice', title: 'Unit Price' },
        { dataIndex: 'amount', title: 'Amount' },
        { dataIndex: 'weightTon', title: 'Weight' },
      ],
      detailItemColumns: [
        { dataIndex: 'materialCode', title: 'Material' },
        { dataIndex: 'unitPrice', title: 'Unit Price' },
        { dataIndex: 'amount', title: 'Amount' },
        { dataIndex: 'weightTon', title: 'Weight' },
      ],
    }
    useQueryMock.mockReturnValue({ data: config, isLoading: false })
    isDisplaySwitchEnabledMock.mockImplementation(
      (_data: any, code: string) => code === 'weightOnlySalesOutbounds',
    )

    const { result } = renderHook(() =>
      useModulePageConfig({ moduleKey: 'sales-outbound' }),
    )

    expect(result.current.config?.columns).toHaveLength(1)
    expect(result.current.config?.columns[0].dataIndex).toBe('totalWeight')
    expect(
      result.current.config?.itemColumns?.map((column) => column.dataIndex),
    ).toEqual(['materialCode', 'weightTon'])
    expect(
      result.current.config?.detailItemColumns?.map(
        (column) => column.dataIndex,
      ),
    ).toEqual(['materialCode', 'weightTon'])
  })

  it('returns undefined config when no data and no initialConfig', () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false })

    const { result } = renderHook(() => useModulePageConfig(defaultProps))
    expect(result.current.config).toBeUndefined()
  })

  it('does not apply weight-only view when switch is disabled', () => {
    const config = {
      key: 'purchase-inbound',
      columns: [
        { dataIndex: 'totalAmount', title: 'Total Amount' },
        { dataIndex: 'totalWeight', title: 'Total Weight' },
      ],
      detailFields: [
        { key: 'totalAmount', title: 'Total Amount' },
        { key: 'totalWeight', title: 'Total Weight' },
      ],
    }
    useQueryMock.mockReturnValue({ data: config, isLoading: false })
    isDisplaySwitchEnabledMock.mockReturnValue(false)

    const { result } = renderHook(() =>
      useModulePageConfig({ moduleKey: 'purchase-inbound' }),
    )

    expect(result.current.config?.columns).toHaveLength(2)
  })

  it('handles non-receipt/non-payment module without statement link', () => {
    useQueryMock.mockReturnValue({
      data: {
        key: 'sales-order',
        columns: [],
        formFields: [{ key: 'sourceStatementId', title: 'Source' }],
        detailFields: [],
      },
      isLoading: false,
    })

    const { result } = renderHook(() => useModulePageConfig(defaultProps))
    expect(result.current.config).toBeDefined()
  })

  it('configures query functions and handles client setting failures', async () => {
    const queryOptions: any[] = []
    useQueryMock.mockImplementation((options: any) => {
      queryOptions.push(options)
      if (options.queryKey?.[0] === 'businessPageConfig') {
        return {
          data: {
            key: 'receipt',
            columns: [],
            formFields: [
              { key: 'sourceStatementId', title: 'Source' },
              { key: 'remark', title: 'Remark' },
            ],
            detailFields: [],
          },
          isLoading: false,
        }
      }
      if (options.queryKey?.[0] === 'statementLinkOptions') {
        return {
          data: [{ id: `${options.queryKey[1]}-1` }],
          isLoading: false,
        }
      }
      return { data: [], isLoading: false }
    })
    loadBusinessPageConfigMock.mockResolvedValue({ key: 'receipt' })
    listClientSettingsMock.mockRejectedValue(new Error('settings failed'))
    buildStatementLinkOptionsMock.mockReturnValue([{ label: 'S1', value: '1' }])

    const { result } = renderHook(() =>
      useModulePageConfig({ moduleKey: 'receipt' }),
    )

    const configQuery = queryOptions.find(
      (options) => options.queryKey?.[0] === 'businessPageConfig',
    )
    await expect(configQuery.queryFn()).resolves.toEqual({ key: 'receipt' })

    const settingsQuery = queryOptions.find(
      (options) => options.queryKey?.[0] === 'clientSettings',
    )
    await expect(settingsQuery.queryFn()).resolves.toEqual([])

    const statementQueries = queryOptions.filter(
      (options) => options.queryKey?.[0] === 'statementLinkOptions',
    )
    await Promise.all(statementQueries.map((options) => options.queryFn()))
    expect(listAllBusinessModuleRowsMock).toHaveBeenCalledWith(
      'customer-statement',
      {},
    )
    expect(listAllBusinessModuleRowsMock).toHaveBeenCalledWith(
      'supplier-statement',
      {},
    )
    expect(listAllBusinessModuleRowsMock).toHaveBeenCalledWith(
      'freight-statement',
      {},
    )

    const sourceField = result.current.config?.formFields?.find(
      (field: any) => field.key === 'sourceStatementId',
    )
    expect(sourceField?.options?.({ customerName: '客户A' })).toEqual([
      { label: 'S1', value: '1' },
    ])
    expect(buildStatementLinkOptionsMock).toHaveBeenCalledWith(
      'receipt',
      { customerName: '客户A' },
      {
        customerStatements: [{ id: 'customer-statement-1' }],
        supplierStatements: [{ id: 'supplier-statement-1' }],
        freightStatements: [{ id: 'freight-statement-1' }],
      },
    )
  })
})
