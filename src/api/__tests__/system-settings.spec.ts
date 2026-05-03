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
})
