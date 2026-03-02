import React from 'react';

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="ops-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
        <div className="ops-modal-head">
          <h3 className="ops-modal-title">{title}</h3>
          <button type="button" className="ops-btn ops-btn-secondary" onClick={onClose}>Close</button>
        </div>
        <div className="ops-modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
