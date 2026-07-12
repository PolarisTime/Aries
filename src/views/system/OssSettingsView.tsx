import {
  CloudServerOutlined,
  LockOutlined,
  SaveOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormInstance } from 'antd'
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  configureOssCors,
  getOssSetting,
  type OssOperationResult,
  type OssSetting,
  type OssSettingPayload,
  saveOssSetting,
  testOssStorage,
} from '@/api/system-settings'
import { useRequestError } from '@/hooks/useRequestError'
import { usePermissionStore } from '@/stores/permissionStore'
import { message } from '@/utils/antd-app'
import {
  getOssProviderEndpointPlaceholder,
  OSS_PROVIDER_PRESETS,
  type OssProvider,
  resolveOssProviderPresetDefaults,
} from './oss-provider-presets'

interface OssSettingsFormValues {
  storageMode: 'server-s3' | 'server-local'
  provider: OssProvider
  endpoint: string
  bucket: string
  region: string
  accessKey: string
  secretKey: string
  keyPrefix: string
  pathStyleAccess: boolean
  encryptedStorage: boolean
  serverProxyOnly: boolean
}

const OSS_SETTING_QUERY_KEY = ['system', 'oss-setting'] as const

const initialValues: OssSettingsFormValues = {
  storageMode: 'server-s3',
  provider: 's3-compatible',
  endpoint: '',
  bucket: '',
  region: 'ap-guangzhou',
  accessKey: '',
  secretKey: '',
  keyPrefix: 'attachments',
  pathStyleAccess: false,
  encryptedStorage: false,
  serverProxyOnly: true,
}

export function OssSettingsView(): React.JSX.Element {
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const queryClient = useQueryClient()
  const canSave = usePermissionStore().can('general-setting', 'update')
  const [form] = Form.useForm<OssSettingsFormValues>()
  const [operationResult, setOperationResult] =
    useState<OssOperationResult | null>(null)
  const storageMode =
    Form.useWatch('storageMode', form) ?? initialValues.storageMode
  const provider = Form.useWatch('provider', form) ?? initialValues.provider
  const region = Form.useWatch('region', form) ?? initialValues.region
  const isS3Mode = storageMode === 'server-s3'

  const { data, isFetching } = useQuery({
    queryKey: OSS_SETTING_QUERY_KEY,
    queryFn: getOssSetting,
  })

  const saveMutation = useMutation({
    mutationFn: saveOssSetting,
    onSuccess: (saved) => {
      message.success(t('common.saveSuccess'))
      queryClient.setQueryData(OSS_SETTING_QUERY_KEY, saved)
      form.setFieldsValue({
        ...toFormValues(saved),
        secretKey: '',
      })
    },
    onError: (error) => {
      showError(error, t('system.ossSettings.saveFailed'))
    },
  })

  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation -- 测试存储只返回操作结果，刷新设置查询会覆盖未保存表单。
  const testStorageMutation = useMutation({
    mutationFn: testOssStorage,
    onSuccess: (result) => {
      setOperationResult(result)
      message.success(result.message || t('system.ossSettings.testSuccess'))
    },
    onError: (error) => {
      setOperationResult(null)
      showError(error, t('system.ossSettings.testFailed'))
    },
  })

  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation -- CORS 配置改的是外部 OSS 服务，不改变本地设置缓存。
  const configureCorsMutation = useMutation({
    mutationFn: configureOssCors,
    onSuccess: (result) => {
      setOperationResult(result)
      message.success(result.message || t('system.ossSettings.corsSuccess'))
    },
    onError: (error) => {
      setOperationResult(null)
      showError(error, t('system.ossSettings.corsFailed'))
    },
  })

  useEffect(() => {
    if (!data) {
      return
    }
    form.setFieldsValue(toFormValues(data))
  }, [data, form])

  const providerOptions = useMemo(
    () =>
      OSS_PROVIDER_PRESETS.map((preset) => ({
        label: t(`system.ossSettings.${preset.labelKey}`),
        value: preset.value,
      })),
    [t],
  )

  const endpointPlaceholder = useMemo(
    () => getOssProviderEndpointPlaceholder(provider, region),
    [provider, region],
  )

  const storageModeOptions = useMemo(
    () => [
      {
        label: t('system.ossSettings.storageModeServerS3'),
        value: 'server-s3',
      },
      {
        label: t('system.ossSettings.storageModeServerLocal'),
        value: 'server-local',
      },
    ],
    [t],
  )

  return (
    <div className="page-stack settings-section-page oss-settings-page">
      <Card
        className="oss-settings-card"
        title={
          <div className="oss-settings-header">
            <div className="oss-settings-title-block">
              <Space size={8} align="center">
                <CloudServerOutlined aria-hidden />
                <Typography.Title level={4} className="m-0">
                  {t('system.ossSettings.title')}
                </Typography.Title>
              </Space>
              <Typography.Text type="secondary">
                {t('system.ossSettings.description')}
              </Typography.Text>
            </div>
            <Tag color="processing">{t('system.ossSettings.pendingApi')}</Tag>
          </div>
        }
      >
        {operationResult ? (
          <Alert
            className="oss-settings-result"
            showIcon
            type={operationResult.success ? 'success' : 'error'}
            title={operationResult.message}
            description={
              operationResult.details?.length ? (
                <ul className="oss-settings-result-list">
                  {operationResult.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : undefined
            }
          />
        ) : null}

        <Form<OssSettingsFormValues>
          form={form}
          name="oss-settings"
          layout="vertical"
          initialValues={initialValues}
          disabled={isFetching || saveMutation.isPending}
          onFinish={(values) => {
            saveMutation.mutate(toPayload(values))
          }}
        >
          <div className="oss-settings-form-grid">
            <Divider
              className="oss-settings-form-section"
              titlePlacement="start"
            >
              {t('system.ossSettings.connectionSection')}
            </Divider>
            <Form.Item
              name="storageMode"
              label={t('system.ossSettings.storageMode')}
            >
              <Select options={storageModeOptions} />
            </Form.Item>

            {isS3Mode ? (
              <>
                <Form.Item
                  name="provider"
                  label={t('system.ossSettings.provider')}
                >
                  <Select
                    options={providerOptions}
                    virtual={false}
                    onChange={(value) => {
                      applyProviderPreset(form, value)
                    }}
                  />
                </Form.Item>

                <Form.Item
                  name="endpoint"
                  label={t('system.ossSettings.endpoint')}
                >
                  <Input placeholder={endpointPlaceholder} />
                </Form.Item>

                <Form.Item name="bucket" label={t('system.ossSettings.bucket')}>
                  <Input
                    placeholder={t('system.ossSettings.bucketPlaceholder')}
                  />
                </Form.Item>

                <Form.Item name="region" label={t('system.ossSettings.region')}>
                  <Input
                    placeholder={t('system.ossSettings.regionPlaceholder')}
                  />
                </Form.Item>
              </>
            ) : null}

            <Form.Item
              name="keyPrefix"
              label={t('system.ossSettings.keyPrefix')}
            >
              <Input
                placeholder={t('system.ossSettings.keyPrefixPlaceholder')}
              />
            </Form.Item>

            <Divider
              className="oss-settings-form-section"
              titlePlacement="start"
            >
              {t('system.ossSettings.securitySection')}
            </Divider>

            {isS3Mode ? (
              <>
                <Form.Item
                  name="accessKey"
                  label={t('system.ossSettings.accessKey')}
                >
                  <Input
                    placeholder={t('system.ossSettings.accessKeyPlaceholder')}
                  />
                </Form.Item>

                <Form.Item
                  name="secretKey"
                  label={t('system.ossSettings.secretKey')}
                >
                  <Input.Password
                    prefix={<LockOutlined aria-hidden />}
                    placeholder={
                      data?.secretKeyConfigured
                        ? t('system.ossSettings.secretKeyConfiguredPlaceholder')
                        : t('system.ossSettings.secretKeyPlaceholder')
                    }
                  />
                </Form.Item>

                <Form.Item
                  name="pathStyleAccess"
                  label={t('system.ossSettings.pathStyleAccess')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </>
            ) : null}

            <Form.Item
              name="encryptedStorage"
              label={t('system.ossSettings.encryptedStorage')}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="serverProxyOnly"
              label={t('system.ossSettings.serverProxyOnly')}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          <div className="oss-settings-actions">
            <Typography.Text type="secondary">
              {!isS3Mode
                ? t('system.ossSettings.localModeHint')
                : data?.secretKeyConfigured
                  ? t('system.ossSettings.secretKeyKeepHint')
                  : t('system.ossSettings.secretKeyRequiredHint')}
            </Typography.Text>
            <div className="oss-settings-action-buttons">
              <Button
                htmlType="button"
                icon={<ThunderboltOutlined aria-hidden />}
                loading={testStorageMutation.isPending}
                disabled={!canSave}
                onClick={() => {
                  testStorageMutation.mutate(
                    toPayload(form.getFieldsValue(true)),
                  )
                }}
              >
                {t('system.ossSettings.testStorage')}
              </Button>
              <Button
                htmlType="button"
                icon={<SettingOutlined aria-hidden />}
                loading={configureCorsMutation.isPending}
                disabled={!canSave || !isS3Mode}
                onClick={() => {
                  configureCorsMutation.mutate({
                    setting: toPayload(form.getFieldsValue(true)),
                    origin: resolveCurrentOrigin(),
                    methods: ['GET', 'PUT', 'HEAD'],
                  })
                }}
              >
                {t('system.ossSettings.configureCors')}
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined aria-hidden />}
                loading={saveMutation.isPending}
                disabled={!canSave}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  )
}

function toFormValues(setting: OssSetting): OssSettingsFormValues {
  return {
    storageMode: setting.storageMode,
    provider: setting.provider,
    endpoint: setting.endpoint,
    bucket: setting.bucket,
    region: setting.region,
    accessKey: setting.accessKey,
    secretKey: '',
    keyPrefix: setting.keyPrefix,
    pathStyleAccess: setting.pathStyleAccess,
    encryptedStorage: setting.encryptedStorage,
    serverProxyOnly: setting.serverProxyOnly,
  }
}

function resolveCurrentOrigin(): string {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return ''
  }
  return window.location.origin
}

function applyProviderPreset(
  form: FormInstance<OssSettingsFormValues>,
  provider: OssProvider,
): void {
  const defaults = resolveOssProviderPresetDefaults(provider)
  form.setFieldsValue(defaults)
}

function toPayload(values: OssSettingsFormValues): OssSettingPayload {
  if (values.storageMode === 'server-local') {
    return {
      ...values,
      provider: 's3-compatible',
      endpoint: '',
      bucket: '',
      region: '',
      accessKey: '',
      secretKey: undefined,
    }
  }
  return {
    ...values,
    secretKey: values.secretKey?.trim() || undefined,
  }
}
