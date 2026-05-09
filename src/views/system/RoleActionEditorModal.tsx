import type { FormInstance } from 'antd'
import { Form, Input, Modal, Select } from 'antd'
import type { RoleRecord } from '@/api/role-actions'
import { roleDataScopeValues, roleTypeValues } from '@/constants/module-options'

interface Props {
  open: boolean
  editingRole: RoleRecord | null
  form: FormInstance
  saving: boolean
  onSave: () => void
  onClose: () => void
}

export function RoleActionEditorModal({
  open,
  editingRole,
  form,
  saving,
  onSave,
  onClose,
}: Props) {
  return (
    <Modal
      title={editingRole ? '编辑角色' : '新增角色'}
      open={open}
      onCancel={onClose}
      onOk={onSave}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
      mask={{ closable: false }}
      forceRender
    >
      <Form form={form} layout="vertical">
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
    </Modal>
  )
}
