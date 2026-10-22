import { useEffect, useRef, type ReactNode } from "react";
export default function Modal({
  title,
  onClose,
  children,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <header>
        <h2 id="modal-title">{title}</h2>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={onClose}
          aria-label="Cerrar formulario"
        >
          ✕
        </button>
      </header>
      {children}
    </dialog>
  );
}
