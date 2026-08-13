import { ref, type Ref } from 'vue'

/**
 * Pointer-driven reordering for a vertical list. The caller renders the list and
 * wires the handlers onto each row's drag handle; drop positions are derived
 * from the rows' on-screen boxes, so no fixed row height is assumed.
 *
 * Handles need `touch-action: none` so a drag doesn't turn into a page scroll.
 */
export function useDragSort(options: {
  /** Element that contains the rows. */
  container: Ref<HTMLElement | null>
  /** Selector matching the rows inside the container, in render order. */
  itemSelector: string
  onDrop: (fromIndex: number, toIndex: number) => void | Promise<void>
}) {
  const fromIndex = ref<number | null>(null)
  const overIndex = ref<number | null>(null)

  function dropIndexFromY(clientY: number): number {
    const items = options.container.value?.querySelectorAll(options.itemSelector)
    if (!items?.length) return 0
    for (let i = 0; i < items.length; i++) {
      const rect = items[i]!.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return i
    }
    return items.length - 1
  }

  function onPointerDown(event: PointerEvent, index: number) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    fromIndex.value = index
    overIndex.value = index
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (fromIndex.value === null) return
    overIndex.value = dropIndexFromY(event.clientY)
  }

  async function onPointerUp(event: PointerEvent) {
    if (fromIndex.value === null) return
    const from = fromIndex.value
    const to = overIndex.value ?? from
    fromIndex.value = null
    overIndex.value = null
    ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    if (from !== to) await options.onDrop(from, to)
  }

  /** The row being dragged. */
  function isDragging(index: number) {
    return fromIndex.value === index
  }

  /** The row the pointer currently hovers over (excluding the dragged row itself). */
  function isOver(index: number) {
    return overIndex.value === index && fromIndex.value !== null && fromIndex.value !== index
  }

  return { fromIndex, overIndex, isDragging, isOver, onPointerDown, onPointerMove, onPointerUp }
}
