import { useId, useState, type FormEvent } from 'react';
import { LIMITS } from '@shared/protocol';
import { validateName } from '../lib/identity';

interface Props {
  initialName?: string;
  title?: string;
  submitLabel?: string;
  onSubmit: (name: string) => void;
  onCancel?: () => void;
}

/** Tarjeta "¿Cómo te llamas?" con vista previa de la identidad en la mesa. */
export function NameForm({
  initialName = '',
  title = '¿Cómo te llamas?',
  submitLabel = 'Entrar a la sala',
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validateName(name);
    if (problem) {
      setError(problem);
      return;
    }
    onSubmit(name.trim());
  };

  return (
    <form className="panel name-card" onSubmit={handleSubmit} noValidate>
      <NameField
        id={inputId}
        errorId={errorId}
        title={title}
        value={name}
        error={error}
        autoFocus
        onChange={(v) => {
          setName(v);
          if (error) setError(null);
        }}
      />
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-lg">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  id: string;
  errorId: string;
  title: string;
  value: string;
  error: string | null;
  autoFocus?: boolean;
  onChange: (v: string) => void;
}

/** Campo de nombre reutilizado en Home y en el prompt de la sala. */
export function NameField({ id, errorId, title, value, error, autoFocus, onChange }: FieldProps) {
  const preview = value.trim();
  return (
    <div className="name-field">
      <div className="name-field-head">
        <label htmlFor={id} className="h-sm">
          {title}
        </label>
        <span className="chip chip-success chip-xs">Obligatorio</span>
      </div>
      <input
        id={id}
        type="text"
        className="input-lg"
        value={value}
        maxLength={LIMITS.name}
        autoComplete="nickname"
        autoFocus={autoFocus}
        placeholder="Tu nombre"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="identity">
        <span className="muted small">Identidad en la mesa:</span>
        <span className="chip chip-identity">
          <span className="live-dot" aria-hidden="true" /> {preview || '—'}
        </span>
      </div>
    </div>
  );
}
