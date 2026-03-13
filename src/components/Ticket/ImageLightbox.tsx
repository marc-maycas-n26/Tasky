import { useEffect, useRef, useCallback } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const SCROLL_FACTOR = 0.001;
const CLICK_ZOOM = 2.5;

interface Props {
  src: string;
  onClose: () => void;
}

export function ImageLightbox({ src, onClose }: Props) {
  // All transform state in refs to avoid re-renders during drag/scroll
  const scale = useRef(1);
  const translate = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });
  const moved = useRef(false);

  const applyTransform = useCallback((s = scale.current, t = translate.current) => {
    if (!imgRef.current) return;
    imgRef.current.style.transform = s === 1
      ? 'none'
      : `scale(${s}) translate(${t.x / s}px, ${t.y / s}px)`;
    imgRef.current.style.cursor = s > 1 ? 'grab' : 'zoom-in';
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    }
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  // Scroll to zoom, anchored to cursor position
  useEffect(() => {
    const backdrop = imgRef.current?.parentElement;
    if (!backdrop) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (!imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const prevScale = scale.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale * (1 - e.deltaY * SCROLL_FACTOR)));

      if (newScale === prevScale) return;

      // Keep the point under the cursor fixed
      if (newScale === 1) {
        scale.current = 1;
        translate.current = { x: 0, y: 0 };
      } else {
        const originX = e.clientX - rect.left - rect.width / 2;
        const originY = e.clientY - rect.top - rect.height / 2;
        const ratio = newScale / prevScale;
        translate.current = {
          x: translate.current.x * ratio + originX * (ratio - 1),
          y: translate.current.y * ratio + originY * (ratio - 1),
        };
        scale.current = newScale;
      }
      applyTransform();
    }
    backdrop.addEventListener('wheel', onWheel, { passive: false });
    return () => backdrop.removeEventListener('wheel', onWheel);
  }, [applyTransform]);

  // Drag to pan
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      translate.current = { x: dragStart.current.tx + dx, y: dragStart.current.ty + dy };
      applyTransform();
    }
    function onMouseUp() { dragging.current = false; }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [applyTransform]);

  function handleImgMouseDown(e: React.MouseEvent<HTMLImageElement>) {
    if (scale.current <= 1) return;
    e.preventDefault();
    dragging.current = true;
    moved.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, tx: translate.current.x, ty: translate.current.y };
  }

  function handleImgClick(e: React.MouseEvent<HTMLImageElement>) {
    e.stopPropagation();
    if (moved.current) return;
    if (scale.current > 1) {
      scale.current = 1;
      translate.current = { x: 0, y: 0 };
    } else {
      scale.current = CLICK_ZOOM;
    }
    applyTransform();
  }

  function handleBackdropClick() {
    if (scale.current > 1) {
      scale.current = 1;
      translate.current = { x: 0, y: 0 };
      applyTransform();
      return;
    }
    onClose();
  }

  return (
    <div className="rte-lightbox-backdrop" onClick={handleBackdropClick}>
      <button className="rte-lightbox-close" onClick={e => { e.stopPropagation(); onClose(); }} aria-label="Close">✕</button>
      <img
        ref={imgRef}
        className="rte-lightbox-img"
        src={src}
        alt=""
        onMouseDown={handleImgMouseDown}
        onClick={handleImgClick}
        draggable={false}
      />
    </div>
  );
}
