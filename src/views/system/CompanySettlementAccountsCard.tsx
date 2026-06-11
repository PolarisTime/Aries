import { BankOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import { SETTLEMENT_TYPE, STATUS } from '@/constants/status-constants'
import { createEmptySettlementAccount } from '@/views/system/company-settings-view-utils'

interface Props {
  canSave: boolean
}

export function CompanySettlementAccountsCard({ canSave }: Props) {
  const { t } = useTranslation()
  return (
    <Form.List
      name="settlementAccounts"
      rules={[
        {
          validator: async (_, value: unknown[]) => {
            if (!value?.length) {
              throw new Error(t('system.company.atLeastOneSettlementAccount'))
            }
          },
        },
      ]}
    >
      {(fields, { add, remove }, { errors }) => (
        <Card
          size="small"
          title={
            <div className="flex flex-wrap items-center justify-between gap-8">
              <span>
                <BankOutlined /> {t('system.company.settlementInfo')}
              </span>
              {canSave ? (
                <Button
                  type="default"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => add(createEmptySettlementAccount())}
                >
                  {t('system.company.addBank')}
                </Button>
              ) : null}
            </div>
          }
        >
          <div className="flex flex-col gap-12">
            {fields.map((field, index) => (
              <div
                key={field.key}
                className="rounded border border-[var(--theme-card-border)] bg-default p-16"
              >
                <div className="mb-12 flex flex-wrap items-center justify-between gap-8">
                  <Typography.Text strong>
                    {t('system.company.settlementAccount')} {index + 1}
                  </Typography.Text>
                  {canSave && fields.length > 1 ? (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    >
                      {t('common.delete')}
                    </Button>
                  ) : null}
                </div>

                <Form.Item name={[field.name, 'id']} hidden>
                  <Input />
                </Form.Item>

                <Row gutter={[12, 0]}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name={[field.name, 'accountName']}
                      label={t('system.company.accountName')}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: t('system.company.inputAccountName', {
                            index: index + 1,
                          }),
                        },
                      ]}
                    >
                      <Input
                        disabled={!canSave}
                        placeholder={t('system.company.accountNamePlaceholder')}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name={[field.name, 'usageType']}
                      label={t('system.company.usageType')}
                      rules={[{ required: true }]}
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
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name={[field.name, 'bankName']}
                      label={t('system.company.bankName')}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: t('system.company.inputBankName', {
                            index: index + 1,
                          }),
                        },
                      ]}
                    >
                      <Input
                        disabled={!canSave}
                        placeholder={t('system.company.bankNamePlaceholder')}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[12, 0]}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name={[field.name, 'bankAccount']}
                      label={t('system.company.bankAccount')}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: t('system.company.inputBankAccount', {
                            index: index + 1,
                          }),
                        },
                      ]}
                    >
                      <Input
                        disabled={!canSave}
                        placeholder={t('system.company.bankAccountPlaceholder')}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name={[field.name, 'status']}
                      label={t('common.status')}
                      rules={[{ required: true }]}
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
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name={[field.name, 'remark']}
                      label={t('common.remark')}
                    >
                      <Input
                        disabled={!canSave}
                        placeholder={t('system.company.remarkPlaceholder')}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            ))}
            <Form.ErrorList errors={errors} />
          </div>
        </Card>
      )}
    </Form.List>
  )
}
