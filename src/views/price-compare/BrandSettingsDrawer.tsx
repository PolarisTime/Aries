import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import {
  Button,
  Drawer,
  Form,
  InputNumber,
  Select,
  Space,
  Typography,
} from 'antd'
import type { Brand, BrandOption } from './types'

const { Text } = Typography

type BrandFormValues = { brands: Brand[] }

type Props = {
  open: boolean
  catalog: BrandOption[]
  form: FormInstance<BrandFormValues>
  onClose: () => void
  onSave: () => void
}

/** 比价设置: 品牌列与各品牌运费。 */
export function BrandSettingsDrawer({
  open,
  catalog,
  form,
  onClose,
  onSave,
}: Props) {
  return (
    <Drawer
      title="比价设置"
      size={420}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={onSave}>
            保存
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.List name="brands">
          {(fields, { add, remove }) => (
            <Space
              orientation="vertical"
              style={{ width: '100%' }}
              size="small"
            >
              {fields.map((field) => (
                <Space
                  key={field.key}
                  align="baseline"
                  style={{ display: 'flex' }}
                >
                  <Form.Item
                    {...field}
                    name={[field.name, 'name']}
                    rules={[{ required: true, message: '选择品牌' }]}
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      style={{ width: 160 }}
                      placeholder="品牌"
                      options={catalog.map((item) => ({
                        value: item.name,
                        label: item.name,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'freight']}
                    style={{ marginBottom: 8 }}
                  >
                    <InputNumber
                      min={0}
                      max={9999}
                      suffix="元/吨"
                      style={{ width: 150 }}
                    />
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => remove(field.name)}
                  />
                </Space>
              ))}
              <Button
                block
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => add({ name: undefined, freight: 30 })}
              >
                添加品牌
              </Button>
              <Text type="secondary" style={{ fontSize: 12 }}>
                品牌列的顺序即表格中的展示顺序；网价自动取自行情数据源。
              </Text>
            </Space>
          )}
        </Form.List>
      </Form>
    </Drawer>
  )
}
