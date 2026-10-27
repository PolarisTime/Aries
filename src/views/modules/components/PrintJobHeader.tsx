import { Flex, Tag, Typography, theme } from 'antd'
import { Fragment } from 'react'
import { formatDocumentReferenceText } from '@/components/document-reference/document-reference-utils'
import type { PrintTemplateRecord } from '@/shared/schemas'
import { isPdfTemplate, templateTypeLabel } from './print-job-modal-format'

/**
 * 打印作业弹窗的页头：模块名 + 单号 + 模板类型标签 + 对比方/项目摘要。
 *
 * <p>原本是 PrintJobModal.tsx 内部的私有组件，本轮抽成独立文件的原因有二：
 * 一是弹窗组件本身超出 no-giant-component 的 300 行阈值，页头是最大的一块
 * 纯展示 JSX；二是内容区已抽到 PrintJobModalBody，页头由它直接渲染更自然。
 * 标记结构与文案保持逐字不变（含分隔符 `/` 与 420px 省略宽度）。</p>
 *
 * <p>单号只渲染纯文本（原先的「复制单号 / 单据引用跳转」两个图标已整体下线），
 * 文本口径统一取 `formatDocumentReferenceText`。</p>
 */

interface Props {
  counterpartyName: string
  moduleTitle?: string
  orderNo: string
  projectSummaryText: string
  selectedTemplate?: PrintTemplateRecord
  t: (key: string, values?: Record<string, unknown>) => string
}

export function PrintJobHeader({
  counterpartyName,
  moduleTitle,
  orderNo,
  projectSummaryText,
  selectedTemplate,
  t,
}: Props) {
  const { token } = theme.useToken()
  const summaryParts = [
    { key: 'counterparty', text: counterpartyName },
    { key: 'project', text: projectSummaryText },
  ].filter((part) => part.text)
  return (
    <Flex vertical gap={token.marginXS}>
      <Flex align="center" gap="middle" wrap="wrap">
        <Typography.Text strong style={{ fontSize: token.fontSizeLG }}>
          {moduleTitle || t('modules.print.currentModule')}
        </Typography.Text>
        {orderNo ? (
          <Typography.Text>
            {formatDocumentReferenceText(orderNo)}
          </Typography.Text>
        ) : null}
        {selectedTemplate ? (
          <Tag color={isPdfTemplate(selectedTemplate) ? 'blue' : 'green'}>
            {templateTypeLabel(selectedTemplate, t)}
          </Tag>
        ) : null}
      </Flex>
      {summaryParts.length ? (
        <Flex align="center" gap="small" wrap="wrap">
          {summaryParts.map((part, index) => (
            <Fragment key={part.key}>
              {index > 0 ? (
                <Typography.Text type="secondary">/</Typography.Text>
              ) : null}
              <Typography.Text
                ellipsis={{ tooltip: true }}
                style={{ maxWidth: 420 }}
              >
                {part.text}
              </Typography.Text>
            </Fragment>
          ))}
        </Flex>
      ) : null}
    </Flex>
  )
}
