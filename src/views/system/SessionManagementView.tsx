import { SessionManagementCard } from '@/views/system/SessionManagementCard'
import { useSessionManagementState } from '@/views/system/useSessionManagementState'

export function SessionManagementView() {
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
  } = useSessionManagementState()

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
