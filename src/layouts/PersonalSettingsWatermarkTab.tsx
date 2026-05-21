import { InfoCircleOutlined } from '@ant-design/icons'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Switch from 'antd/es/switch'
import Typography from 'antd/es/typography'

interface Props {
  watermarkEnabled: boolean
  watermarkContent: string
  onWatermarkEnabledChange: (value: boolean) => void
  onWatermarkContentChange: (value: string) => void
}

export function PersonalSettingsWatermarkTab({
  watermarkEnabled,
  watermarkContent,
  onWatermarkEnabledChange,
  onWatermarkContentChange,
}: Props) {
  return (
    <div className="pt-6">
      <Typography.Title level={5} className="mb-4">
        水印设置
      </Typography.Title>

      <Form layout="vertical">
        <Form.Item label="开启水印" tooltip="开启后页面将显示全局水印">
          <Switch
            checked={watermarkEnabled}
            onChange={onWatermarkEnabledChange}
            checkedChildren="开"
            unCheckedChildren="关"
          />
        </Form.Item>

        {watermarkEnabled ? (
          <Form.Item
            label="水印内容"
            tooltip="支持多行，换行分隔。默认为当前用户登录名"
          >
            <Input.TextArea
              value={watermarkContent}
              onChange={(e) => onWatermarkContentChange(e.target.value)}
              placeholder="请输入水印内容（留空则默认显示登录用户名）"
              rows={3}
              maxLength={200}
              showCount
            />
          </Form.Item>
        ) : null}

        <div className="flex items-center gap-2 text-gray-400 text-xs mt-2">
          <InfoCircleOutlined />
          <span>水印使用 Ant Design Watermark 组件，内容为空时默认显示当前登录用户名</span>
        </div>
      </Form>
    </div>
  )
}
