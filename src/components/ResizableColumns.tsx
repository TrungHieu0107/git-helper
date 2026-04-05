import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook for resizable column widths via drag handles.
 * Returns current width + a drag handle element generator.
 */
export function useResizableColumns(
  initial: Record<string, number>,
  minWidths?: Record<string, number>,
) {
  const [widths, setWidths] = useState(initial);
  const dragging = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const onMouseDown = useCallback((key: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = { key, startX: e.clientX, startW: widths[key] };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [widths]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const { key, startX, startW } = dragging.current;
      const delta = e.clientX - startX;
      const min = minWidths?.[key] ?? 40;
      setWidths(prev => ({ ...prev, [key]: Math.max(min, startW + delta) }));
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [minWidths]);

  return { widths, onMouseDown };
}

/** Drag handle element — thin vertical bar between columns */
export function ResizeHandle({ onMouseDown }: { onMouseDown: React.MouseEventHandler }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="shrink-0 cursor-col-resize group flex items-center justify-center"
      style={{ width: 5, alignSelf: 'stretch' }}
    >
      <div className="w-[1px] h-full bg-[#1e293b]/40 group-hover:bg-[#3b82f6] group-active:bg-[#3b82f6] transition-colors" />
    </div>
  );
}
