import { LockOutlined } from '@ant-design/icons'
import Typography from 'antd/es/typography'
import { useCallback, useRef, useState } from 'react'

interface Props {
  onVerify: () => void
}

export function SliderCaptcha({ onVerify }: Props) {
  const [sliding, setSliding] = useState(false)
  const [verified, setVerified] = useState(false)
  const [offset, setOffset] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)

  const maxOffset = useCallback(
    () => (trackRef.current ? trackRef.current.clientWidth - 52 : 200),
    [],
  )

  const handleStart = useCallback(
    (clientX: number) => {
      if (verified) return
      setSliding(true)
      startX.current = clientX - offset
    },
    [verified, offset],
  )

  const handleMove = useCallback(
    (clientX: number) => {
      if (!sliding) return
      const dx = Math.max(0, Math.min(clientX - startX.current, maxOffset()))
      setOffset(dx)
    },
    [sliding, maxOffset],
  )

  const handleEnd = useCallback(() => {
    if (!sliding) return
    setSliding(false)
    if (offset >= maxOffset() - 4) {
      setVerified(true)
      setOffset(maxOffset())
      onVerify()
    } else {
      setOffset(0)
    }
  }, [sliding, offset, onVerify, maxOffset])

  return (
    <div className="slider-captcha mb-16">
      <div className="slider-captcha-label mb-8">
        <LockOutlined className="mr-6" />
        <Typography.Text type="secondary">
          {verified ? '验证通过' : '请按住滑块拖到最右侧完成验证'}
        </Typography.Text>
      </div>
      <div
        ref={trackRef}
        className="slider-captcha-track"
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        <div
          className="slider-captcha-fill"
          style={{ width: verified ? '100%' : `${offset}px` }}
        />
        <div
          className={`slider-captcha-thumb ${verified ? 'verified' : ''}`}
          style={{ left: `${offset}px` }}
          onMouseDown={(e) => handleStart(e.clientX)}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        >
          {verified ? '✓' : '→'}
        </div>
        <span className="slider-captcha-text">
          {verified ? '验证通过' : '请按住滑块拖到最右侧'}
        </span>
      </div>
    </div>
  )
}
