import { CopyOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Flex,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { useTranslation } from 'react-i18next'
import {
  fetchOperationLogs,
  type OperationLogRecord,
} from '@/api/system/operation-logs'
import { message } from '@/utils/antd-app'
import {
  categoryOf,
  failureSummary,
  formatDuration,
  isFailure,
} from './operation-log-view-model'

const pretty = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

type Props = {
  open: boolean
  record: OperationLogRecord | null
  onClose: () => void
}

/** 详情抽屉：概要 / 请求（含脱敏请求体）/ 错误 / 同单据操作时间线。 */
export function OperationLogDetailDrawer({ open, record, onClose }: Props) {
  const { t } = useTranslation()

  const relatedQuery = useQuery({
    queryKey: ['operation-logs', 'related', record?.businessNo ?? ''],
    queryFn: ({ signal }) =>
      fetchOperationLogs(
        { businessNo: record?.businessNo ?? '', page: 0, size: 10 },
        signal,
      ),
    enabled: open && Boolean(record?.businessNo),
    staleTime: 0,
  })

  const copy = async (text: string) => {
    const ok = await copyText(text)
    if (ok) message.success(t('modules.pages.operationLog.copied'))
    else message.error(t('modules.pages.operationLog.copyFailed'))
  }

  const failed = record ? isFailure(record) : false
  const category = record ? categoryOf(record) : 'BUSINESS'
  const failure = record ? failureSummary(record) : null
  const duration = formatDuration(record?.durationMs)

  const payload = record
    ? {
        logNo: record.logNo,
        operationTime: record.operationTime,
        operator: record.operatorName,
        loginName: record.loginName,
        moduleName: record.moduleName,
        actionType: record.actionType,
        businessNo: record.businessNo,
        resultStatus: record.resultStatus,
        statusCode: record.statusCode,
        durationMs: record.durationMs,
        clientIp: record.clientIp,
        requestMethod: record.requestMethod,
        requestPath: record.requestPath,
        errorCode: record.errorCode,
        errorMessage: record.errorMessage,
        requestBody: record.requestBody,
        traceId: record.traceId,
      }
    : {}

  return (
    <Drawer
      className="oplog-drawer"
      extra={
        record ? (
          <Button
            icon={<CopyOutlined />}
            size="small"
            onClick={() => void copy(record.logNo)}
          >
            {t('modules.pages.operationLog.copyLogNo')}
          </Button>
        ) : null
      }
      onClose={onClose}
      open={open}
      title={t('modules.pages.operationLog.detailTitle')}
      size={620}
    >
      {!record ? null : (
        <Flex vertical gap={12}>
          <Flex align="center" gap={8} wrap>
            <Tag color={failed ? 'error' : 'success'}>
              {failed
                ? t('modules.pages.operationLog.failed')
                : t('modules.pages.operationLog.success')}
            </Tag>
            <Typography.Text strong>{record.actionType}</Typography.Text>
            <Typography.Text type="secondary">
              {record.operatorName}
              {record.loginName ? ` · ${record.loginName}` : ''}
            </Typography.Text>
            <Tag>
              {t(
                `modules.pages.operationLog.category${category === 'SESSION' ? 'Session' : category === 'SYSTEM' ? 'System' : 'Business'}`,
              )}
            </Tag>
            {duration ? (
              <Typography.Text type="secondary">{duration}</Typography.Text>
            ) : null}
            {record.statusCode !== undefined ? (
              <Typography.Text type="secondary">
                HTTP {record.statusCode}
              </Typography.Text>
            ) : null}
          </Flex>

          <Descriptions
            bordered
            className="oplog-detail-descriptions"
            column={2}
            items={[
              {
                key: 'time',
                label: t('modules.pages.operationLog.operationTime'),
                children: record.operationTime?.replace('T', ' '),
              },
              {
                key: 'module',
                label: t('modules.pages.operationLog.module'),
                children: record.moduleName,
              },
              {
                key: 'business',
                label: t('modules.pages.operationLog.businessNo'),
                children: record.businessNo || '—',
              },
              {
                key: 'logNo',
                label: t('modules.pages.operationLog.logNo'),
                children: record.logNo,
              },
              {
                key: 'ip',
                label: t('modules.pages.operationLog.clientIp'),
                children: record.clientIp || '—',
              },
              {
                key: 'method',
                label: t('modules.pages.operationLog.requestMethod'),
                children: record.requestMethod,
              },
              {
                key: 'path',
                label: t('modules.pages.operationLog.requestPath'),
                children: record.requestPath,
              },
              {
                key: 'ua',
                label: t('modules.pages.operationLog.userAgent'),
                children: record.userAgent || '—',
              },
              {
                key: 'trace',
                label: t('modules.pages.operationLog.traceId'),
                children: record.traceId || '—',
              },
              {
                key: 'remark',
                label: t('modules.pages.operationLog.remark'),
                children: record.remark || '—',
              },
            ]}
            size="small"
          />

          <Divider plain styles={{ content: { margin: 0 } }}>
            {t('modules.pages.operationLog.sectionRequest')}
          </Divider>
          {record.requestBody === undefined ? (
            <Typography.Text type="secondary">
              {t('modules.pages.operationLog.noRequestBody')}
            </Typography.Text>
          ) : (
            <Flex vertical gap={4}>
              <pre className="oplog-json">{pretty(record.requestBody)}</pre>
              <Flex justify="flex-end">
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => void copy(pretty(record.requestBody))}
                >
                  {t('modules.pages.operationLog.copyRequestBody')}
                </Button>
              </Flex>
            </Flex>
          )}

          {failed ? (
            <>
              <Divider plain styles={{ content: { margin: 0 } }}>
                {t('modules.pages.operationLog.sectionError')}
              </Divider>
              <Typography.Text type="danger">
                {failure ?? t('modules.pages.operationLog.unknownError')}
              </Typography.Text>
            </>
          ) : null}

          <Divider plain styles={{ content: { margin: 0 } }}>
            {t('modules.pages.operationLog.sectionRelated')}
          </Divider>
          {!record.businessNo ? (
            <Typography.Text type="secondary">
              {t('modules.pages.operationLog.relatedNoBusinessNo')}
            </Typography.Text>
          ) : relatedQuery.isPending ? (
            <Spin />
          ) : relatedQuery.data?.content.length ? (
            <Flex className="oplog-related" vertical gap={4}>
              {relatedQuery.data.content.map((item) => (
                <Flex align="center" gap={8} key={item.id}>
                  <Typography.Text type="secondary">
                    {item.operationTime?.replace('T', ' ').slice(0, 19)}
                  </Typography.Text>
                  <Typography.Text>{item.actionType}</Typography.Text>
                  <Typography.Text ellipsis type="secondary">
                    {item.operatorName}
                  </Typography.Text>
                  <Tag color={isFailure(item) ? 'error' : 'success'}>
                    {item.resultStatus}
                  </Tag>
                </Flex>
              ))}
            </Flex>
          ) : (
            <Empty description={t('modules.pages.operationLog.relatedEmpty')} />
          )}

          <Flex justify="flex-end">
            <Button onClick={() => void copy(pretty(payload))}>
              {t('modules.pages.operationLog.copyJson')}
            </Button>
          </Flex>
        </Flex>
      )}
    </Drawer>
  )
}
