import { useRef, useState } from 'react';

/**
 * Provides drag-handle state and event handlers for reorderable table rows.
 * `onReorder` receives the new ordered list of IDs after a drop.
 */
export function useDragReorder<T extends { id: string }>(
  sortedItems: T[],
  onReorder: (ids: string[]) => void,
) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragSrcId = useRef<string | null>(null);

  function handleDragStart(id: string) {
    dragSrcId.current = id;
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    setDragOverId(id);
  }

  function handleDrop(targetId: string) {
    const srcId = dragSrcId.current;
    if (!srcId || srcId === targetId) { setDragOverId(null); return; }
    const ids = sortedItems.map(item => item.id);
    const srcIdx = ids.indexOf(srcId);
    const tgtIdx = ids.indexOf(targetId);
    ids.splice(srcIdx, 1);
    ids.splice(tgtIdx, 0, srcId);
    onReorder(ids);
    setDragOverId(null);
    dragSrcId.current = null;
  }

  function handleDragLeave() {
    setDragOverId(null);
  }

  return { dragOverId, handleDragStart, handleDragOver, handleDrop, handleDragLeave };
}
