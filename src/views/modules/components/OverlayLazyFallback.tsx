import { Flex, Spin } from 'antd'

export function OverlayLazyFallback() {
  return (
    <div className="module-overlay-lazy-fallback">
      <Flex justify="center" align="center" className="py-64">
        <Spin />
      </Flex>
    </div>
  )
}
