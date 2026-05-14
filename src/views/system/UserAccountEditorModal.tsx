import type { FormInstance } from 'antd'
import Col from 'antd/es/col'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Spin from 'antd/es/spin'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { FormModal } from '@/components/FormModal'
import {
  enabledStatusOptions,
  enabledStatusValues,
} from '@/constants/module-options'
import { getFormString } from '@/lib/antd-form'
import type {
  DepartmentOptionRecord,
  RoleOptionRecord,
} from '@/types/user-account'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'

type EditorMode = 'create' | 'edit'
interface Props {
  open: boolean
  mode: EditorMode
  loading: boolean
  saving: boolean
  form: FormInstance
  editingId: string | null
  loginNameValidationMessage: string
  loginNameChecking: boolean
  departmentOptions: DepartmentOptionRecord[]
  roleOptions: RoleOptionRecord[]
  selectedRoleNames: string[]
  selectedRoleDataScope: string
  selectedRoleSummaries: string[]
  onCheckLoginName: (loginName: string, excludeUserId?: string) => void
  onSave: () => void
  onClose: () => void
}
export function UserAccountEditorModal({
  open,
  mode,
  loading,
  saving,
  form,
  editingId,
  loginNameValidationMessage,
  loginNameChecking,
  departmentOptions,
  roleOptions,
  selectedRoleNames,
  selectedRoleDataScope,
  selectedRoleSummaries,
  onCheckLoginName,
  onSave,
  onClose,
}: Props) {
  const isCreate = mode === 'create'
  const roleDataScopeId = buildFormControlId(
    'user-account-editor',
    'data-scope',
  )
  return (
    <FormModal
      title={isCreate ? '新增用户账户' : '编辑用户账户'}
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      width={760}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" className="user-account-form">
          <div className="form-section">
            <div className="form-section-title">账户信息</div>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="loginName"
                  label="登录账号"
                  required
                  hasFeedback
                  validateStatus={
                    loginNameChecking
                      ? 'validating'
                      : loginNameValidationMessage
                        ? 'error'
                        : undefined
                  }
                  help={
                    loginNameChecking
                      ? '正在检查登录账号...'
                      : loginNameValidationMessage || undefined
                  }
                >
                  <Input
                    placeholder="请输入登录账号"
                    maxLength={64}
                    onBlur={() => {
                      const loginName = getFormString(form, 'loginName')
                      if (loginName?.trim()) {
                        onCheckLoginName(
                          loginName,
                          mode === 'edit'
                            ? (editingId ?? undefined)
                            : undefined,
                        )
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="userName" label="用户姓名" required>
                  <Input placeholder="请输入用户姓名" maxLength={64} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="mobile" label="手机号">
                  <Input placeholder="请输入手机号" maxLength={32} />
                </Form.Item>
              </Col>
              {isCreate ? (
                <Col span={12}>
                  <Form.Item
                    name="password"
                    label="初始密码"
                    extra="留空时系统会自动生成 8 位随机密码。"
                  >
                    <Input.Password
                      placeholder="请输入初始密码"
                      maxLength={128}
                    />
                  </Form.Item>
                </Col>
              ) : (
                <Col span={12}>
                  <Form.Item name="status" label="状态">
                    <Select
                      placeholder="请选择状态"
                      options={enabledStatusOptions}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="departmentId" label="所属部门" required>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="请选择部门"
                    options={departmentOptions.map((department) => ({
                      label: department.departmentName,
                      value: String(department.id || ''),
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
          <div className="form-section">
            <div className="form-section-title">权限配置</div>
            <Row gutter={24}>
              <Col span={isCreate ? 16 : 14}>
                <Form.Item name="roleNames" label="所属角色" required>
                  <Select
                    mode="multiple"
                    placeholder="请选择角色"
                    maxTagCount={5}
                    options={roleOptions.map((role) => ({
                      label: role.roleName,
                      value: role.roleName,
                      disabled:
                        role.status === enabledStatusValues[1] &&
                        !selectedRoleNames.includes(role.roleName),
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={isCreate ? 8 : 5}>
                <Form.Item
                  {...buildLabeledFormItemProps({
                    label: '角色数据范围',
                    htmlFor: roleDataScopeId,
                  })}
                >
                  <Input
                    id={roleDataScopeId}
                    name="role-data-scope"
                    value={selectedRoleDataScope}
                    disabled
                  />
                </Form.Item>
              </Col>
              {isCreate && (
                <Col span={8}>
                  <Form.Item name="status" label="状态">
                    <Select
                      placeholder="请选择状态"
                      options={enabledStatusOptions}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>
            <Form.Item label="权限摘要">
              {selectedRoleSummaries.length > 0 ? (
                <Space wrap>
                  {selectedRoleSummaries.map((summary) => (
                    <Tag key={summary} color="blue">
                      {summary}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Typography.Text type="secondary">
                  选择角色后自动汇总
                </Typography.Text>
              )}
            </Form.Item>
          </div>
          <div className="form-section">
            <div className="form-section-title">补充信息</div>
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={2} placeholder="请输入备注" />
            </Form.Item>
          </div>
        </Form>
      </Spin>
    </FormModal>
  )
}
