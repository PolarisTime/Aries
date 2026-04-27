const clientMocks = vi.hoisted(() => ({
  httpPost: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  http: {
    post: clientMocks.httpPost,
  },
}))

describe('materials api', () => {
  beforeEach(() => {
    clientMocks.httpPost.mockReset()
  })

  it('uploads csv files through the current materials import endpoint', async () => {
    clientMocks.httpPost.mockResolvedValue({
      code: 0,
      data: {
        totalRows: 1,
        successCount: 1,
        createdCount: 1,
        updatedCount: 0,
        failedCount: 0,
        failures: [],
      },
    })

    const file = new File(['sku,name\nA-01,Steel'], 'materials.csv', {
      type: 'text/csv',
    })
    const { importMaterialsCsv } = await import('@/api/materials')

    await importMaterialsCsv(file)

    expect(clientMocks.httpPost).toHaveBeenCalledTimes(1)
    const [url, payload, config] = clientMocks.httpPost.mock.calls[0]
    expect(url).toBe('/materials/import')
    expect(payload).toBeInstanceOf(FormData)
    expect((payload as FormData).get('file')).toBe(file)
    expect(config).toEqual({
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  })
})
