import { EditOutlined } from '@ant-design/icons'
import { Card, Col, Form, Input, Row, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { STATUS } from '@/constants/status-constants'

interface Props {
  canSave: boolean
}
export function CompanySubjectCard({ canSave }: Props) {
  const { t } = useTranslation()
  return (
    <Card
      className="system-list-card"
      size="small"
      title={
        <span>
          <EditOutlined /> {t('system.companySubject.sectionTitle')}
        </span>
      }
    >
      <Row gutter={[16, 0]}>
        <Col xs={24} md={10}>
          <Form.Item
            name="companyName"
            label={t('system.companySubject.companyName')}
            rules={[{ required: true, whitespace: true }]}
          >
            <Input
              disabled={!canSave}
              placeholder={t('system.companySubject.companyNamePlaceholder')}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={10}>
          <Form.Item
            name="taxNo"
            label={t('system.companySubject.taxNo')}
            rules={[{ required: true, whitespace: true }]}
          >
            <Input
              disabled={!canSave}
              placeholder={t('system.companySubject.taxNoPlaceholder')}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={4}>
          <Form.Item
            name="status"
            label={t('system.companySubject.status')}
            required
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
    </Card>
  )
}
