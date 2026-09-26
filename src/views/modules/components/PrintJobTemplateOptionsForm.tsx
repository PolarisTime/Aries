import type { FormInstance } from 'antd'
import {
  Checkbox,
  Empty,
  Flex,
  Form,
  InputNumber,
  Select,
  Typography,
} from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PrintTemplateRecord } from '@/shared/schemas'
import {
  isValidSplitPieceCount,
  type PrintJobFormValues,
} from '@/views/modules/components/print-job-modal-state'

interface Props {
  form: FormInstance<PrintJobFormValues>
  templates: PrintTemplateRecord[]
  templateOptions: Array<{ label: ReactNode; value: string }>
  isSalesOrder: boolean
}

/** 打印作业弹窗的模板选择与打印选项参数区。 */
export function PrintJobTemplateOptionsForm({
  form,
  templates,
  templateOptions,
  isSalesOrder,
}: Props) {
  const { t } = useTranslation()
  const selectedPrintOptions = Form.useWatch('printOptions', form) ?? []
  const splitPrintEnabled = selectedPrintOptions.includes('enableSplitPrint')

  return (
    <Form
      component={false}
      form={form}
      initialValues={{
        mergeMode: 'merge',
        printOptions: [],
      }}
    >
      <Flex align="center" gap="middle" wrap="wrap">
        <Typography.Text strong className="whitespace-nowrap">
          {t('modules.print.selectTemplate')}
        </Typography.Text>
        {templates.length ? (
          <Form.Item name="templateId" noStyle>
            <Select
              options={templateOptions}
              style={{ width: 220 }}
              variant="outlined"
            />
          </Form.Item>
        ) : (
          <Empty
            description={t('modules.print.noTemplate')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
        <Typography.Text strong className="whitespace-nowrap">
          {t('modules.print.printOptions')}
        </Typography.Text>
        <Form.Item name="printOptions" noStyle>
          <Checkbox.Group className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {isSalesOrder ? (
              <Checkbox value="hideUnitPrice">
                {t('modules.print.hideUnitPrice')}
              </Checkbox>
            ) : null}
            <Checkbox value="hideRemark">
              {t('modules.print.hideRemark')}
            </Checkbox>
            {isSalesOrder ? (
              <Checkbox value="enableBrandOverride">
                {t('modules.print.enableBrandOverride')}
              </Checkbox>
            ) : null}
            <Checkbox value="enableItemSelection">
              {t('modules.print.enableItemSelection')}
            </Checkbox>
            <Checkbox value="enableSplitPrint">
              {t('modules.print.enableSplitPrint')}
            </Checkbox>
          </Checkbox.Group>
        </Form.Item>
        {splitPrintEnabled ? (
          <Flex align="center" gap="small">
            <Typography.Text className="whitespace-nowrap">
              {t('modules.print.splitPieceCountLabel')}
            </Typography.Text>
            <Form.Item
              name="splitPieceCount"
              noStyle
              rules={[
                {
                  validator: (_rule, value) =>
                    isValidSplitPieceCount(value)
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error(
                            t('modules.print.splitPieceCountPlaceholder'),
                          ),
                        ),
                },
              ]}
            >
              <InputNumber
                min={1}
                precision={0}
                placeholder={t('modules.print.splitPieceCountPlaceholder')}
                style={{ width: 120 }}
              />
            </Form.Item>
          </Flex>
        ) : null}
      </Flex>
    </Form>
  )
}
