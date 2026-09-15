import { Form, Input, Modal, Select } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  UserAccountResponse,
  UserFormValues,
  UserUpdatePayload,
} from '@/shared/schemas'
import {
  buildUserCreatePayload,
  buildUserUpdatePayload,
  emptyUserFormValues,
  userToFormValues,
} from '@/views/system/user-account-form-utils'

interface Props {
  open: boolean
  user: UserAccountResponse | null
  saving: boolean
  onSave: (payload: UserUpdatePayload) => void
  onClose: () => void
}

export function UserAccountEditorModal({
  open,
  user,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<UserFormValues>()
  const editing = Boolean(user)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue(user ? userToFormValues(user) : emptyUserFormValues())
  }, [form, open, user])

  const statusOptions = [
    { value: 'NORMAL', label: t('system.userAccount.statusNormal') },
    { value: 'DISABLED', label: t('system.userAccount.statusDisabled') },
  ]

  const handleOk = async () => {
    const values = await form.validateFields()
    onSave(
      editing ? buildUserUpdatePayload(values) : buildUserCreatePayload(values),
    )
  }

  return (
    <Modal
      open={open}
      title={
        editing
          ? t('system.userAccount.editUser')
          : t('system.userAccount.newUser')
      }
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      onOk={() => {
        void handleOk()
      }}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="loginName"
          label={t('system.userAccount.loginName')}
          rules={[
            { required: true, whitespace: true },
            { max: 64 },
            { pattern: /^[A-Za-z0-9][A-Za-z0-9_.@-]*$/ },
          ]}
        >
          <Input
            maxLength={64}
            disabled={editing}
            autoComplete="off"
            placeholder={t('system.userAccount.loginNamePlaceholder')}
          />
        </Form.Item>
        <Form.Item
          name="userName"
          label={t('system.userAccount.userName')}
          rules={[{ required: true, whitespace: true }, { max: 64 }]}
        >
          <Input
            maxLength={64}
            placeholder={t('system.userAccount.userNamePlaceholder')}
          />
        </Form.Item>
        {editing ? null : (
          <Form.Item
            name="password"
            label={t('system.userAccount.password')}
            rules={[
              { required: true },
              { min: 8 },
              { max: 128 },
              {
                pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                message: t('system.userAccount.passwordStrength'),
              },
            ]}
          >
            <Input.Password
              maxLength={128}
              autoComplete="new-password"
              placeholder={t('system.userAccount.passwordPlaceholder')}
            />
          </Form.Item>
        )}
        <Form.Item
          name="mobile"
          label={t('system.userAccount.mobile')}
          rules={[{ max: 20 }, { pattern: /^$|^1\d{10}$/ }]}
        >
          <Input
            maxLength={20}
            placeholder={t('system.userAccount.mobilePlaceholder')}
          />
        </Form.Item>
        <Form.Item
          name="status"
          label={t('system.userAccount.status')}
          rules={[{ required: true }]}
        >
          <Select options={statusOptions} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
