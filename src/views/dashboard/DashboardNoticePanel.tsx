import { useQuery } from '@tanstack/react-query'
import { Card, Drawer, Empty, Tag } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type DashboardNotice,
  fetchDashboardNotices,
} from '@/api/system/dashboard-workspace'
import { QUERY_KEYS } from '@/constants/query-keys'
import { formatDateTime } from '@/utils/formatters'

const NOTICE_LEVEL_COLORS: Record<DashboardNotice['level'], string> = {
  info: 'blue',
  warn: 'orange',
  critical: 'red',
}

const NOTICE_LEVEL_LABEL_KEYS: Record<DashboardNotice['level'], string> = {
  info: 'dashboard.notices.levels.info',
  warn: 'dashboard.notices.levels.warn',
  critical: 'dashboard.notices.levels.critical',
}

/** 系统公告与预警：最近通知列表 + 点击查看详情抽屉 */
export function DashboardNoticePanel() {
  const { t } = useTranslation()
  const [activeNotice, setActiveNotice] = useState<DashboardNotice | null>(null)
  const { data: notices } = useQuery({
    queryKey: QUERY_KEYS.dashboardNotices,
    queryFn: fetchDashboardNotices,
    refetchInterval: 120000,
  })

  return (
    <Card size="small" title={t('dashboard.notices.title')}>
      {notices?.length ? (
        <div className="dashboard-notice-list">
          {notices.map((notice) => (
            <button
              key={notice.id}
              type="button"
              className="dashboard-notice-item"
              onClick={() => setActiveNotice(notice)}
            >
              <span className="dashboard-notice-copy">
                <Tag color={NOTICE_LEVEL_COLORS[notice.level]}>
                  {t(NOTICE_LEVEL_LABEL_KEYS[notice.level])}
                </Tag>
                <span className="dashboard-notice-title">{notice.title}</span>
              </span>
              <span className="dashboard-notice-time">
                {formatDateTime(notice.publishedAt)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('dashboard.notices.empty')}
        />
      )}
      <Drawer
        title={activeNotice?.title ?? t('dashboard.notices.drawerTitle')}
        placement="right"
        open={Boolean(activeNotice)}
        onClose={() => setActiveNotice(null)}
      >
        {activeNotice ? (
          <div className="dashboard-notice-detail">
            <p className="dashboard-notice-meta">
              <Tag color={NOTICE_LEVEL_COLORS[activeNotice.level]}>
                {t(NOTICE_LEVEL_LABEL_KEYS[activeNotice.level])}
              </Tag>
              {formatDateTime(activeNotice.publishedAt)}
            </p>
            <p>{activeNotice.content}</p>
          </div>
        ) : null}
      </Drawer>
    </Card>
  )
}
