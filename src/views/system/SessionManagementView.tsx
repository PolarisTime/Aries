import { SessionManagementCard } from '@/views/system/SessionManagementCard'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { useSessionManagementState } from '@/views/system/useSessionManagementState'

interface SessionManagementViewProps {
  active?: boolean
}

export function SessionManagementView({
  active = true,
}: SessionManagementViewProps) {
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

  return (
    <div className="page-stack">
      <SessionManagementCard
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
}
