import { useEffect, useState, useRef } from 'react';

interface Props {
  src: string;
  onClose: () => void;
}

export function ImageLightbox({ src, onClose }: Props) {
  const [zoomed, setZoomed] = useState(false);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });
  const moved = useRef(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    }
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  function handleImgMouseDown(e: React.MouseEvent<HTMLImageElement>) {
    if (!zoomed) return;
    e.preventDefault();
    dragging.current = true;
    moved.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, tx: translate.x, ty: translate.y };
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      setTranslate({ x: dragStart.current.tx + dx, y: dragStart.current.ty + dy });
    }
    function onMouseUp() {
      dragging.current = false;
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function handleImgClick(e: React.MouseEvent<HTMLImageElement>) {
    e.stopPropagation();
    if (moved.current) return; // was a drag, not a click
    if (zoomed) {
      setZoomed(false);
      setTranslate({ x: 0, y: 0 });
      return;
    }
    setTranslate({ x: 0, y: 0 });
    setZoomed(true);
  }

  function handleBackdropClick() {
    if (zoomed) { setZoomed(false); setTranslate({ x: 0, y: 0 }); return; }
    onClose();
  }

  return (
    <div className="rte-lightbox-backdrop" onClick={handleBackdropClick}>
      <button className="rte-lightbox-close" onClick={e => { e.stopPropagation(); onClose(); }} aria-label="Close">✕</button>
      <img
        ref={imgRef}
        className={`rte-lightbox-img${zoomed ? ' rte-lightbox-img--zoomed' : ''}`}
        src={src}
        alt=""
        style={{ transform: zoomed ? `scale(2.5) translate(${translate.x / 2.5}px, ${translate.y / 2.5}px)` : undefined }}
        onMouseDown={handleImgMouseDown}
        onClick={handleImgClick}
        draggable={false}
      />
    </div>
  );
}
