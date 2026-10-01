import { useId, useState, type FormEvent } from 'react';
import { LIMITS, type RoomState, type Story } from '@shared/protocol';
import { formatNumber } from '../lib/results';
import { storyView } from '../lib/stories';

export interface StoryActions {
  add: (title: string, key: string) => void;
  update: (storyId: string, title: string, key: string) => void;
  remove: (storyId: string) => void;
  select: (storyId: string) => void;
}

interface Props {
  room: RoomState;
  isOwner: boolean;
  actions: StoryActions;
}

/** Historia actual + cola + alta de historias (owner) + historial con velocidad. */
export function StoryPanel({ room, isOwner, actions }: Props) {
  const v = storyView(room);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = editingId !== null && editingId === v.current?.id;
  const [addOpen, setAddOpen] = useState(room.stories.length === 0);

  return (
    <div className="story-col">
      <section className="panel story-current" aria-labelledby="story-title">
        {v.current ? (
          editing && isOwner ? (
            <StoryForm
              initial={v.current}
              submitLabel="Guardar"
              onCancel={() => setEditingId(null)}
              onSubmit={(title, key) => {
                actions.update(v.current!.id, title, key);
                setEditingId(null);
              }}
            />
          ) : (
            <>
              <div className="story-meta">
                <span className="chip chip-mono">
                  Historia {v.currentIndex} de {v.total}
                </span>
                {v.current.key && <span className="chip chip-key mono">{v.current.key}</span>}
                {v.current.estimate !== null && (
                  <span className="chip chip-success chip-mono">Estimada: {v.current.estimate}</span>
                )}
              </div>
              <h2 id="story-title" className="story-title">
                {v.current.title}
              </h2>
              {isOwner && (
                <div className="story-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingId(v.current!.id)}>
                    ✎ Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!v.skipTarget}
                    onClick={() => v.skipTarget && actions.select(v.skipTarget.id)}
                    title={v.skipTarget ? 'Pasa a la siguiente pendiente; esta queda en la cola' : 'No hay otras historias pendientes'}
                  >
                    ⏭ Saltar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!v.nextTarget}
                    onClick={() => v.nextTarget && actions.select(v.nextTarget.id)}
                    title={v.nextTarget ? undefined : 'Es la última historia de la cola'}
                  >
                    Siguiente historia →
                  </button>
                </div>
              )}
            </>
          )
        ) : (
          <>
            <h2 id="story-title" className="h-md">
              Sin historia actual
            </h2>
            <p className="muted">
              {isOwner
                ? 'Agrega una historia para estimarla. Puedes votar igualmente sin historia.'
                : 'El host aún no eligió una historia. Puedes votar igualmente.'}
            </p>
          </>
        )}
      </section>

      <section className="panel story-queue" aria-labelledby="queue-title">
        <div className="panel-head">
          <h2 id="queue-title" className="eyebrow">
            Siguiente en cola
          </h2>
          <span className="mono muted small">{v.queue.length} pendientes</span>
        </div>
        {v.queue.length === 0 ? (
          <p className="muted small">No hay historias pendientes.</p>
        ) : (
          <ul className="story-list">
            {v.queue.map((s) => (
              <li key={s.id} className="story-item">
                {isOwner ? (
                  <button
                    type="button"
                    className="story-item-main"
                    onClick={() => actions.select(s.id)}
                    aria-label={`Estimar ahora: ${s.key ? `${s.key} ` : ''}${s.title}`}
                  >
                    {s.key && <span className="mono key">{s.key}</span>}
                    <span className="story-item-title">{s.title}</span>
                    <span aria-hidden="true">›</span>
                  </button>
                ) : (
                  <span className="story-item-main">
                    {s.key && <span className="mono key">{s.key}</span>}
                    <span className="story-item-title">{s.title}</span>
                  </span>
                )}
                {isOwner && <RemoveButton story={s} onRemove={actions.remove} />}
              </li>
            ))}
          </ul>
        )}
        {isOwner && (
          <details
            className="add-story"
            open={addOpen}
            onToggle={(e) => setAddOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary className="btn btn-ghost">＋ Agregar historia</summary>
            <StoryForm submitLabel="Agregar" onSubmit={actions.add} disabled={room.stories.length >= LIMITS.stories} />
          </details>
        )}
      </section>

      <section className="panel story-history" aria-labelledby="history-title">
        <div className="panel-head">
          <h2 id="history-title" className="eyebrow">
            Historial
          </h2>
          <span className="mono small success" title="Suma de estimaciones numéricas confirmadas">
            Velocidad: {formatNumber(v.velocity)} pts
          </span>
        </div>
        {v.history.length === 0 ? (
          <p className="muted small">Aún no hay historias estimadas.</p>
        ) : (
          <ul className="story-list">
            {v.history.map((s) => (
              <li key={s.id} className="story-item is-done">
                <span className="story-item-main">
                  {s.key && <span className="mono key">{s.key}</span>}
                  <span className="story-item-title">{s.title}</span>
                  <span className="chip chip-success chip-mono">{s.estimate}</span>
                </span>
                {isOwner && <RemoveButton story={s} onRemove={actions.remove} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RemoveButton({ story, onRemove }: { story: Story; onRemove: (id: string) => void }) {
  return (
    <button
      type="button"
      className="btn btn-icon btn-danger-ghost"
      aria-label={`Eliminar historia ${story.title}`}
      title="Eliminar"
      onClick={() => {
        if (window.confirm(`¿Eliminar "${story.title}"?`)) onRemove(story.id);
      }}
    >
      ✕
    </button>
  );
}

function StoryForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  disabled,
}: {
  initial?: Story;
  submitLabel: string;
  onSubmit: (title: string, key: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [key, setKey] = useState(initial?.key ?? '');
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const keyId = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setError('El título es obligatorio.');
      return;
    }
    onSubmit(t, key.trim().toUpperCase());
    if (!initial) {
      setTitle('');
      setKey('');
    }
    setError(null);
  };

  return (
    <form className="story-form" onSubmit={submit} noValidate>
      <div className="story-form-row">
        <div className="field field-key">
          <label htmlFor={keyId}>Clave (opcional)</label>
          <input
            id={keyId}
            type="text"
            className="mono"
            value={key}
            maxLength={LIMITS.storyKey}
            placeholder="CORE-142"
            autoCapitalize="characters"
            onChange={(e) => setKey(e.target.value.toUpperCase())}
          />
        </div>
        <div className="field">
          <label htmlFor={titleId}>Título</label>
          <input
            id={titleId}
            type="text"
            value={title}
            maxLength={LIMITS.storyTitle}
            placeholder="¿Qué vamos a estimar?"
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
          />
        </div>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {disabled && <p className="muted small">Límite de {LIMITS.stories} historias alcanzado.</p>}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={disabled}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
