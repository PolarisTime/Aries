import type { FormInstance } from 'antd'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import InputNumber from 'antd/es/input-number'
import { FormModal } from '@/components/FormModal'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Typography from 'antd/es/typography'
import type {
  ApiKeyActionOption,
  ApiKeyResourceOption,
  ApiKeyUserOption,
} from '@/api/api-keys'
import { apiKeyUsageScopeOptions } from '@/views/system/api-key-form-options'
import { getApiKeyUserDisplayName } from '@/views/system/api-key-view-utils'

type Props = {
  open: boolean
  generatedKey: string | null
  generating: boolean
  totpDisabled: boolean
  form: FormInstance
  userOptions: ApiKeyUserOption[]
  resourceOptions: ApiKeyResourceOption[]
  actionOptions: ApiKeyActionOption[]
  onGenerate: () => void
  onClose: () => void
}

export function ApiKeyCreateModal({
  open,
  generatedKey,
  generating,
  totpDisabled,
  form,
  userOptions,
  resourceOptions,
  actionOptions,
  onGenerate,
  onClose,
}: Props) {
  return (
    <FormModal
      title="生成 API Key"
      open={open}
      onClose={onClose}
      footer={null}
    >
      {!generatedKey ? (
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label="所属用户" required>
            <Select
              showSearch
              placeholder="搜索账号 / 用户姓名 / 手机号"
              options={userOptions.map((item) => ({
                label: `${getApiKeyUserDisplayName(item)}${item.mobile ? ` / ${item.mobile}` : ''}`,
                value: String(item.id || ''),
              }))}
              filterOption={(input, option) =>
                String(option?.label || '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="keyName" label="密钥名称" required>
            <Input placeholder="例如：订单同步密钥" maxLength={64} />
          </Form.Item>
          <Form.Item name="usageScope" label="使用范围" required>
            <Select options={apiKeyUsageScopeOptions} />
          </Form.Item>
          <Form.Item name="allowedResources" label="允许访问资源">
            <Select
              mode="multiple"
              allowClear
              placeholder="不选则按使用范围放行"
              maxTagCount={4}
              options={resourceOptions.map((item) => ({
                label: `${item.group} / ${item.title}`,
                value: item.code,
              }))}
            />
          </Form.Item>
          <Form.Item name="allowedActions" label="允许动作" required>
            <Select
              mode="multiple"
              placeholder="请选择允许动作"
              maxTagCount={5}
              options={actionOptions.map((item) => ({
                label: item.title,
                value: item.code,
              }))}
            />
          </Form.Item>
          <Form.Item name="expireDays" label="有效期（天）">
            <InputNumber
              placeholder="留空则永不过期"
              style={{ width: '100%' }}
              min={1}
              max={3650}
            />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={onClose}>取消</Button>
              <Button
                type="primary"
                loading={generating}
                disabled={totpDisabled}
                onClick={onGenerate}
              >
                生成
              </Button>
            </Space>
          </div>
        </Form>
      ) : (
        <>
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            title="请立即复制保存，此密钥仅显示一次"
          />
          <div
            style={{
              background: '#f5f5f5',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              padding: 16,
            }}
          >
            <Typography.Paragraph
              copyable
              code
              style={{ margin: 0, wordBreak: 'break-all' }}
            >
              {generatedKey}
            </Typography.Paragraph>
          </div>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button type="primary" onClick={onClose}>
              关闭
            </Button>
          </div>
        </>
      )}
    </FormModal>
  )
}
