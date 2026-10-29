import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DECKS, type DeckId } from '@shared/protocol';
import { getClientId, getSavedName, saveName, validateName } from '../lib/identity';
import { useSocket } from '../lib/socket';
import { errorMessage } from '../lib/errors';
import { parseRoomInput, roomPath } from '../lib/roomCode';
import { NameField } from '../components/NameForm';
import { Logo } from '../components/Logo';
import { Card } from '../components/Card';
import { SkinPicker } from '../components/SkinPicker';

const CREATE_TIMEOUT_MS = 8000;
type Tab = 'create' | 'join';

const DECK_INFO: Record<DeckId, { title: string; desc: string; badge: string }> = {
  fibonacci: {
    title: 'Fibonacci estándar',
    desc: 'Secuencia ideal para complejidad técnica y para reducir sesgos relativos.',
    badge: 'Recomendado',
  },
  tshirt: {
    title: 'T-Shirt sizes',
    desc: 'Estimación cualitativa rápida para discovery, épicas o refinamiento temprano.',
    badge: 'Alto nivel',
  },
};

export function Home({ initialTab = 'create' }: { initialTab?: Tab }) {
  const socket = useSocket();
  const navigate = useNavigate();
  const [name, setName] = useState(getSavedName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [deckId, setDeckId] = useState<DeckId>('fibonacci');
  const [preview, setPreview] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameId = useId();
  const nameErrorId = useId();
  const joinId = useId();

  const checkName = (): string | null => {
    const problem = validateName(name);
    if (problem) {
      setNameError(problem);
      document.getElementById(nameId)?.focus();
      return null;
    }
    const trimmed = name.trim();
    saveName(trimmed);
    return trimmed;
  };

  const create = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = checkName();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    if (!socket.connected && !socket.active) socket.connect();
    socket.timeout(CREATE_TIMEOUT_MS).emit('room:create', { name: trimmed, clientId: getClientId(), deckId }, (err, res) => {
      setBusy(false);
      if (err) setError(errorMessage('TIMEOUT'));
      else if (res.ok) navigate(roomPath(res.roomId));
      else setError(errorMessage(res.error));
    });
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    const code = parseRoomInput(joinInput);
    if (!code) {
      setError('Código o enlace no válido. El código tiene 6 caracteres, p. ej. AB7K9X.');
      return;
    }
    if (!checkName()) return;
    navigate(roomPath(code));
  };

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const next = tab === 'create' ? 'join' : 'create';
      setTab(next);
      setError(null);
      document.getElementById(`tab-${next}`)?.focus();
    }
  };

  return (
    <div className="home-bg">
      <main className="home">
        <div className="home-card">
          <header className="home-hero">
            <span className="chip chip-live mono">
              <Logo size={18} withText={false} /> SALAS EN TIEMPO REAL <span className="live-dot" aria-hidden="true" />
            </span>
            <h1 className="h-xl">Iniciar sesión de estimación</h1>
            <p className="muted lead">
              Consenso sin fricción. Sin cuentas ni contraseñas: crea tu mesa o únete a tu equipo en segundos.
            </p>
          </header>

          <div className="panel name-card home-name">
            <NameField
              id={nameId}
              errorId={nameErrorId}
              title="¿Cómo te llamas?"
              value={name}
              error={nameError}
              onChange={(v) => {
                setName(v);
                setNameError(null);
              }}
            />
          </div>

          <div className="tabs" role="tablist" aria-label="Elige una opción">
            <button
              id="tab-create"
              type="button"
              role="tab"
              aria-selected={tab === 'create'}
              aria-controls="panel-create"
              tabIndex={tab === 'create' ? 0 : -1}
              className="tab"
              onClick={() => {
                setTab('create');
                setError(null);
              }}
              onKeyDown={onTabKey}
            >
              ⊕ Crear nuevo Room
            </button>
            <button
              id="tab-join"
              type="button"
              role="tab"
              aria-selected={tab === 'join'}
              aria-controls="panel-join"
              tabIndex={tab === 'join' ? 0 : -1}
              className="tab"
              onClick={() => {
                setTab('join');
                setError(null);
              }}
              onKeyDown={onTabKey}
            >
              ⇥ Unirse a Room existente
            </button>
          </div>

          {tab === 'create' ? (
            <form id="panel-create" role="tabpanel" aria-labelledby="tab-create" className="tab-panel" onSubmit={create} noValidate>
              <fieldset className="deck-picker">
                <legend className="section-head">
                  <span className="h-sm">Selecciona la baraja de estimación</span>
                  <span className="muted small">Modificable dentro del Room</span>
                </legend>
                <div className="deck-options">
                  {(Object.keys(DECKS) as DeckId[]).map((id) => (
                    <label key={id} className={`deck-option${deckId === id ? ' is-checked' : ''}`}>
                      <input
                        type="radio"
                        name="deck"
                        value={id}
                        checked={deckId === id}
                        onChange={() => {
                          setDeckId(id);
                          setPreview(null);
                        }}
                        className="sr-only"
                      />
                      <span className="deck-option-head">
                        <span className="h-md">{DECK_INFO[id].title}</span>
                        <span className={`chip chip-xs ${id === 'fibonacci' ? 'chip-primary' : 'chip-muted'}`}>
                          {DECK_INFO[id].badge}
                        </span>
                      </span>
                      <span className="muted small">{DECK_INFO[id].desc}</span>
                      <span className="deck-chips" aria-label={`Cartas: ${DECKS[id].join(', ')}`}>
                        {DECKS[id].map((v) => (
                          <span key={v} className="mini-chip mono" aria-hidden="true">
                            {v}
                          </span>
                        ))}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <section className="panel hand-preview" aria-labelledby="preview-title">
                <div className="section-head">
                  <h2 id="preview-title" className="eyebrow">
                    Previsualización de cartas en mano
                  </h2>
                  <span className="section-head-end">
                    <span className="mono muted small">{DECKS[deckId].length} cartas</span>
                    <SkinPicker />
                  </span>
                </div>
                <div className="hand hand-preview-cards" role="group" aria-label="Previsualización (no vota)">
                  {DECKS[deckId].map((v) => (
                    <Card key={v} value={v} size="hand" selected={preview === v} onSelect={() => setPreview(preview === v ? null : v)} />
                  ))}
                </div>
              </section>

              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn-primary btn-xl" disabled={busy}>
                {busy ? 'Creando…' : 'Crear Room y ser Owner 👑'}
              </button>
            </form>
          ) : (
            <form id="panel-join" role="tabpanel" aria-labelledby="tab-join" className="tab-panel" onSubmit={join} noValidate>
              <div className="panel">
                <label htmlFor={joinId} className="h-sm">
                  Código o enlace de la sala
                </label>
                <input
                  id={joinId}
                  type="text"
                  className="input-lg mono"
                  value={joinInput}
                  placeholder="AB7K9X o https://…/r/AB7K9X"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={error ? true : undefined}
                  onChange={(e) => {
                    setJoinInput(e.target.value);
                    setError(null);
                  }}
                />
                <p className="muted small">Pega el enlace que te compartieron o escribe el código de 6 caracteres.</p>
              </div>
              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn-primary btn-xl">
                Unirse a la sala →
              </button>
            </form>
          )}
        </div>

        <ul className="info-cards">
          <li>
            <span className="info-icon" aria-hidden="true">
              🔓
            </span>
            <div>
              <strong>Sin registro ni contraseñas</strong>
              <span className="muted small">Solo tu nombre. La sala existe mientras tu equipo la use.</span>
            </div>
          </li>
          <li>
            <span className="info-icon" aria-hidden="true">
              ⚡
            </span>
            <div>
              <strong>Sincronización WebSocket</strong>
              <span className="muted small">Votos ocultos hasta revelar y cambios en tiempo real para todos.</span>
            </div>
          </li>
          <li>
            <span className="info-icon" aria-hidden="true">
              👑
            </span>
            <div>
              <strong>Auto-transferencia de owner</strong>
              <span className="muted small">Si el host se desconecta, el rol pasa al siguiente participante conectado.</span>
            </div>
          </li>
        </ul>
      </main>
    </div>
  );
}
