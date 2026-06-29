import { BankOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Typography,
} from 'antd'
import { useTranslation } from 'react-i18next'
import { SETTLEMENT_TYPE, STATUS } from '@/constants/status-constants'
import { createEmptySettlementAccount } from '@/views/system/company-settings-view-utils'

interface Props {
  canSave: boolean
}

export function CompanySettlementAccountsCard({ canSave }: Props) {
  const { t } = useTranslation()
  return (
    <Form.List name="settlementAccounts">
      {(fields, { add, remove }) => (
        <Card
          className="system-list-card"
          size="small"
          title={
            <div className="flex flex-wrap items-center justify-between gap-8">
              <div className="min-w-0">
                <Typography.Text strong>
                  <BankOutlined /> {t('system.company.settlementInfo')}
                </Typography.Text>
                <div>
                  <Typography.Text type="secondary">
                    {t('system.company.settlementAccountOptionalHint')}
                  </Typography.Text>
                </div>
              </div>
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
            {fields.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('system.company.noSettlementAccounts')}
              >
                {canSave ? (
                  <Button
                    type="default"
                    icon={<PlusOutlined />}
                    onClick={() => add(createEmptySettlementAccount())}
                  >
                    {t('system.company.addBank')}
                  </Button>
                ) : null}
              </Empty>
            ) : (
              fields.map((field, index) => (
                <div key={field.key} className="company-settlement-account-row">
                  <div className="mb-12 flex flex-wrap items-center justify-between gap-8">
                    <Typography.Text strong>
                      {t('system.company.settlementAccount')} {index + 1}
                    </Typography.Text>
                    {canSave ? (
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
                      >
                        <Input
                          disabled={!canSave}
                          placeholder={t(
                            'system.company.accountNamePlaceholder',
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name={[field.name, 'usageType']}
                        label={t('system.company.usageType')}
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
                      >
                        <Input
                          disabled={!canSave}
                          placeholder={t(
                            'system.company.bankAccountPlaceholder',
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name={[field.name, 'status']}
                        label={t('common.status')}
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
              ))
            )}
          </div>
        </Card>
      )}
    </Form.List>
  )
}
