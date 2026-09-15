import { LockOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Button,
  Col,
  Form,
  Input,
  Row,
  Select,
  Skeleton,
  Typography,
} from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  changeCurrentAccountPassword,
  getCurrentAccount,
  updateCurrentAccount,
} from '@/api/system/account'
import { listRoles } from '@/api/system/roles'
import { getUserRoles, updateUserRoles } from '@/api/system/user-roles'
import { AppProPage } from '@/components/AppProPage'
import { AppResult } from '@/components/AppResult'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useRequestError } from '@/hooks/useRequestError'
import type {
  CurrentAccountUpdate,
  PasswordChange,
} from '@/shared/schemas/current-account'
import { useAuthStore } from '@/stores/authStore'
import { message } from '@/utils/antd-app'
import {
  focusFirstInvalidField,
  readAntdFormValidationErrorFields,
} from '@/utils/form-control-a11y'

interface AccountProfileFormValues {
  userName: string
  mobile: string
  remark: string
}

interface PasswordFormValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface RolesFormValues {
  roleIds: string[]
}

const ROLE_OPTIONS_PAGE_SIZE = 200

export function AccountView(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const signOut = useAuthStore((state) => state.signOut)
  const updateUserProfile = useAuthStore((state) => state.updateUserProfile)
  const [profileForm] = Form.useForm<AccountProfileFormValues>()
  const [passwordForm] = Form.useForm<PasswordFormValues>()
  const [rolesForm] = Form.useForm<RolesFormValues>()

  const accountQuery = useQuery({
    queryKey: QUERY_KEYS.currentAccount,
    queryFn: getCurrentAccount,
  })
  const accountId = accountQuery.data?.id ?? ''

  const userRolesQuery = useQuery({
    queryKey: QUERY_KEYS.userRoles(accountId),
    queryFn: ({ signal }) => getUserRoles(accountId, signal),
    enabled: Boolean(accountId),
  })
  const roleOptionsQuery = useQuery({
    queryKey: QUERY_KEYS.roles({
      keyword: '',
      status: undefined,
      page: 0,
      size: ROLE_OPTIONS_PAGE_SIZE,
    }),
    queryFn: ({ signal }) =>
      listRoles({ page: 0, size: ROLE_OPTIONS_PAGE_SIZE }, signal),
  })

  useEffect(() => {
    if (!accountQuery.data) {
      return
    }
    profileForm.setFieldsValue({
      userName: accountQuery.data.userName,
      mobile: accountQuery.data.mobile ?? '',
      remark: accountQuery.data.remark ?? '',
    })
  }, [accountQuery.data, profileForm])

  useEffect(() => {
    if (!userRolesQuery.data) {
      return
    }
    rolesForm.setFieldsValue({ roleIds: userRolesQuery.data })
  }, [userRolesQuery.data, rolesForm])

  const profileMutation = useMutation({
    mutationFn: updateCurrentAccount,
    onSuccess: (account) => {
      queryClient.setQueryData(QUERY_KEYS.currentAccount, account)
      updateUserProfile(account.userName)
      message.success(t('system.account.profileSaved'))
    },
    onError: (error: Error) => {
      showError(error, t('system.account.profileSaveFailed'))
    },
  })

  const passwordMutation = useMutation({
    mutationFn: changeCurrentAccountPassword,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.currentAccount,
      })
      passwordForm.resetFields()
      message.success(t('system.account.passwordChanged'))
      await signOut()
      void navigate({ to: '/login', replace: true })
    },
    onError: (error: Error) => {
      showError(error, t('system.account.passwordChangeFailed'))
    },
  })

  const rolesMutation = useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
      updateUserRoles(id, roleIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userRoles(accountId),
      })
      await queryClient.invalidateQueries({ queryKey: ['roles'] })
      message.success(t('system.account.rolesSaved'))
    },
    onError: (error: Error) => {
      showError(error, t('system.account.rolesSaveFailed'))
    },
  })

  const saveProfile = async (): Promise<void> => {
    try {
      const values = await profileForm.validateFields()
      const payload: CurrentAccountUpdate = {
        userName: values.userName,
        mobile: values.mobile,
        remark: values.remark,
      }
      profileMutation.mutate(payload)
    } catch (error) {
      const errorFields = readAntdFormValidationErrorFields(error)
      if (errorFields) {
        focusFirstInvalidField(profileForm, errorFields)
      }
    }
  }

  const changePassword = async (): Promise<void> => {
    try {
      const values = await passwordForm.validateFields()
      if (values.newPassword !== values.confirmPassword) {
        passwordForm.setFields([
          {
            name: 'confirmPassword',
            errors: [t('system.account.passwordMismatch')],
          },
        ])
        passwordForm.focusField?.('confirmPassword')
        return
      }
      const payload: PasswordChange = {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }
      passwordMutation.mutate(payload)
    } catch (error) {
      const errorFields = readAntdFormValidationErrorFields(error)
      if (errorFields) {
        focusFirstInvalidField(passwordForm, errorFields)
      }
    }
  }

  const saveRoles = async (): Promise<void> => {
    try {
      const values = await rolesForm.validateFields()
      if (!accountId) return
      rolesMutation.mutate({ id: accountId, roleIds: values.roleIds ?? [] })
    } catch (error) {
      const errorFields = readAntdFormValidationErrorFields(error)
      if (errorFields) {
        focusFirstInvalidField(rolesForm, errorFields)
      }
    }
  }

  return (
    <AppProPage title={t('system.account.title')}>
      <div className="page-stack account-page">
        {accountQuery.isPending ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : accountQuery.isError || !accountQuery.data ? (
          <AppResult
            status="error"
            title={t('api.loadCurrentAccountFailed')}
            subTitle={t('result.error.subTitle')}
            extra={
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={accountQuery.isFetching}
                onClick={() => {
                  void accountQuery.refetch()
                }}
              >
                {t('errorBoundary.retry')}
              </Button>
            }
          />
        ) : (
          <>
            <section className="account-section">
              <h2 className="account-section-title">
                {t('system.account.profileSection')}
              </h2>
              <Form
                form={profileForm}
                layout="vertical"
                className="account-form"
              >
                <Row gutter={[24, 0]}>
                  <Col span={12}>
                    <Form.Item label={t('system.account.loginName')}>
                      <Input
                        value={accountQuery.data?.loginName ?? ''}
                        disabled
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="userName"
                      label={t('system.account.userName')}
                      rules={[
                        { required: true, whitespace: true },
                        { max: 64 },
                      ]}
                    >
                      <Input maxLength={64} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[24, 0]}>
                  <Col span={12}>
                    <Form.Item
                      name="mobile"
                      label={t('system.account.mobile')}
                      rules={[{ max: 32 }, { pattern: /^$|^1\d{10}$/ }]}
                    >
                      <Input maxLength={32} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="remark"
                      label={t('system.account.remark')}
                      rules={[{ max: 255 }]}
                    >
                      <Input maxLength={255} />
                    </Form.Item>
                  </Col>
                </Row>
                <div className="account-form-actions">
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={profileMutation.isPending}
                    onClick={() => {
                      void saveProfile()
                    }}
                  >
                    {t('system.account.saveProfile')}
                  </Button>
                </div>
              </Form>
            </section>

            <section className="account-section">
              <h2 className="account-section-title">
                {t('system.account.passwordSection')}
              </h2>
              <Form
                form={passwordForm}
                layout="vertical"
                className="account-form"
              >
                <Row gutter={[24, 0]}>
                  <Col span={8}>
                    <Form.Item
                      name="currentPassword"
                      label={t('system.account.currentPassword')}
                      rules={[{ required: true }, { max: 128 }]}
                    >
                      <Input.Password autoComplete="current-password" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="newPassword"
                      label={t('system.account.newPassword')}
                      rules={[{ required: true }, { min: 8 }, { max: 128 }]}
                    >
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="confirmPassword"
                      label={t('system.account.confirmPassword')}
                      rules={[{ required: true }, { min: 8 }, { max: 128 }]}
                    >
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                  </Col>
                </Row>
                <div className="account-form-actions">
                  <Button
                    icon={<LockOutlined />}
                    loading={passwordMutation.isPending}
                    onClick={() => {
                      void changePassword()
                    }}
                  >
                    {t('system.account.changePassword')}
                  </Button>
                </div>
              </Form>
            </section>

            <section className="account-section">
              <h2 className="account-section-title">
                {t('system.account.rolesSection')}
              </h2>
              <Typography.Paragraph type="secondary">
                {t('system.account.rolesHint')}
              </Typography.Paragraph>
              <Form form={rolesForm} layout="vertical" className="account-form">
                <Form.Item
                  name="roleIds"
                  label={t('system.account.rolesLabel')}
                >
                  <Select
                    mode="multiple"
                    allowClear
                    loading={roleOptionsQuery.isPending}
                    placeholder={t('system.account.rolesPlaceholder')}
                    options={(roleOptionsQuery.data?.content ?? []).map(
                      (role) => ({
                        value: role.id,
                        label: `${role.name} (${role.code})`,
                      }),
                    )}
                  />
                </Form.Item>
                <div className="account-form-actions">
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={rolesMutation.isPending}
                    onClick={() => {
                      void saveRoles()
                    }}
                  >
                    {t('system.account.saveRoles')}
                  </Button>
                </div>
              </Form>
            </section>
          </>
        )}
      </div>
    </AppProPage>
  )
}
