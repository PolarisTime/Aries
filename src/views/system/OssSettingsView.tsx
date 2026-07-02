import {
  CloudServerOutlined,
  LockOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getOssSetting,
  type OssSetting,
  saveOssSetting,
} from '@/api/system-settings'
import { useRequestError } from '@/hooks/useRequestError'
import { usePermissionStore } from '@/stores/permissionStore'
import { message } from '@/utils/antd-app'

interface OssSettingsFormValues {
  storageMode: 'server-s3' | 'server-local'
  provider: 's3-compatible' | 'tencent-cos' | 'aliyun-oss'
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
  pathStyleAccess: true,
  encryptedStorage: false,
  serverProxyOnly: true,
}

export function OssSettingsView(): React.JSX.Element {
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const queryClient = useQueryClient()
  const canSave = usePermissionStore().can('general-setting', 'update')
  const [form] = Form.useForm<OssSettingsFormValues>()

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

  useEffect(() => {
    if (!data) {
      return
    }
    form.setFieldsValue(toFormValues(data))
  }, [data, form])

  const providerOptions = useMemo(
    () => [
      {
        label: t('system.ossSettings.providerS3Compatible'),
        value: 's3-compatible',
      },
      {
        label: t('system.ossSettings.providerTencentCos'),
        value: 'tencent-cos',
      },
      {
        label: t('system.ossSettings.providerAliyunOss'),
        value: 'aliyun-oss',
      },
    ],
    [t],
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
    <div className="page-stack oss-settings-page">
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
        <Form<OssSettingsFormValues>
          form={form}
          name="oss-settings"
          layout="vertical"
          initialValues={initialValues}
          disabled={isFetching || saveMutation.isPending}
          onFinish={(values) => {
            saveMutation.mutate({
              ...values,
              secretKey: values.secretKey?.trim() || undefined,
            })
          }}
        >
          <div className="oss-settings-form-grid">
            <Form.Item
              name="storageMode"
              label={t('system.ossSettings.storageMode')}
            >
              <Select options={storageModeOptions} />
            </Form.Item>

            <Form.Item name="provider" label={t('system.ossSettings.provider')}>
              <Select options={providerOptions} />
            </Form.Item>

            <Form.Item name="endpoint" label={t('system.ossSettings.endpoint')}>
              <Input
                placeholder={t('system.ossSettings.endpointPlaceholder')}
              />
            </Form.Item>

            <Form.Item name="bucket" label={t('system.ossSettings.bucket')}>
              <Input placeholder={t('system.ossSettings.bucketPlaceholder')} />
            </Form.Item>

            <Form.Item name="region" label={t('system.ossSettings.region')}>
              <Input placeholder={t('system.ossSettings.regionPlaceholder')} />
            </Form.Item>

            <Form.Item
              name="keyPrefix"
              label={t('system.ossSettings.keyPrefix')}
            >
              <Input
                placeholder={t('system.ossSettings.keyPrefixPlaceholder')}
              />
            </Form.Item>

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
              {data?.secretKeyConfigured
                ? t('system.ossSettings.secretKeyKeepHint')
                : t('system.ossSettings.secretKeyRequiredHint')}
            </Typography.Text>
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
