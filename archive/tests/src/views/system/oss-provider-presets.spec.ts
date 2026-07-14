import { describe, expect, it } from 'vitest'
import {
  getOssProviderEndpointPlaceholder,
  OSS_PROVIDER_PRESETS,
  resolveOssProviderPresetDefaults,
} from './oss-provider-presets'

describe('oss provider presets', () => {
  it('covers major s3 compatible providers', () => {
    expect(OSS_PROVIDER_PRESETS.map((preset) => preset.value)).toEqual([
      's3-compatible',
      'aws-s3',
      'tencent-cos',
      'aliyun-oss',
      'huawei-obs',
      'cloudflare-r2',
      'google-cloud-storage',
      'ibm-cos',
      'oracle-oci',
      'backblaze-b2',
      'wasabi',
      'digitalocean-spaces',
      'scaleway',
      'minio',
    ])
  })

  it('resolves region based endpoint presets', () => {
    expect(resolveOssProviderPresetDefaults('tencent-cos')).toEqual({
      endpoint: 'https://cos.ap-guangzhou.myqcloud.com',
      region: 'ap-guangzhou',
      pathStyleAccess: true,
    })
    expect(resolveOssProviderPresetDefaults('aliyun-oss')).toEqual({
      endpoint: 'https://s3.oss-cn-hangzhou.aliyuncs.com',
      region: 'cn-hangzhou',
      pathStyleAccess: true,
    })
  })

  it('keeps account or namespace specific endpoints as placeholders', () => {
    expect(resolveOssProviderPresetDefaults('cloudflare-r2')).toEqual({
      endpoint: '',
      region: 'auto',
      pathStyleAccess: true,
    })
    expect(getOssProviderEndpointPlaceholder('cloudflare-r2', 'auto')).toBe(
      'https://<account-id>.r2.cloudflarestorage.com',
    )
    expect(
      getOssProviderEndpointPlaceholder('oracle-oci', 'us-ashburn-1'),
    ).toBe(
      'https://<namespace>.compat.objectstorage.us-ashburn-1.oraclecloud.com',
    )
  })

  it('uses path style for local minio compatible storage', () => {
    expect(resolveOssProviderPresetDefaults('minio')).toEqual({
      endpoint: 'http://127.0.0.1:9000',
      region: 'us-east-1',
      pathStyleAccess: true,
    })
  })

  it('falls back to s3 compatible defaults for unknown providers', () => {
    expect(resolveOssProviderPresetDefaults('unknown' as never)).toEqual({
      endpoint: 'https://s3.example.com',
      region: 'us-east-1',
      pathStyleAccess: true,
    })
    expect(getOssProviderEndpointPlaceholder('unknown' as never, '')).toBe(
      'https://s3.example.com',
    )
  })

  it('uses default region in endpoint placeholder when region is empty', () => {
    expect(getOssProviderEndpointPlaceholder('aws-s3', '')).toBe(
      'https://s3.us-east-1.amazonaws.com',
    )
  })
})
