import type { FormInstance } from 'antd'
import {
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { useTranslation } from 'react-i18next'
import { FormModal } from '@/components/FormModal'
import {
  enabledStatusOptions,
  enabledStatusValues,
} from '@/constants/module-options'
import { getFormString } from '@/lib/antd-form'
import type { DepartmentOptionRecord, RoleOptionRecord } from '@/shared/schemas'
import { useAuthStore } from '@/stores/authStore'

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
  selectedRoleIds: string[]
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
  selectedRoleIds,
  selectedRoleSummaries,
  onCheckLoginName,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const isCreate = mode === 'create'
  const currentUserId = useAuthStore((state) => state.user?.id)
  const isEditingOwnAccount =
    mode === 'edit' &&
    editingId != null &&
    String(currentUserId ?? '') === String(editingId)
  const roleOptionsById = new Map(
    roleOptions.map((role) => [String(role.id), role]),
  )
  const selectedRoleConflictIds = new Set(
    selectedRoleIds.flatMap((roleId) =>
      (roleOptionsById.get(roleId)?.conflictRoleIds || []).map(String),
    ),
  )
  return (
    <FormModal
      title={
        isCreate
          ? t('system.userAccountEditor.createTitle')
          : t('system.userAccountEditor.editTitle')
      }
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      width={760}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" className="user-account-form">
          <div className="form-section">
            <div className="form-section-title">
              {t('system.userAccountEditor.accountInfo')}
            </div>
            <Row gutter={[24, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="loginName"
                  label={t('system.userAccountEditor.loginName')}
                  rules={[
                    { required: true, whitespace: true },
                    { max: 64 },
                    { pattern: /^[A-Za-z0-9_.@-]+$/ },
                  ]}
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
                      ? t('system.userAccountEditor.checkingLoginName')
                      : loginNameValidationMessage || undefined
                  }
                >
                  <Input
                    placeholder={t(
                      'system.userAccountEditor.loginNamePlaceholder',
                    )}
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
              <Col xs={24} sm={12}>
                <Form.Item
                  name="userName"
                  label={t('system.userAccountEditor.userName')}
                  rules={[{ required: true, whitespace: true }, { max: 64 }]}
                >
                  <Input
                    placeholder={t(
                      'system.userAccountEditor.userNamePlaceholder',
                    )}
                    maxLength={64}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[24, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="mobile"
                  label={t('system.userAccountEditor.mobile')}
                  rules={[{ max: 32 }, { pattern: /^$|^1\d{10}$/ }]}
                >
                  <Input
                    placeholder={t(
                      'system.userAccountEditor.mobilePlaceholder',
                    )}
                    maxLength={32}
                  />
                </Form.Item>
              </Col>
              {isCreate ? (
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="password"
                    label={t('system.userAccountEditor.initialPassword')}
                    extra={t('system.userAccountEditor.passwordHint')}
                    rules={[{ max: 128 }]}
                  >
                    <Input.Password
                      placeholder={t(
                        'system.userAccountEditor.passwordPlaceholder',
                      )}
                      maxLength={128}
                    />
                  </Form.Item>
                </Col>
              ) : (
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="status"
                    label={t('system.userAccountEditor.status')}
                  >
                    <Select
                      placeholder={t(
                        'system.userAccountEditor.statusPlaceholder',
                      )}
                      options={enabledStatusOptions}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>
            <Row gutter={[24, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="departmentId"
                  label={t('system.userAccountEditor.department')}
                  rules={[{ required: true }]}
                >
                  <Select
                    showSearch={{ optionFilterProp: 'label' }}
                    placeholder={t(
                      'system.userAccountEditor.departmentPlaceholder',
                    )}
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
            <div className="form-section-title">
              {t('system.userAccountEditor.permConfig')}
            </div>
            <Row gutter={[24, 0]}>
              <Col xs={24} md={isCreate ? 18 : 24}>
                <Form.Item
                  name="roleIds"
                  label={t('system.userAccountEditor.roles')}
                  extra={
                    isEditingOwnAccount
                      ? t('system.userAccountEditor.ownRolesLocked')
                      : undefined
                  }
                  getValueFromEvent={(ids: (string | number)[]) =>
                    ids?.map(String)
                  }
                >
                  <Select
                    mode="multiple"
                    placeholder={t('system.userAccountEditor.rolesPlaceholder')}
                    maxTagCount={5}
                    disabled={isEditingOwnAccount}
                    options={roleOptions.map((role) => {
                      const roleId = String(role.id)
                      const isSelected = selectedRoleIds.includes(roleId)
                      const isDisabled =
                        role.status === enabledStatusValues[1] && !isSelected
                      const hasConflict =
                        !isSelected && selectedRoleConflictIds.has(roleId)
                      const isUnassignable =
                        !isSelected && role.assignable === false
                      return {
                        label: hasConflict
                          ? `${role.roleName} ${t('system.userAccountEditor.roleConflict')}`
                          : isUnassignable
                            ? `${role.roleName} (${t('common.noPermission')})`
                            : role.roleName,
                        value: roleId,
                        disabled: isDisabled || hasConflict || isUnassignable,
                      }
                    })}
                  />
                </Form.Item>
              </Col>
              {isCreate && (
                <Col xs={24} md={6}>
                  <Form.Item
                    name="status"
                    label={t('system.userAccountEditor.status2')}
                  >
                    <Select
                      placeholder={t(
                        'system.userAccountEditor.statusPlaceholder2',
                      )}
                      options={enabledStatusOptions}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>
            <Form.Item label={t('system.userAccountEditor.permSummary')}>
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
                  {t('system.userAccountEditor.permSummaryHint')}
                </Typography.Text>
              )}
            </Form.Item>
          </div>
          <div className="form-section">
            <div className="form-section-title">
              {t('system.userAccountEditor.supplementInfo')}
            </div>
            <Form.Item
              name="remark"
              label={t('system.userAccountEditor.remark')}
              rules={[{ max: 255 }]}
            >
              <Input.TextArea
                rows={2}
                maxLength={255}
                placeholder={t('system.userAccountEditor.remarkPlaceholder')}
              />
            </Form.Item>
          </div>
        </Form>
      </Spin>
    </FormModal>
  )
}
