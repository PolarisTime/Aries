import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { SessionManagementCard } from '@/views/system/SessionManagementCard'
import { useSessionManagementState } from '@/views/system/useSessionManagementState'

interface SessionManagementViewProps {
  active?: boolean
  embedded?: boolean
}

export function SessionManagementView({
  active = true,
  embedded = false,
}: SessionManagementViewProps) {
  const { t } = useTranslation()
  const isPageVisible = usePageVisibility()
  const {
    canEdit,
    columns,
    currentPage,
    handleRevokeAll,
    isLoading,
    keyword,
    pageSize,
    refreshSessionData,
    setCurrentPage,
    setKeyword,
    setPageSize,
    summary,
    tokens,
    totalElements,
  } = useSessionManagementState(active && isPageVisible)

  const content = (
    <div className="page-stack">
      <SessionManagementCard
        title={embedded ? t('system.session.title') : undefined}
        canEdit={canEdit}
        columns={columns}
        currentPage={currentPage}
        isLoading={isLoading}
        keyword={keyword}
        pageSize={pageSize}
        summary={summary}
        tokens={tokens}
        totalElements={totalElements}
        onKeywordChange={setKeyword}
        onSearch={() => {
          setCurrentPage(1)
          refreshSessionData()
        }}
        onRefresh={refreshSessionData}
        onRevokeAll={handleRevokeAll}
        onPageChange={(page, size) => {
          setCurrentPage(page)
          setPageSize(size)
        }}
      />
    </div>
  )

  if (embedded) {
    return content
  }

  return <AppProPage title={t('system.session.title')}>{content}</AppProPage>
}
