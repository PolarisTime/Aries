// @vitest-environment jsdom

import { act, createElement, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFocusTrap } from '@/hooks/useFocusTrap'

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })

function pressKey(target: Element | null, key: string, shiftKey = false) {
  if (!target) return
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      shiftKey,
      bubbles: true,
      cancelable: true,
    }),
  )
}

describe('useFocusTrap', () => {
  let root: Root
  let host: HTMLDivElement
  let containerRef: { current: HTMLDivElement | null }
  let onEscape: ReturnType<typeof vi.fn<() => void>>

  function Probe({ active }: { active: boolean }) {
    const ref = useRef<HTMLDivElement | null>(null)
    containerRef = ref
    useFocusTrap({
      containerRef: ref,
      active,
      onEscape,
    })
    return createElement(
      'div',
      { ref, 'data-testid': 'trap' },
      createElement('input', { 'data-testid': 'first' }),
      createElement('input', { 'data-testid': 'second' }),
      createElement('input', { 'data-testid': 'third' }),
    )
  }

  const renderProbe = (active: boolean) => {
    act(() => {
      root.render(createElement(Probe, { active }))
    })
  }

  const field = (name: string) =>
    host.querySelector<HTMLElement>(`[data-testid="${name}"]`)

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    onEscape = vi.fn<() => void>()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    host.remove()
    document.body.innerHTML = ''
  })

  it('moves focus into the first focusable element when activated', async () => {
    renderProbe(true)
    await nextFrame()

    expect(document.activeElement).toBe(field('first'))
  })

  it('cycles focus forward and backward with Tab without leaving the container', async () => {
    renderProbe(true)
    await nextFrame()
    expect(document.activeElement).toBe(field('first'))

    pressKey(field('first'), 'Tab')
    expect(document.activeElement).toBe(field('second'))

    pressKey(field('second'), 'Tab')
    pressKey(field('third'), 'Tab')
    expect(document.activeElement).toBe(field('first'))

    pressKey(field('first'), 'Tab', true)
    expect(document.activeElement).toBe(field('third'))
  })

  it('restores focus to the trigger element after deactivation', async () => {
    const trigger = document.createElement('button')
    trigger.setAttribute('data-testid', 'trigger')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    renderProbe(true)
    await nextFrame()
    expect(document.activeElement).toBe(field('first'))

    renderProbe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('does not intercept Tab while inactive and reacts to activation switches', async () => {
    renderProbe(false)
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    pressKey(field('first'), 'Tab')
    expect(document.activeElement).not.toBe(field('second'))
    expect(document.activeElement).toBe(trigger)

    renderProbe(true)
    await nextFrame()
    expect(document.activeElement).toBe(field('first'))

    pressKey(field('first'), 'Tab')
    expect(document.activeElement).toBe(field('second'))
  })

  it('falls back to the container element when there are no focusable children', async () => {
    function EmptyProbe({ active }: { active: boolean }) {
      const ref = useRef<HTMLDivElement | null>(null)
      containerRef = ref
      useFocusTrap({ containerRef: ref, active })
      return createElement('div', { ref, tabIndex: -1 })
    }
    act(() => {
      root.render(createElement(EmptyProbe, { active: true }))
    })
    await nextFrame()

    expect(document.activeElement).toBe(containerRef.current)
  })

  it('invokes onEscape only for the top-most active trap', async () => {
    let outerRef: { current: HTMLDivElement | null } = { current: null }
    let innerRef: { current: HTMLDivElement | null } = { current: null }

    function NestedProbe({
      outerActive,
      innerActive,
    }: {
      outerActive: boolean
      innerActive: boolean
    }) {
      const outer = useRef<HTMLDivElement | null>(null)
      const inner = useRef<HTMLDivElement | null>(null)
      outerRef = outer
      innerRef = inner
      useFocusTrap({ containerRef: outer, active: outerActive, onEscape })
      useFocusTrap({ containerRef: inner, active: innerActive, onEscape })
      return createElement(
        'div',
        { ref: outer },
        createElement('input'),
        createElement('div', { ref: inner }, createElement('input')),
      )
    }

    act(() => {
      root.render(
        createElement(NestedProbe, { outerActive: true, innerActive: true }),
      )
    })
    await nextFrame()

    pressKey(innerRef.current, 'Escape')
    expect(onEscape).toHaveBeenCalledTimes(1)

    act(() => {
      root.render(
        createElement(NestedProbe, { outerActive: true, innerActive: false }),
      )
    })
    pressKey(outerRef.current, 'Escape')
    expect(onEscape).toHaveBeenCalledTimes(2)
  })
})
