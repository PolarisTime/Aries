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
import { useTranslation } from 'react-i18next'
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
  selectedRoleIds: number[]
  roleConflicts?: Record<number, number[]>
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
  selectedRoleIds,
  roleConflicts = {},
  selectedRoleDataScope,
  selectedRoleSummaries,
  onCheckLoginName,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const isCreate = mode === 'create'
  const roleDataScopeId = buildFormControlId(
    'user-account-editor',
    'data-scope',
  )
  return (
    <FormModal
      title={isCreate ? t('system.userAccountEditor.createTitle') : t('system.userAccountEditor.editTitle')}
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      width={760}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" className="user-account-form">
          <div className="form-section">
            <div className="form-section-title">{t('system.userAccountEditor.accountInfo')}</div>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="loginName"
                  label={t('system.userAccountEditor.loginName')}
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
                      ? t('system.userAccountEditor.checkingLoginName')
                      : loginNameValidationMessage || undefined
                  }
                >
                  <Input
                    placeholder={t('system.userAccountEditor.loginNamePlaceholder')}
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
                <Form.Item name="userName" label={t('system.userAccountEditor.userName')} required>
                  <Input placeholder={t('system.userAccountEditor.userNamePlaceholder')} maxLength={64} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="mobile" label={t('system.userAccountEditor.mobile')}>
                  <Input placeholder={t('system.userAccountEditor.mobilePlaceholder')} maxLength={32} />
                </Form.Item>
              </Col>
              {isCreate ? (
                <Col span={12}>
                  <Form.Item
                    name="password"
                    label={t('system.userAccountEditor.initialPassword')}
                    extra={t('system.userAccountEditor.passwordHint')}
                  >
                    <Input.Password
                      placeholder={t('system.userAccountEditor.passwordPlaceholder')}
                      maxLength={128}
                    />
                  </Form.Item>
                </Col>
              ) : (
                <Col span={12}>
                  <Form.Item name="status" label={t('system.userAccountEditor.status')}>
                    <Select
                      placeholder={t('system.userAccountEditor.statusPlaceholder')}
                      options={enabledStatusOptions}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="departmentId" label={t('system.userAccountEditor.department')} required>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder={t('system.userAccountEditor.departmentPlaceholder')}
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
            <div className="form-section-title">{t('system.userAccountEditor.permConfig')}</div>
            <Row gutter={24}>
              <Col span={isCreate ? 16 : 14}>
                <Form.Item name="roleIds" label={t('system.userAccountEditor.roles')} required
                  getValueFromEvent={(ids: (string | number)[]) => ids?.map(Number)}
                >
                  <Select
                    mode="multiple"
                    placeholder={t('system.userAccountEditor.rolesPlaceholder')}
                    maxTagCount={5}
                    options={roleOptions.map((role) => {
                      const roleId = Number(role.id)
                      const isDisabled =
                        role.status === enabledStatusValues[1] &&
                        !selectedRoleIds.includes(roleId)
                      const conflictWith = selectedRoleIds.find(
                        (sid) => roleConflicts?.[sid]?.includes(roleId),
                      )
                      return {
                        label: conflictWith != null
                          ? `${role.roleName} ${t('system.userAccountEditor.roleConflict')}`
                          : role.roleName,
                        value: role.id,
                        disabled: isDisabled || conflictWith != null,
                      }
                    })}
                  />
                </Form.Item>
              </Col>
              <Col span={isCreate ? 8 : 5}>
                <Form.Item
                  {...buildLabeledFormItemProps({
                    label: t('system.userAccountEditor.roleDataScope'),
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
                  <Form.Item name="status" label={t('system.userAccountEditor.status2')}>
                    <Select
                      placeholder={t('system.userAccountEditor.statusPlaceholder2')}
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
            <div className="form-section-title">{t('system.userAccountEditor.supplementInfo')}</div>
            <Form.Item name="remark" label={t('system.userAccountEditor.remark')}>
              <Input.TextArea rows={2} placeholder={t('system.userAccountEditor.remarkPlaceholder')} />
            </Form.Item>
          </div>
        </Form>
      </Spin>
    </FormModal>
  )
}
