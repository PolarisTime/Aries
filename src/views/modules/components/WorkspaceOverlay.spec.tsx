import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type ComponentProps, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@ant-design/icons', () => ({
  CloseOutlined: () => <span>CloseOutlined</span>,
}))

vi.mock('@/styles/workspace-overlay.css', () => ({}))

import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'

type WorkspaceOverlayProps = ComponentProps<typeof WorkspaceOverlay>

describe('WorkspaceOverlay', () => {
  const closeButtonLabel = 'modules.workspace.closeAria'

  const renderOverlay = (props: Partial<WorkspaceOverlayProps> = {}) => {
    const onClose = props.onClose ?? vi.fn()

    const result = render(
      <WorkspaceOverlay
        open={props.open ?? true}
        title={props.title ?? 'Test Title'}
        onClose={onClose}
        width={props.width}
        height={props.height}
        footer={props.footer}
        variant={props.variant}
        zIndex={props.zIndex}
        className={props.className}
      >
        {props.children ?? <div>Content</div>}
      </WorkspaceOverlay>,
    )

    return { ...result, onClose }
  }

  const getCloseButton = () =>
    screen.getByLabelText(closeButtonLabel, {
      selector: '.workspace-overlay-close',
    })

  const captureNextAnimationFrame = () => {
    let frameCallback: FrameRequestCallback | undefined
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(
      (callback) => {
        frameCallback = callback
        return 1
      },
    )
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(
      () => undefined,
    )

    return () => {
      expect(frameCallback).toBeDefined()
      frameCallback?.(0)
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders when open', () => {
    const { container } = renderOverlay()
    const overlay = container.firstElementChild
    const panel = screen.getByText('Test Title').closest('section')

    expect(screen.getByText('Test Title')).toBeTruthy()
    expect(screen.getByText('Content')).toBeTruthy()
    expect(overlay).toHaveClass(
      'workspace-overlay',
      'workspace-overlay--workspace',
    )
    expect(overlay).not.toHaveAttribute('style')
    expect(panel).toHaveClass(
      'workspace-overlay-panel',
      'workspace-overlay-panel--workspace',
    )
    expect(panel).not.toHaveClass('custom-panel')
    expect(screen.getByRole('dialog', { name: 'Test Title' })).toBe(panel)
    expect(panel).toHaveAttribute('aria-modal', 'true')
  })

  it('does not render when closed', () => {
    const { onClose } = renderOverlay({ open: false })

    expect(screen.queryByText('Test Title')).toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when mask is clicked', () => {
    const onClose = vi.fn()
    renderOverlay({ onClose })
    const mask = screen
      .getAllByLabelText(closeButtonLabel)
      .find((element) => element.classList.contains('workspace-overlay-mask'))

    fireEvent.click(mask!)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    renderOverlay({ onClose })
    const closeButton = screen.getByText('CloseOutlined').closest('button')

    expect(closeButton).toHaveClass('workspace-overlay-close')
    fireEvent.click(closeButton!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape and removes the keydown listener on unmount', () => {
    const { onClose, unmount } = renderOverlay()

    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    unmount()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves focus into the dialog and traps Tab within it', async () => {
    renderOverlay({
      children: (
        <>
          <button type="button">First Action</button>
          <button type="button">Second Action</button>
        </>
      ),
    })

    const firstAction = screen.getByText('First Action')
    const secondAction = screen.getByText('Second Action')
    const closeButton = getCloseButton()

    await waitFor(() => {
      expect(document.activeElement).toBe(firstAction)
    })

    fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
    expect(document.activeElement).toBe(secondAction)

    fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
    expect(document.activeElement).toBe(closeButton)

    fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
    expect(document.activeElement).toBe(firstAction)

    fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(closeButton)
  })

  it('wraps Shift+Tab from the close button to the last focusable element', async () => {
    renderOverlay({
      children: (
        <>
          <button type="button">First Action</button>
          <button type="button">Second Action</button>
        </>
      ),
    })

    const closeButton = getCloseButton()
    const secondAction = screen.getByText('Second Action')

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByText('First Action'))
    })
    closeButton.focus()

    fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(secondAction)
  })

  it('focuses the close button when the body has no focusable elements', async () => {
    renderOverlay({ children: <div>Static Content</div> })

    await waitFor(() => {
      expect(document.activeElement).toBe(getCloseButton())
    })
  })

  it('falls back to non-body focusable elements when body and close button are absent', () => {
    const runFrame = captureNextAnimationFrame()
    renderOverlay({
      title: <a href="#title-link">Linked Title</a>,
      children: <div>Static Content</div>,
    })
    const titleLink = screen.getByText('Linked Title')
    const panel = screen.getByRole('dialog', { name: 'Linked Title' })

    panel.querySelector('.workspace-overlay-body')?.remove()
    panel.querySelector('.workspace-overlay-close')?.remove()
    runFrame()

    expect(document.activeElement).toBe(titleLink)
  })

  it('falls back to the panel when no focusable elements remain', () => {
    const runFrame = captureNextAnimationFrame()
    renderOverlay({ children: <div>Static Content</div> })
    const panel = screen.getByRole('dialog', { name: 'Test Title' })

    panel.querySelector('.workspace-overlay-body')?.remove()
    panel.querySelector('.workspace-overlay-close')?.remove()
    runFrame()
    fireEvent.keyDown(document, { key: 'Tab' })

    expect(document.activeElement).toBe(panel)
  })

  it('skips deferred focus when the panel unmounts before the animation frame', () => {
    const runFrame = captureNextAnimationFrame()
    const { unmount } = renderOverlay()

    unmount()

    expect(() => runFrame()).not.toThrow()
  })

  it('handles a non-HTMLElement active element before opening', () => {
    const svgElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    )
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(svgElement)

    const { unmount } = renderOverlay()

    expect(() => unmount()).not.toThrow()
  })

  it('skips focus restoration when the previous element was disconnected', () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const { unmount } = renderOverlay()

    trigger.remove()
    unmount()

    expect(trigger.isConnected).toBe(false)
  })

  it('ignores Escape from overlays below the topmost overlay', () => {
    const bottomClose = vi.fn()
    const topClose = vi.fn()

    render(
      <>
        <WorkspaceOverlay open title="Bottom Overlay" onClose={bottomClose}>
          <div>Bottom Content</div>
        </WorkspaceOverlay>
        <WorkspaceOverlay open title="Top Overlay" onClose={topClose}>
          <div>Top Content</div>
        </WorkspaceOverlay>
      </>,
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(bottomClose).not.toHaveBeenCalled()
    expect(topClose).toHaveBeenCalledTimes(1)
  })

  it('ignores Tab after the panel ref has been cleared', () => {
    let keydownHandler: EventListener | undefined
    const addEventListener = document.addEventListener.bind(document)
    vi.spyOn(document, 'addEventListener').mockImplementation(
      (type, listener, options) => {
        if (type === 'keydown') {
          keydownHandler = listener as EventListener
        }
        addEventListener(type, listener, options)
      },
    )
    const { unmount } = renderOverlay()

    unmount()
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      cancelable: true,
    })
    keydownHandler?.(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('restores focus to the previously active element after close', async () => {
    const TriggeredOverlay = () => {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open Overlay
          </button>
          <WorkspaceOverlay
            open={open}
            title="Restored Title"
            onClose={() => setOpen(false)}
          >
            <button type="button">Overlay Action</button>
          </WorkspaceOverlay>
        </>
      )
    }

    render(<TriggeredOverlay />)
    const trigger = screen.getByText('Open Overlay')
    trigger.focus()
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByText('Overlay Action'))
    })
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Restored Title' }),
      ).toBeNull()
      expect(document.activeElement).toBe(trigger)
    })
  })

  it('renders footer when provided', () => {
    renderOverlay({ footer: <div>Footer Content</div> })

    expect(screen.getByText('Footer Content')).toBeTruthy()
  })

  it('applies panel sizing, custom className, explicit variant, and zIndex', () => {
    const { container } = renderOverlay({
      title: <strong>Node Title</strong>,
      width: 720,
      height: '80vh',
      variant: 'workspace',
      zIndex: 1200,
      className: 'custom-panel',
    })
    const overlay = container.firstElementChild
    const panel = screen.getByText('Node Title').closest('section')

    expect(overlay).toHaveStyle({ zIndex: '1200' })
    expect(panel).toHaveClass(
      'workspace-overlay-panel',
      'workspace-overlay-panel--workspace',
      'custom-panel',
    )
    expect(panel).toHaveStyle({ maxWidth: '720px', height: '80vh' })
  })
})
