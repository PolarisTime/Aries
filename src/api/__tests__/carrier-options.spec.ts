const clientMocks = vi.hoisted(() => ({
  httpGet: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  http: {
    get: clientMocks.httpGet,
  },
}))

describe('carrier option helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    clientMocks.httpGet.mockReset()
  })

  it('loads carrier options from master data and exposes cached values reactively', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: [
        { label: '物流甲', value: '物流甲', vehiclePlates: ['苏A12345', ' 苏A67890 '] },
        { label: '物流乙', value: '物流乙' },
      ],
    })

    const {
      fetchCarrierOptions,
      getCarrierOptions,
      getCarrierVehiclePlateOptions,
    } = await import('@/api/carrier-options')

    expect(getCarrierOptions()).toEqual([])
    expect(clientMocks.httpGet).toHaveBeenCalledWith('/carriers/options')

    await fetchCarrierOptions()

    expect(getCarrierOptions()).toEqual([
      { label: '物流甲', value: '物流甲', vehiclePlates: ['苏A12345', '苏A67890'] },
      { label: '物流乙', value: '物流乙', vehiclePlates: [] },
    ])
    expect(getCarrierVehiclePlateOptions({ carrierName: '物流甲' })).toEqual([
      { label: '苏A12345', value: '苏A12345' },
      { label: '苏A67890', value: '苏A67890' },
    ])
    expect(getCarrierVehiclePlateOptions({ carrierName: '物流乙' })).toEqual([])
    expect(clientMocks.httpGet).toHaveBeenCalledTimes(1)
  })
})
