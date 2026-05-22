import { InfoCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Flex from 'antd/es/flex'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Switch from 'antd/es/switch'
import Typography from 'antd/es/typography'
import { useCallback, useEffect } from 'react'
import { listClientSettings, saveSystemSetting } from '@/api/system-settings'
import { usePermissionStore } from '@/stores/permissionStore'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'

const CODE_ENABLED = 'WATERMARK_ENABLED'
const CODE_CONTENT = 'WATERMARK_CONTENT'

export function WatermarkSettingsCard() {
  const canEdit = usePermissionStore((s) => s.can('general-setting', 'update'))
  const [form] = Form.useForm()

  const { data: rows = [], refetch } = useQuery({
    queryKey: ['general-setting', 'client-settings'],
    queryFn: async () => {
      try { return await listClientSettings() } catch { return [] }
    },
    staleTime: 30_000,
  })

  const enabledRecord = rows.find(
    (r) => String(r.settingCode).trim() === CODE_ENABLED,
  )
  const contentRecord = rows.find(
    (r) => String(r.settingCode).trim() === CODE_CONTENT,
  )
  const watermarkEnabled = asString(enabledRecord?.status) === '正常'
  const watermarkContent = asString(contentRecord?.sampleNo || '').trim()

  useEffect(() => {
    form.setFieldsValue({ content: watermarkContent })
  }, [form, watermarkContent])

  const saveEnabled = useCallback(
    async (checked: boolean) => {
      if (!canEdit) return
      try {
        const base = enabledRecord ?? {
          id: '',
          settingCode: CODE_ENABLED,
          settingName: '全局水印开关',
          billName: '水印',
          prefix: 'SYS',
          dateRule: 'NONE',
          serialLength: 6,
          resetRule: 'NEVER',
          remark: '开启后页面显示全局水印',
        }
        await saveSystemSetting({
          ...base,
          status: checked ? '正常' : '禁用',
          sampleNo: 'ON',
        })
        message.success(checked ? '水印已开启' : '水印已关闭')
        void refetch()
      } catch {
        message.error('操作失败')
      }
    },
    [canEdit, enabledRecord, refetch],
  )

  const saveContent = useCallback(async () => {
    if (!canEdit) return
    try {
      const values = await form.validateFields()
      const base = contentRecord ?? {
        id: '',
        settingCode: CODE_CONTENT,
        settingName: '水印内容',
        billName: '水印',
        prefix: 'SYS',
        dateRule: 'NONE',
        serialLength: 6,
        resetRule: 'NEVER',
        remark: '留空则默认显示登录用户名',
      }
      await saveSystemSetting({
        ...base,
        status: contentRecord?.status ?? '正常',
        sampleNo: values.content || '',
      })
      message.success('水印内容已保存')
      void refetch()
    } catch {
      // form validation error
    }
  }, [canEdit, contentRecord, form, refetch])

  return (
    <Card title="水印设置" className="mt-4">
      <Form form={form} layout="vertical">
        <Form.Item label="开启全局水印">
          <Switch
            checked={watermarkEnabled}
            onChange={(checked) => {
              void saveEnabled(checked)
            }}
            disabled={!canEdit}
            checkedChildren="开"
            unCheckedChildren="关"
          />
        </Form.Item>

        {watermarkEnabled ? (
          <Form.Item
            name="content"
            label="水印内容"
            tooltip="留空则默认显示当前登录用户名"
          >
            <Input.TextArea
              rows={2}
              maxLength={200}
              showCount
              placeholder="留空默认显示用户名"
              disabled={!canEdit}
            />
          </Form.Item>
        ) : null}

        <Flex gap="small">
          {watermarkEnabled ? (
            <Button
              type="primary"
              onClick={() => {
                void saveContent()
              }}
              disabled={!canEdit}
            >
              保存内容
            </Button>
          ) : null}
          <Typography.Text type="secondary" className="text-xs flex items-center gap-1">
            <InfoCircleOutlined />
            配置实时生效，无需刷新页面
          </Typography.Text>
        </Flex>
      </Form>
    </Card>
  )
}
