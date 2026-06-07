import Flex from 'antd/es/flex'
import Spin from 'antd/es/spin'

export function OverlayLazyFallback() {
  return (
    <div className="module-overlay-lazy-fallback">
      <Flex justify="center" align="center" className="py-64">
        <Spin />
      </Flex>
    </div>
  )
}
