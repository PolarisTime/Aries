import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Flex,
  Form,
  Input,
  List,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type CompanySettingProfile,
  createCompanySetting,
  deleteCompanySetting,
  listCompanySettings,
  updateCompanySetting,
} from '@/api/company-settings'
import { QUERY_KEYS } from '@/constants/query-keys'
import { SETTLEMENT_TYPE, STATUS } from '@/constants/status-constants'
import { useRequestError } from '@/hooks/useRequestError'
import { validateForm } from '@/lib/antd-form'
import { usePermissionStore } from '@/stores/permissionStore'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import {
  createEmptySettlementAccount,
  normalizeSettlementAccounts,
  type SettlementAccountFormRow,
} from '@/views/system/company-settings-view-utils'

type CompanySettingFormValues = {
  id?: string
  companyName: string
  taxNo: string
  status: string
  remark?: string
  settlementAccounts: SettlementAccountFormRow[]
  [key: string]: unknown
}

function buildCompanySettingFormValues(
  profile: CompanySettingProfile | null,
): CompanySettingFormValues {
  return {
    id: profile?.id,
    companyName: profile?.companyName ?? '',
    taxNo: profile?.taxNo ?? '',
    status: profile?.status || STATUS.NORMAL,
    remark: profile?.remark || '',
    settlementAccounts: normalizeSettlementAccounts(
      profile?.settlementAccounts,
    ),
  }
}

function normalizeSubmittedSettlementAccounts(
  accounts: SettlementAccountFormRow[],
) {
  const normalizedAccounts = []
  for (const account of accounts) {
    const accountName = asString(account.accountName).trim()
    const bankName = asString(account.bankName).trim()
    const bankAccount = asString(account.bankAccount).trim()
    const remark = asString(account.remark).trim()
    if (!accountName && !bankName && !bankAccount && !remark) {
      continue
    }
    normalizedAccounts.push({
      id:
        account.id == null || account.id === ''
          ? undefined
          : String(account.id),
      accountName,
      bankName,
      bankAccount,
      usageType: asString(account.usageType).trim() || SETTLEMENT_TYPE.GENERAL,
      status: asString(account.status).trim() || STATUS.NORMAL,
      remark,
    })
  }
  return normalizedAccounts
}

function buildPayload(values: CompanySettingFormValues) {
  const settlementAccounts = normalizeSubmittedSettlementAccounts(
    values.settlementAccounts || [],
  )
  return {
    companyName: values.companyName.trim(),
    taxNo: values.taxNo.trim(),
    settlementAccounts,
    status: values.status || STATUS.NORMAL,
    remark: values.remark?.trim() || '',
  }
}

interface CompanySettingsPageHeaderProps {
  loading: boolean
  canSave: boolean
  saving: boolean
  onRefresh: () => void
  onSave: () => void
}

function CompanySettingsPageHeader({
  loading,
  canSave,
  saving,
  onRefresh,
  onSave,
}: CompanySettingsPageHeaderProps) {
  const { t } = useTranslation()
  return (
    <Flex
      className="company-settings-page-header"
      align="center"
      justify="space-between"
      gap={12}
      wrap="wrap"
    >
      <div className="company-settings-page-title">
        <Typography.Title level={4} className="m-0">
          {t('system.companyHeader.title')}
        </Typography.Title>
        <Typography.Text type="secondary">
          {t('system.companyHeader.description')}
        </Typography.Text>
      </div>
      <Space size={8} wrap>
        <Button loading={loading} icon={<ReloadOutlined />} onClick={onRefresh}>
          {t('common.refresh')}
        </Button>
        {canSave ? (
          <Button
            type="primary"
            loading={saving}
            icon={<SaveOutlined />}
            onClick={onSave}
          >
            {t('common.save')}
          </Button>
        ) : null}
      </Space>
    </Flex>
  )
}

interface CompanySubjectListProps {
  companies: CompanySettingProfile[]
  selectedId: string
  canCreate: boolean
  canDelete: boolean
  deletingId: string | null
  onCreate: () => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

function CompanySubjectList({
  companies,
  selectedId,
  canCreate,
  canDelete,
  deletingId,
  onCreate,
  onDelete,
  onSelect,
}: CompanySubjectListProps) {
  const { t } = useTranslation()
  return (
    <Card
      size="small"
      className="company-subject-selector-card"
      title={t('system.company.subjectList')}
      extra={
        canCreate ? (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            {t('system.company.addSubject')}
          </Button>
        ) : null
      }
    >
      {companies.length > 0 ? (
        <List
          className="company-subject-selector-list"
          dataSource={companies}
          rowKey={(item) => item.id}
          split={false}
          renderItem={(item) => {
            const active = item.id === selectedId
            return (
              <List.Item
                className={`company-subject-selector-item${active ? ' is-active' : ''}`}
                key={item.id}
                actions={
                  canDelete
                    ? [
                        <Popconfirm
                          key="delete"
                          title={t('system.company.deleteSubject')}
                          description={t('system.company.deleteSubjectConfirm')}
                          okText={t('common.confirm')}
                          cancelText={t('common.cancel')}
                          onConfirm={() => onDelete(item.id)}
                        >
                          <Button
                            danger
                            type="text"
                            size="small"
                            loading={deletingId === item.id}
                            icon={<DeleteOutlined />}
                            aria-label={t('system.company.deleteSubject')}
                            onClick={(event) => event.stopPropagation()}
                          />
                        </Popconfirm>,
                      ]
                    : undefined
                }
              >
                <button
                  type="button"
                  className="company-subject-selector-main"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onSelect(item.id)}
                >
                  <Space size={8} wrap>
                    <Typography.Text strong={active}>
                      {item.companyName ||
                        t('system.companySubject.pendingCompany')}
                    </Typography.Text>
                    <Tag
                      color={
                        item.status === STATUS.NORMAL ? 'processing' : 'default'
                      }
                    >
                      {item.status || STATUS.NORMAL}
                    </Tag>
                  </Space>
                  <Typography.Text type="secondary">
                    {item.taxNo || t('system.companySubject.pendingTaxNo')}
                  </Typography.Text>
                </button>
              </List.Item>
            )
          }}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('system.company.noSubjects')}
        />
      )}
    </Card>
  )
}

function SubjectProfileFields({ canSave }: { canSave: boolean }) {
  const { t } = useTranslation()
  return (
    <Row gutter={[16, 0]}>
      <Col xs={24} md={12}>
        <Form.Item
          name="companyName"
          label={t('system.companySubject.companyName')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('system.companySubject.companyNamePlaceholder'),
            },
          ]}
        >
          <Input
            allowClear
            disabled={!canSave}
            placeholder={t('system.companySubject.companyNamePlaceholder')}
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          name="taxNo"
          label={t('system.companySubject.taxNo')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('system.companySubject.taxNoPlaceholder'),
            },
          ]}
        >
          <Input
            allowClear
            disabled={!canSave}
            placeholder={t('system.companySubject.taxNoPlaceholder')}
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          name="status"
          label={t('system.companySubject.status')}
          rules={[
            {
              required: true,
              message: t('system.companySubject.status'),
            },
          ]}
        >
          <Select
            disabled={!canSave}
            options={[
              {
                label: t('system.companySubject.statusNormal'),
                value: STATUS.NORMAL,
              },
              {
                label: t('system.companySubject.statusDisabled'),
                value: STATUS.DISABLED,
              },
            ]}
          />
        </Form.Item>
      </Col>
    </Row>
  )
}

function SettlementAccountsTable({ canSave }: { canSave: boolean }) {
  const { t } = useTranslation()
  return (
    <Form.List name="settlementAccounts">
      {(fields, { add, remove }) => {
        const columns: TableColumnsType<(typeof fields)[number]> = [
          {
            title: t('system.company.accountName'),
            dataIndex: 'accountName',
            width: 150,
            render: (_, field) => (
              <>
                <Form.Item name={[field.name, 'id']} hidden>
                  <Input />
                </Form.Item>
                <Form.Item
                  name={[field.name, 'accountName']}
                  className="company-settings-table-form-item"
                >
                  <Input
                    allowClear
                    disabled={!canSave}
                    placeholder={t('system.company.accountNamePlaceholder')}
                  />
                </Form.Item>
              </>
            ),
          },
          {
            title: t('system.company.usageType'),
            dataIndex: 'usageType',
            width: 110,
            render: (_, field) => (
              <Form.Item
                name={[field.name, 'usageType']}
                className="company-settings-table-form-item"
              >
                <Select
                  disabled={!canSave}
                  options={[
                    {
                      label: t('system.company.usageGeneral'),
                      value: SETTLEMENT_TYPE.GENERAL,
                    },
                    {
                      label: t('system.company.usageReceive'),
                      value: SETTLEMENT_TYPE.RECEIPT,
                    },
                    {
                      label: t('system.company.usagePay'),
                      value: SETTLEMENT_TYPE.PAYMENT,
                    },
                  ]}
                />
              </Form.Item>
            ),
          },
          {
            title: t('system.company.bankName'),
            dataIndex: 'bankName',
            width: 180,
            render: (_, field) => (
              <Form.Item
                name={[field.name, 'bankName']}
                className="company-settings-table-form-item"
              >
                <Input
                  allowClear
                  disabled={!canSave}
                  placeholder={t('system.company.bankNamePlaceholder')}
                />
              </Form.Item>
            ),
          },
          {
            title: t('system.company.bankAccount'),
            dataIndex: 'bankAccount',
            width: 190,
            render: (_, field) => (
              <Form.Item
                name={[field.name, 'bankAccount']}
                className="company-settings-table-form-item"
              >
                <Input
                  allowClear
                  disabled={!canSave}
                  placeholder={t('system.company.bankAccountPlaceholder')}
                />
              </Form.Item>
            ),
          },
          {
            title: t('common.status'),
            dataIndex: 'status',
            width: 100,
            render: (_, field) => (
              <Form.Item
                name={[field.name, 'status']}
                className="company-settings-table-form-item"
              >
                <Select
                  disabled={!canSave}
                  options={[
                    {
                      label: t('system.company.statusNormal'),
                      value: STATUS.NORMAL,
                    },
                    {
                      label: t('system.company.statusDisabled'),
                      value: STATUS.DISABLED,
                    },
                  ]}
                />
              </Form.Item>
            ),
          },
          {
            title: t('common.remark'),
            dataIndex: 'remark',
            width: 180,
            render: (_, field) => (
              <Form.Item
                name={[field.name, 'remark']}
                className="company-settings-table-form-item"
              >
                <Input
                  allowClear
                  disabled={!canSave}
                  placeholder={t('system.company.remarkPlaceholder')}
                />
              </Form.Item>
            ),
          },
          {
            title: t('common.operation'),
            key: 'action',
            width: 72,
            align: 'center',
            fixed: 'right',
            render: (_, field) => (
              <Button
                danger
                type="text"
                size="small"
                disabled={!canSave}
                icon={<DeleteOutlined />}
                onClick={() => remove(field.name)}
              />
            ),
          },
        ]

        return (
          <div className="company-settings-bank-section">
            <Table
              size="small"
              bordered
              rowKey="key"
              columns={columns}
              dataSource={fields}
              pagination={false}
              scroll={{ x: 980 }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('system.company.noSettlementAccounts')}
                  >
                    {canSave ? (
                      <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => add(createEmptySettlementAccount())}
                      >
                        {t('system.company.addBank')}
                      </Button>
                    ) : null}
                  </Empty>
                ),
              }}
            />
          </div>
        )
      }}
    </Form.List>
  )
}

function CompanyRemarkField({ canSave }: { canSave: boolean }) {
  const { t } = useTranslation()
  return (
    <Form.Item name="remark" className="mb-0">
      <Input.TextArea
        allowClear
        disabled={!canSave}
        rows={5}
        placeholder={t('system.company.subjectRemarkPlaceholder')}
      />
    </Form.Item>
  )
}

interface CompanySettingsFormProps {
  permissions: {
    view: boolean
    create: boolean
    save: boolean
    delete: boolean
  }
  companies: CompanySettingProfile[]
  isLoading: boolean
  selectedId: string
  onRefresh: () => void
  onSelect: (id: string) => void
  onSelectSaved: (id: string) => void
  onCreateDraft: () => void
}

function CompanySettingsForm({
  permissions,
  companies,
  isLoading,
  selectedId,
  onRefresh,
  onSelect,
  onSelectSaved,
  onCreateDraft,
}: CompanySettingsFormProps) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const [form] = Form.useForm<CompanySettingFormValues>()
  const selectedProfile = useMemo(
    () => companies.find((item) => item.id === selectedId) ?? null,
    [companies, selectedId],
  )
  const isDraft = selectedId === 'new'
  const canEditCurrent = isDraft ? permissions.create : permissions.save
  const initialValues = useMemo(
    () => buildCompanySettingFormValues(selectedProfile),
    [selectedProfile],
  )

  useEffect(() => {
    form.setFieldsValue(initialValues)
  }, [form, initialValues])

  const handleAddSettlementAccount = () => {
    const current = form.getFieldValue('settlementAccounts')
    form.setFieldValue('settlementAccounts', [
      ...(Array.isArray(current) ? current : []),
      createEmptySettlementAccount(),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: async (values: CompanySettingFormValues) => {
      const payload = buildPayload(values)
      return isDraft
        ? createCompanySetting(payload)
        : updateCompanySetting(selectedId, payload)
    },
    onSuccess: (data) => {
      message.success(t('common.saveSuccess'))
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySettings,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySetting,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.masterOptions.settlementCompany,
      })
      if (data?.id) {
        onSelectSaved(data.id)
      }
    },
    onError: (err: Error) => showError(err, t('api.saveCompanyInfoFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCompanySetting,
    onSuccess: (_, deletedId) => {
      message.success(t('common.deleteSuccess'))
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySettings,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySetting,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.masterOptions.settlementCompany,
      })
      if (selectedId === deletedId) {
        const next = companies.find((item) => item.id !== deletedId)
        onSelectSaved(next?.id ?? '')
      }
    },
    onError: (err: Error) => showError(err, t('common.deleteConfirm')),
  })

  const handleSave = async () => {
    if (!canEditCurrent) {
      message.warning(t('common.noPermission'))
      return
    }

    try {
      const values = await validateForm<CompanySettingFormValues>(form)
      const settlementAccounts = normalizeSubmittedSettlementAccounts(
        values.settlementAccounts || [],
      )
      const usedBankAccounts = new Set<string>()
      for (const account of settlementAccounts) {
        const bankAccount = account.bankAccount.trim()
        if (!bankAccount) {
          continue
        }
        if (usedBankAccounts.has(bankAccount)) {
          message.warning(
            t('system.company.duplicateBankAccount', { account: bankAccount }),
          )
          return
        }
        usedBankAccounts.add(bankAccount)
      }
      saveMutation.mutate(values)
    } catch {
      /* validation failed */
    }
  }

  const collapseItems = [
    {
      key: 'profile',
      label: t('system.companySubject.sectionTitle'),
      children: <SubjectProfileFields canSave={canEditCurrent} />,
    },
    {
      key: 'banks',
      label: t('system.company.settlementBanks'),
      extra: canEditCurrent ? (
        <Button
          type="link"
          size="small"
          icon={<PlusOutlined />}
          onClick={(event) => {
            event.stopPropagation()
            handleAddSettlementAccount()
          }}
        >
          {t('system.company.addBank')}
        </Button>
      ) : null,
      children: <SettlementAccountsTable canSave={canEditCurrent} />,
    },
    {
      key: 'remark',
      label: t('system.company.supplementNote'),
      children: <CompanyRemarkField canSave={canEditCurrent} />,
    },
  ]

  return (
    <div className="company-settings-page">
      <CompanySettingsPageHeader
        loading={isLoading}
        canSave={Boolean(selectedId) && canEditCurrent}
        saving={saveMutation.isPending}
        onRefresh={onRefresh}
        onSave={() => {
          void handleSave()
        }}
      />

      {!permissions.view ? (
        <Alert
          type="warning"
          showIcon
          title={t('common.noPermission')}
          description={t('system.company.noViewPermission')}
        />
      ) : null}

      {isLoading ? (
        <Card>
          <Skeleton active />
        </Card>
      ) : (
        <Row gutter={[12, 12]} align="top">
          <Col xs={24} lg={7} xl={6} xxl={5}>
            <CompanySubjectList
              companies={companies}
              selectedId={selectedId}
              canCreate={permissions.create}
              canDelete={permissions.delete}
              deletingId={
                deleteMutation.isPending
                  ? String(deleteMutation.variables ?? '')
                  : null
              }
              onCreate={onCreateDraft}
              onDelete={(id) => deleteMutation.mutate(id)}
              onSelect={onSelect}
            />
          </Col>
          <Col xs={24} lg={17} xl={18} xxl={19}>
            {selectedId ? (
              <Form
                key={selectedId}
                form={form}
                layout="vertical"
                initialValues={initialValues}
              >
                <Card className="company-settings-editor-card" size="small">
                  <Collapse
                    defaultActiveKey={['profile', 'banks', 'remark']}
                    size="small"
                    items={collapseItems}
                  />
                  <Flex
                    className="company-settings-footer-actions"
                    justify="flex-end"
                  >
                    <Button
                      type="primary"
                      loading={saveMutation.isPending}
                      disabled={!canEditCurrent}
                      icon={<SaveOutlined />}
                      onClick={() => {
                        void handleSave()
                      }}
                    >
                      {t('common.save')}
                    </Button>
                  </Flex>
                </Card>
              </Form>
            ) : (
              <Card>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('system.company.noSubjects')}
                >
                  {permissions.create ? (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={onCreateDraft}
                    >
                      {t('system.company.addSubject')}
                    </Button>
                  ) : null}
                </Empty>
              </Card>
            )}
          </Col>
        </Row>
      )}
    </div>
  )
}

export function CompanySettingsView() {
  const queryClient = useQueryClient()
  const permissionStore = usePermissionStore()
  const canView = permissionStore.can('company-setting', 'read')
  const canCreate = permissionStore.can('company-setting', 'create')
  const canSave = permissionStore.can('company-setting', 'update')
  const canDelete = permissionStore.can('company-setting', 'delete')
  const [selectedId, setSelectedId] = useState('')

  const { data: companies = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.companySettings,
    queryFn: listCompanySettings,
    enabled: canView,
  })

  const effectiveSelectedId = useMemo(() => {
    if (!canView) {
      return ''
    }
    if (selectedId === 'new') {
      return selectedId
    }
    if (companies.some((item) => item.id === selectedId)) {
      return selectedId
    }
    return companies[0]?.id ?? ''
  }, [canView, companies, selectedId])

  return (
    <CompanySettingsForm
      permissions={{
        view: canView,
        create: canCreate,
        save: canSave,
        delete: canDelete,
      }}
      companies={companies}
      isLoading={isLoading}
      selectedId={effectiveSelectedId}
      onRefresh={() => {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.companySettings,
        })
      }}
      onSelect={setSelectedId}
      onSelectSaved={setSelectedId}
      onCreateDraft={() => setSelectedId('new')}
    />
  )
}
