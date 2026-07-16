import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
import { useActivePageEnabled } from '@/hooks/useActivePageEnabled'
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
  const queryEnabled = useActivePageEnabled(active)
  const {
    canEdit,
    columns,
    currentPage,
    handlePageChange,
    handleRevokeAll,
    isLoading,
    keyword,
    pageSize,
    refreshSessionData,
    resetPage,
    setKeyword,
    summary,
    tokens,
    totalElements,
  } = useSessionManagementState(queryEnabled)

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
          resetPage()
          refreshSessionData()
        }}
        onRefresh={refreshSessionData}
        onRevokeAll={handleRevokeAll}
        onPageChange={handlePageChange}
      />
    </div>
  )

  return (
    <AppProPage embedded={embedded} title={t('system.session.title')}>
      {content}
    </AppProPage>
  )
}
