'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

export function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const points = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ distance: 0, zoom: 1, x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function reset() { setZoom(1); setPan({ x: 0, y: 0 }); points.current.clear(); }
  function start(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const values = [...points.current.values()];
    gesture.current = {
      distance: values.length === 2 ? Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y) : 0,
      zoom, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y,
    };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!points.current.has(event.pointerId)) return;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const values = [...points.current.values()];
    if (values.length === 2 && gesture.current.distance > 0) {
      const distance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
      setZoom(Math.max(1, Math.min(3, gesture.current.zoom * distance / gesture.current.distance)));
    } else if (values.length === 1 && zoom > 1) {
      const maximumX = (frame.current?.clientWidth ?? 0) * (zoom - 1) / 2;
      const maximumY = (frame.current?.clientHeight ?? 0) * (zoom - 1) / 2;
      setPan({
        x: Math.max(-maximumX, Math.min(maximumX, gesture.current.panX + event.clientX - gesture.current.x)),
        y: Math.max(-maximumY, Math.min(maximumY, gesture.current.panY + event.clientY - gesture.current.y)),
      });
    }
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    points.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const remaining = [...points.current.values()][0];
    if (remaining) gesture.current = { distance: 0, zoom, x: remaining.x, y: remaining.y, panX: pan.x, panY: pan.y };
    if (zoom <= 1) setPan({ x: 0, y: 0 });
  }

  return <>
    <button type="button" onClick={() => { reset(); setOpen(true); }} className="group relative block w-full overflow-hidden rounded-[2rem] bg-stone-100 text-left" aria-label={'Agrandir ' + alt}>
      <img src={src} alt={alt} className="aspect-square w-full object-cover" />
      <span className="absolute bottom-4 right-4 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">Agrandir</span>
    </button>
    {open && <dialog ref={dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} className="m-auto w-[min(94vw,1040px)] max-w-none overflow-hidden rounded-3xl bg-[#faf9f6] p-0 text-[#201c19] shadow-2xl backdrop:bg-black/70" aria-label={'Photo agrandie — ' + alt}>
      <div className="flex items-center justify-between gap-4 p-4">
        <p className="text-sm font-bold">{alt}</p>
        <button autoFocus type="button" onClick={() => setOpen(false)} className="rounded-full bg-stone-200 px-4 py-2 text-sm font-bold">Fermer</button>
      </div>
      <div ref={frame} className="relative mx-auto aspect-square max-h-[70vh] overflow-hidden touch-none bg-stone-100" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>
        <img src={src} alt={alt} draggable={false} className="h-full w-full select-none object-contain" style={{ transform: 'translate(' + pan.x + 'px,' + pan.y + 'px) scale(' + zoom + ')' }} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 p-4">
        <button type="button" onClick={() => { setZoom(Math.max(1, zoom - 0.5)); setPan({ x: 0, y: 0 }); }} disabled={zoom <= 1} className="rounded-full border border-stone-300 px-4 py-2 font-bold disabled:opacity-40" aria-label="Réduire">−</button>
        <button type="button" onClick={reset} className="rounded-full px-3 py-2 text-sm font-bold">{Math.round(zoom * 100)} %</button>
        <button type="button" onClick={() => setZoom(Math.min(3, zoom + 0.5))} disabled={zoom >= 3} className="rounded-full border border-stone-300 px-4 py-2 font-bold disabled:opacity-40" aria-label="Agrandir davantage">+</button>
        <p className="text-sm text-stone-500">Pincez pour zoomer. Glissez pour explorer.</p>
      </div>
    </dialog>}
  </>;
}
