import type { OssProvider } from '@/api/system-settings'

export type { OssProvider }

export interface OssProviderPreset {
  value: OssProvider
  labelKey: string
  defaultRegion: string
  endpointTemplate: string
  pathStyleAccess: boolean
}

export interface OssProviderPresetDefaults {
  endpoint: string
  region: string
  pathStyleAccess: boolean
}

export const OSS_PROVIDER_PRESETS: OssProviderPreset[] = [
  {
    value: 's3-compatible',
    labelKey: 'providerS3Compatible',
    defaultRegion: 'us-east-1',
    endpointTemplate: 'https://s3.example.com',
    pathStyleAccess: true,
  },
  {
    value: 'aws-s3',
    labelKey: 'providerAwsS3',
    defaultRegion: 'us-east-1',
    endpointTemplate: 'https://s3.{region}.amazonaws.com',
    pathStyleAccess: false,
  },
  {
    value: 'tencent-cos',
    labelKey: 'providerTencentCos',
    defaultRegion: 'ap-guangzhou',
    endpointTemplate: 'https://cos.{region}.myqcloud.com',
    pathStyleAccess: true,
  },
  {
    value: 'aliyun-oss',
    labelKey: 'providerAliyunOss',
    defaultRegion: 'cn-hangzhou',
    endpointTemplate: 'https://s3.oss-{region}.aliyuncs.com',
    pathStyleAccess: true,
  },
  {
    value: 'huawei-obs',
    labelKey: 'providerHuaweiObs',
    defaultRegion: 'cn-south-1',
    endpointTemplate: 'https://obs.{region}.myhuaweicloud.com',
    pathStyleAccess: true,
  },
  {
    value: 'cloudflare-r2',
    labelKey: 'providerCloudflareR2',
    defaultRegion: 'auto',
    endpointTemplate: 'https://<account-id>.r2.cloudflarestorage.com',
    pathStyleAccess: true,
  },
  {
    value: 'google-cloud-storage',
    labelKey: 'providerGoogleCloudStorage',
    defaultRegion: 'auto',
    endpointTemplate: 'https://storage.googleapis.com',
    pathStyleAccess: true,
  },
  {
    value: 'ibm-cos',
    labelKey: 'providerIbmCos',
    defaultRegion: 'us-south',
    endpointTemplate:
      'https://s3.{region}.cloud-object-storage.appdomain.cloud',
    pathStyleAccess: true,
  },
  {
    value: 'oracle-oci',
    labelKey: 'providerOracleOci',
    defaultRegion: 'us-ashburn-1',
    endpointTemplate:
      'https://<namespace>.compat.objectstorage.{region}.oraclecloud.com',
    pathStyleAccess: true,
  },
  {
    value: 'backblaze-b2',
    labelKey: 'providerBackblazeB2',
    defaultRegion: 'us-west-004',
    endpointTemplate: 'https://s3.{region}.backblazeb2.com',
    pathStyleAccess: true,
  },
  {
    value: 'wasabi',
    labelKey: 'providerWasabi',
    defaultRegion: 'us-east-1',
    endpointTemplate: 'https://s3.{region}.wasabisys.com',
    pathStyleAccess: true,
  },
  {
    value: 'digitalocean-spaces',
    labelKey: 'providerDigitalOceanSpaces',
    defaultRegion: 'nyc3',
    endpointTemplate: 'https://{region}.digitaloceanspaces.com',
    pathStyleAccess: true,
  },
  {
    value: 'scaleway',
    labelKey: 'providerScaleway',
    defaultRegion: 'fr-par',
    endpointTemplate: 'https://s3.{region}.scw.cloud',
    pathStyleAccess: true,
  },
  {
    value: 'minio',
    labelKey: 'providerMinio',
    defaultRegion: 'us-east-1',
    endpointTemplate: 'http://127.0.0.1:9000',
    pathStyleAccess: true,
  },
]

const PRESETS_BY_PROVIDER = new Map(
  OSS_PROVIDER_PRESETS.map((preset) => [preset.value, preset]),
)

export function resolveOssProviderPresetDefaults(
  provider: OssProvider,
): OssProviderPresetDefaults {
  const preset = PRESETS_BY_PROVIDER.get(provider) ?? OSS_PROVIDER_PRESETS[0]
  const endpoint = preset.endpointTemplate.includes('<')
    ? ''
    : formatEndpointTemplate(preset.endpointTemplate, preset.defaultRegion)
  return {
    endpoint,
    region: preset.defaultRegion,
    pathStyleAccess: preset.pathStyleAccess,
  }
}

export function getOssProviderEndpointPlaceholder(
  provider: OssProvider,
  region: string,
): string {
  const preset = PRESETS_BY_PROVIDER.get(provider) ?? OSS_PROVIDER_PRESETS[0]
  return formatEndpointTemplate(
    preset.endpointTemplate,
    region || preset.defaultRegion,
  )
}

function formatEndpointTemplate(template: string, region: string): string {
  return template.replaceAll('{region}', region)
}
