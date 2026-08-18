"use client";

import { useRef, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

export function FirmaPad({
  name,
  label = "Firma del responsable",
  required = false,
  onFirma,
}: {
  name: string;
  label?: string;
  required?: boolean;
  onFirma?: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState("");
  const [tieneFirma, setTieneFirma] = useState(false);
  const drawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const hasTouched = useRef(false);
  const onFirmaRef = useRef(onFirma);
  onFirmaRef.current = onFirma;

  function toCanvasPos(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    const me = e as MouseEvent;
    return {
      x: (me.clientX - rect.left) * scaleX,
      y: (me.clientY - rect.top) * scaleY,
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    function onStart(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      drawing.current = true;
      const pos = toCanvasPos(e, canvas!);
      lastX.current = pos.x;
      lastY.current = pos.y;
    }

    function onMove(e: MouseEvent | TouchEvent) {
      if (!drawing.current) return;
      e.preventDefault();
      const ctx2 = canvas!.getContext("2d")!;
      const pos = toCanvasPos(e, canvas!);
      ctx2.beginPath();
      ctx2.strokeStyle = "#111827";
      ctx2.lineWidth = 2;
      ctx2.lineCap = "round";
      ctx2.lineJoin = "round";
      ctx2.moveTo(lastX.current, lastY.current);
      ctx2.lineTo(pos.x, pos.y);
      ctx2.stroke();
      lastX.current = pos.x;
      lastY.current = pos.y;
      hasTouched.current = true;
    }

    function onEnd() {
      if (!drawing.current) return;
      drawing.current = false;
      if (hasTouched.current) {
        const url = canvas!.toDataURL("image/png");
        setDataUrl(url);
        setTieneFirma(true);
        onFirmaRef.current?.(url);
      }
    }

    canvas.addEventListener("mousedown", onStart);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);

    return () => {
      canvas.removeEventListener("mousedown", onStart);
      canvas.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, []);

  function limpiar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setDataUrl("");
    setTieneFirma(false);
    hasTouched.current = false;
    onFirmaRef.current?.("");
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={dataUrl} />
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--sidebar-text)",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {label}
          {required && " *"}
        </span>
        {tieneFirma && (
          <button
            type="button"
            onClick={limpiar}
            className="flex items-center gap-1 rounded px-2 py-1"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-xs)",
              color: "var(--sidebar-text)",
            }}
          >
            <RotateCcw size={12} /> Borrar
          </button>
        )}
      </div>
      <div
        style={{
          border: `1px solid ${tieneFirma ? "var(--color-status-cerrado)" : "var(--field-border)"}`,
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          background: "#fff",
          touchAction: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          width={560}
          height={160}
          style={{
            width: "100%",
            height: 160,
            display: "block",
            cursor: "crosshair",
            touchAction: "none",
          }}
        />
      </div>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-xs)",
          color: tieneFirma ? "var(--color-status-cerrado)" : "var(--sidebar-text)",
        }}
      >
        {tieneFirma
          ? "Firma capturada — toca Borrar para volver a firmar"
          : "Dibuja tu firma con el dedo o el cursor"}
      </p>
    </div>
  );
}
