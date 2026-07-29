"use client";

import { useRef, useState } from "react";

const DEMORA_MS = 1200;

export function CampoAyuda({
  texto,
  style,
  children,
  htmlFor,
}: {
  texto: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onEnter() {
    timeoutRef.current = setTimeout(() => setVisible(true), DEMORA_MS);
  }
  function onLeave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }

  return (
    <span className="relative inline-block" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <label htmlFor={htmlFor} style={style}>{children}</label>
      {visible && (
        <span
          className="absolute z-50 left-0 bottom-full mb-1.5 rounded-md px-2.5 py-1.5"
          style={{
            background: "var(--panel-bg)",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--field-border)",
            width: 220,
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-xs)",
            fontWeight: 400,
            textTransform: "none",
            letterSpacing: "normal",
            color: "var(--field-text)",
          }}
        >
          {texto}
        </span>
      )}
    </span>
  );
}
