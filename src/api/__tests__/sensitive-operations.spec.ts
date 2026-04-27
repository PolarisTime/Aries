const clientMocks = vi.hoisted(() => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  http: {
    get: clientMocks.httpGet,
    post: clientMocks.httpPost,
  },
  assertApiSuccess: <T extends { code?: number; message?: string }>(response: T) => {
    if (Number(response?.code) !== 0) {
      throw new Error(response?.message || '请求失败')
    }
    return response
  },
}))

describe('sensitive operation apis', () => {
  beforeEach(() => {
    clientMocks.httpGet.mockReset()
    clientMocks.httpPost.mockReset()
  })

  it('sends the current 2fa code when rotating security keys', async () => {
    clientMocks.httpPost.mockResolvedValue({
      code: 0,
      data: {},
    })

    const { rotateJwtSecurityKey, rotateTotpSecurityKey } = await import('@/api/security-keys')

    await rotateJwtSecurityKey('123456')
    await rotateTotpSecurityKey('654321')

    expect(clientMocks.httpPost).toHaveBeenNthCalledWith(1, '/system/security-keys/jwt/rotate', null, {
      headers: {
        'X-TOTP-Code': '123456',
      },
    })
    expect(clientMocks.httpPost).toHaveBeenNthCalledWith(2, '/system/security-keys/totp/rotate', null, {
      headers: {
        'X-TOTP-Code': '654321',
      },
    })
  })

  it('sends the current 2fa code when exporting and importing database backups', async () => {
    clientMocks.httpPost.mockResolvedValue({
      code: 0,
      data: {},
    })

    const { createDatabaseExportTask, importDatabaseBackup } = await import('@/api/database-admin')
    const file = new File(['backup'], 'backup.sql', { type: 'text/sql' })

    await createDatabaseExportTask('123456')
    await importDatabaseBackup(file, '654321', 'leo', 'secret')

    expect(clientMocks.httpPost).toHaveBeenNthCalledWith(1, '/system/database/export-tasks', null, {
      headers: {
        'X-TOTP-Code': '123456',
      },
    })
    expect(clientMocks.httpPost).toHaveBeenNthCalledWith(2, '/system/database/import', expect.any(FormData), {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-TOTP-Code': '654321',
      },
    })
  })

  it('sends the current 2fa code when generating api keys', async () => {
    clientMocks.httpPost.mockResolvedValue({
      code: 0,
      data: {},
    })

    const { createApiKey } = await import('@/api/api-keys')

    await createApiKey('1', {
      keyName: '同步密钥',
      usageScope: '全部接口',
      allowedResources: [],
      allowedActions: ['read'],
      expireDays: null,
    }, '123456')

    expect(clientMocks.httpPost).toHaveBeenCalledWith('/auth/api-keys', {
      keyName: '同步密钥',
      usageScope: '全部接口',
      allowedResources: [],
      allowedActions: ['read'],
      expireDays: null,
    }, {
      params: { userId: '1' },
      headers: {
        'X-TOTP-Code': '123456',
      },
    })
  })
})
