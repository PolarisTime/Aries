const clientMocks = vi.hoisted(() => ({
  httpGet: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  http: {
    get: clientMocks.httpGet,
  },
  assertApiSuccess: <T extends { code?: number; message?: string }>(response: T) => {
    if (response.code != null && response.code !== 0) {
      throw new Error(response.message || '请求失败')
    }
    return response
  },
}))

describe('system settings api', () => {
  beforeEach(() => {
    clientMocks.httpGet.mockReset()
  })

  it('loads display switches and preserves snowflake ids as strings', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: [
        {
          id: '1914876201459236001',
          settingCode: 'UI_SHOW_SNOWFLAKE_ID',
          status: '正常',
        },
      ],
    })

    const { isDisplaySwitchEnabled, listDisplaySwitches } = await import('@/api/system-settings')

    const switches = await listDisplaySwitches()

    expect(clientMocks.httpGet).toHaveBeenCalledWith('/general-settings/display-switches')
    expect(switches[0].id).toBe('1914876201459236001')
    expect(isDisplaySwitchEnabled(switches, 'UI_SHOW_SNOWFLAKE_ID')).toBe(true)
    expect(isDisplaySwitchEnabled(switches, 'UI_HIDE_AUDITED_LIST_RECORDS')).toBe(false)
  })

  it('loads public client settings and resolves numeric page size', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: [
        {
          id: '1914876201459236002',
          settingCode: 'UI_DEFAULT_LIST_PAGE_SIZE',
          sampleNo: '50',
          status: '正常',
        },
      ],
    })

    const { CLIENT_SETTING_CODES, getClientSettingNumber, listClientSettings } = await import('@/api/system-settings')

    const settings = await listClientSettings()

    expect(clientMocks.httpGet).toHaveBeenCalledWith('/general-settings/client-settings')
    expect(settings[0].id).toBe('1914876201459236002')
    expect(getClientSettingNumber(settings, CLIENT_SETTING_CODES.defaultListPageSize, 20)).toBe(50)
    expect(getClientSettingNumber(settings, 'UNKNOWN', 20)).toBe(20)
  })
})
