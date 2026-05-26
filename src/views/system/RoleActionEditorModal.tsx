import type { FormInstance } from 'antd'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
import { useQuery } from '@tanstack/react-query'
import type { RoleRecord } from '@/api/role-actions'
import { FormModal } from '@/components/FormModal'
import { roleDataScopeValues, roleTypeValues } from '@/constants/module-options'
import { asString } from '@/utils/type-narrowing'

interface Props {
  open: boolean
  editingRole: RoleRecord | null
  form: FormInstance
  saving: boolean
  onSave: () => void
  onClose: () => void
  onApplyTemplate?: (templateName: string) => void
}

interface RoleTemplate {
  name: string
  description: string
}

export function RoleActionEditorModal({
  open,
  editingRole,
  form,
  saving,
  onSave,
  onClose,
  onApplyTemplate,
}: Props) {
  const { data: templates = [] } = useQuery<RoleTemplate[]>({
    queryKey: ['role-templates'],
    queryFn: async () => {
      const { http } = await import('@/api/client')
      const resp = await http.get<{ data?: RoleTemplate[] } | RoleTemplate[]>(
        '/role-settings/templates',
      )
      return Array.isArray(resp) ? resp : (resp.data ?? [])
    },
    enabled: open && !editingRole,
    staleTime: 10 * 60 * 1000,
  })

  return (
    <FormModal
      title={editingRole ? '编辑角色' : '新增角色'}
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        {!editingRole && templates.length > 0 ? (
          <Form.Item label="权限模板">
            <Select
              placeholder="选择模板一键填充权限（可选）"
              allowClear
              options={templates.map((t) => ({
                label: `${t.name} — ${t.description}`,
                value: t.name,
              }))}
              onChange={(name) => {
                if (name && onApplyTemplate) onApplyTemplate(asString(name))
              }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              选择模板后自动填充角色名称、编码和权限配置
            </Typography.Text>
          </Form.Item>
        ) : null}
        <Form.Item name="roleName" label="角色名称" required>
          <Input placeholder="例如：采购主管" maxLength={64} />
        </Form.Item>
        <Form.Item name="roleCode" label="角色编码" required>
          <Input
            placeholder="例如：PURCHASER"
            maxLength={64}
            disabled={!!editingRole}
          />
        </Form.Item>
        <Form.Item name="roleType" label="角色类型">
          <Select
            options={roleTypeValues.map((value) => ({ label: value, value }))}
          />
        </Form.Item>
        <Form.Item name="dataScope" label="数据范围">
          <Select
            options={roleDataScopeValues.map((value) => ({
              label: value,
              value,
            }))}
          />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea placeholder="角色描述" rows={3} />
        </Form.Item>
      </Form>
    </FormModal>
  )
}
