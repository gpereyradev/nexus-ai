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
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.showModal();
    dialog
      .querySelector<HTMLElement>(
        "input:not([type=checkbox]):not(:disabled), textarea:not(:disabled), select:not(:disabled)",
      )
      ?.focus();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
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
