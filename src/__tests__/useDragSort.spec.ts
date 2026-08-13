import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useDragSort } from '@/composables/useDragSort'

/** Three 50px-high rows stacked from y=100. */
function makeList(): HTMLElement {
  const container = document.createElement('ul')
  for (let i = 0; i < 3; i++) {
    const li = document.createElement('li')
    li.className = 'row'
    li.getBoundingClientRect = () =>
      ({ top: 100 + i * 50, height: 50, bottom: 150 + i * 50 }) as DOMRect
    container.append(li)
  }
  return container
}

function handleEvent(type: string, clientY: number) {
  const el = document.createElement('button')
  el.setPointerCapture = vi.fn()
  el.releasePointerCapture = vi.fn()
  const event = new Event(type) as PointerEvent
  Object.assign(event, { pointerType: 'touch', button: 0, pointerId: 1, clientX: 0, clientY })
  Object.defineProperty(event, 'currentTarget', { value: el })
  return event
}

describe('useDragSort', () => {
  let onDrop: ReturnType<typeof vi.fn<(from: number, to: number) => void>>
  let drag: ReturnType<typeof useDragSort>

  beforeEach(() => {
    onDrop = vi.fn<(from: number, to: number) => void>()
    drag = useDragSort({ container: ref(makeList()), itemSelector: '.row', onDrop })
  })

  it('drops on the row whose upper half the pointer is over', async () => {
    drag.onPointerDown(handleEvent('pointerdown', 110), 0)
    expect(drag.isDragging(0)).toBe(true)

    // y=220 falls in the lower half of row 2 (200–250) → past it, so row index 2.
    drag.onPointerMove(handleEvent('pointermove', 220))
    expect(drag.isOver(2)).toBe(true)

    await drag.onPointerUp(handleEvent('pointerup', 220))
    expect(onDrop).toHaveBeenCalledWith(0, 2)
    expect(drag.isDragging(0)).toBe(false)
  })

  it('ignores a drop back on the original position', async () => {
    drag.onPointerDown(handleEvent('pointerdown', 110), 1)
    drag.onPointerMove(handleEvent('pointermove', 160))
    await drag.onPointerUp(handleEvent('pointerup', 160))
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('ignores pointer moves when no drag is active', async () => {
    drag.onPointerMove(handleEvent('pointermove', 220))
    expect(drag.overIndex.value).toBeNull()
    await drag.onPointerUp(handleEvent('pointerup', 220))
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('ignores a non-primary mouse button', () => {
    const event = handleEvent('pointerdown', 110)
    Object.assign(event, { pointerType: 'mouse', button: 2 })
    drag.onPointerDown(event, 0)
    expect(drag.fromIndex.value).toBeNull()
  })
})
