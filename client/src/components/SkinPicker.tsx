import { useId, useState } from 'react';
import { SKINS, type SkinId } from '../skins';
import { setSkinId, useSkin } from '../skins/store';
import { Card, FaceDownCard } from './Card';
import { Modal } from './Modal';

/** Lista de skins con vista previa frente + dorso (radiogroup nativo). */
export function SkinOptions({ previewValue = '8' }: { previewValue?: string }) {
  const current = useSkin();
  const name = useId();
  return (
    <fieldset className="skin-options">
      <legend className="sr-only">Elige el diseño de tus cartas</legend>
      {SKINS.map((s) => (
        <label key={s.id} className={`skin-option${current === s.id ? ' is-checked' : ''}`}>
          <input
            type="radio"
            className="sr-only"
            name={name}
            value={s.id}
            checked={current === s.id}
            onChange={() => setSkinId(s.id as SkinId)}
          />
          <span className="skin-preview" aria-hidden="true">
            <Card value={previewValue} size="table" skin={s.id} />
            <FaceDownCard size="table" skin={s.id} />
          </span>
          <span className="skin-text">
            <span className="skin-name">{s.nombre}</span>
            <span className="small muted">{s.descripcion}</span>
          </span>
          <span className="skin-check" aria-hidden="true">
            {current === s.id ? '✓' : ''}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Botón "Mi mazo" que abre el selector en un diálogo. */
export function SkinPicker({ className = 'btn btn-ghost btn-sm' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  return (
    <>
      <button type="button" className={`${className} skin-btn`} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Mi mazo" title="Mi mazo">
        <span aria-hidden="true">🂠</span>
        <span className="skin-btn-text">Mi mazo</span>
      </button>
      {open && (
        <Modal labelledBy={titleId} onClose={() => setOpen(false)} className="skin-modal">
          <header className="modal-head">
            <div>
              <h2 id={titleId} className="h-lg">
                Mi mazo
              </h2>
              <p className="small muted">Solo tú ves este diseño; los demás ven el suyo.</p>
            </div>
            <button type="button" className="btn btn-icon" onClick={() => setOpen(false)} aria-label="Cerrar">
              ✕
            </button>
          </header>
          <div className="modal-body">
            <SkinOptions />
          </div>
          <footer className="modal-foot">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setOpen(false)}>
              Listo
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
