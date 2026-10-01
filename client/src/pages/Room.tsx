import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Ack, DeckId } from '@shared/protocol';
import { useSocket } from '../lib/socket';
import { getSavedName, saveName, validateName } from '../lib/identity';
import { errorMessage } from '../lib/errors';
import { computeResults } from '../lib/results';
import { roundElapsed } from '../lib/time';
import { useRoom } from '../hooks/useRoom';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useNow } from '../hooks/useNow';
import { useToast } from '../hooks/useToast';
import { NameForm } from '../components/NameForm';
import { Header } from '../components/Header';
import { StoryPanel, type StoryActions } from '../components/StoryPanel';
import { VoteProgress } from '../components/VoteProgress';
import { Table } from '../components/Table';
import { Dock } from '../components/Dock';
import { ResultsBanner, ResultsPanel } from '../components/ResultsPanel';
import { ShareModal } from '../components/ShareModal';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';
import { ConnectionIndicator } from '../components/ConnectionIndicator';
import { Logo } from '../components/Logo';
import { NotFound } from './NotFound';

export function Room() {
  const { code = '' } = useParams();
  const socket = useSocket();
  const status = useConnectionStatus(socket);
  const [name, setName] = useState<string | null>(() => (validateName(getSavedName()) ? null : getSavedName()));
  const [editingName, setEditingName] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { toast, show: showToast } = useToast();
  const { room, joinError, clockOffset, rejoin } = useRoom(socket, code, name);
  const now = useNow(!!room && !room.revealed);
  const prevOwner = useRef<string | null>(null);

  const results = useMemo(() => (room?.revealed ? computeResults(room.participants, room.deck) : null), [room]);

  const handleAck = useCallback(
    (r: Ack) => {
      if (r.ok) return;
      showToast(errorMessage(r.error));
      if (r.error === 'NOT_IN_ROOM') rejoin();
    },
    [rejoin, showToast],
  );

  useEffect(() => {
    if (joinError === 'INVALID_INPUT') setName(null);
    else if (joinError === 'TIMEOUT') showToast(errorMessage('TIMEOUT'));
  }, [joinError, showToast]);

  // Toast cuando cambia el host (manual o auto-transferencia).
  useEffect(() => {
    if (!room) return;
    if (prevOwner.current && prevOwner.current !== room.ownerId) {
      const owner = room.participants.find((p) => p.id === room.ownerId);
      if (owner) showToast(owner.id === room.selfId ? '👑 Ahora eres el host' : `👑 ${owner.name} ahora es el host`);
    }
    prevOwner.current = room.ownerId;
  }, [room, showToast]);

  if (joinError === 'ROOM_NOT_FOUND') return <NotFound />;
  if (joinError === 'RATE_LIMITED')
    return <NotFound title="Demasiados intentos" message="Se probaron demasiados códigos de sala desde tu red. Espera un minuto y vuelve a intentarlo." />;

  if (!name) {
    return (
      <div className="home-bg">
        <main className="gate">
          <div className="gate-logo">
            <Logo size={40} />
          </div>
          <p className="muted center">
            Vas a entrar a la sala <span className="mono room-code-value">{code.toUpperCase()}</span>
          </p>
          <NameForm
            initialName={getSavedName()}
            onSubmit={(n) => {
              saveName(n);
              setName(n);
            }}
          />
          <p className="center">
            <Link to="/" className="tap-target">
              Volver al inicio
            </Link>
          </p>
        </main>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="home-bg">
        <main className="gate">
          <div className="panel center">
            <Logo size={40} withText={false} />
            <p>Entrando a la sala…</p>
            <ConnectionIndicator status={status} />
          </div>
        </main>
      </div>
    );
  }

  const me = room.participants.find((p) => p.id === room.selfId);
  const isOwner = room.ownerId === room.selfId;
  const spectator = me?.role === 'spectator';
  const myVote = me?.vote ?? null;
  const elapsed = roundElapsed(room.roundStartedAt, room.revealedAt, clockOffset, now);
  const hasCurrentStory = room.currentStoryId !== null;

  const castVote = (value: string | null) => socket.emit('vote:cast', { value }, handleAck);
  const reveal = () => socket.emit('round:reveal', handleAck);
  const reset = () => socket.emit('round:reset', handleAck);
  const confirm = (estimate: string) => socket.emit('round:confirm', { estimate }, handleAck);
  const setDeck = (deckId: DeckId) => {
    if (deckId === room.deckId) return;
    const anyVote = room.participants.some((p) => p.hasVoted);
    if (!anyVote || window.confirm('Cambiar la baraja reinicia la ronda actual. ¿Continuar?')) {
      socket.emit('deck:set', { deckId }, handleAck);
    }
  };
  const toggleSpectator = () => socket.emit('role:set', { role: spectator ? 'player' : 'spectator' }, handleAck);
  const makeOwner = (participantId: string, pName: string) => {
    if (window.confirm(`¿Ceder el rol de host a ${pName}?`)) socket.emit('owner:transfer', { participantId }, handleAck);
  };
  const changeName = (n: string) => {
    saveName(n);
    setName(n);
    setEditingName(false);
    socket.emit('name:change', { name: n }, handleAck);
  };
  const storyActions: StoryActions = {
    add: (title, key) => socket.emit('story:add', { title, key }, handleAck),
    update: (storyId, title, key) => socket.emit('story:update', { storyId, title, key }, handleAck),
    remove: (storyId) => socket.emit('story:remove', { storyId }, handleAck),
    select: (storyId) => socket.emit('story:select', { storyId }, handleAck),
  };

  const disabledReason = spectator
    ? 'Modo espectador: no votas'
    : status !== 'connected'
      ? 'Sin conexión'
      : null;

  return (
    <div className={`room${room.revealed ? ' is-revealed' : ''}`}>
      <Header
        room={room}
        elapsedMs={elapsed}
        status={status}
        onShare={() => setShareOpen(true)}
        onToggleSpectator={toggleSpectator}
        onEditName={() => setEditingName(true)}
      />

      {results && <ResultsBanner results={results} />}

      <div className="arena">
        <aside className="arena-side">
          <StoryPanel room={room} isOwner={isOwner} actions={storyActions} />
        </aside>
        <main className="arena-main">
          {!room.revealed && <VoteProgress participants={room.participants} />}
          <Table room={room} results={results} isOwner={isOwner} onReveal={reveal} onReset={reset} onMakeOwner={makeOwner} />
          {results && (
            <ResultsPanel
              results={results}
              deck={room.deck}
              deckId={room.deckId}
              isOwner={isOwner}
              hasCurrentStory={hasCurrentStory}
              onRevote={reset}
              onConfirm={confirm}
            />
          )}
        </main>
      </div>

      {!room.revealed && (
        <Dock
          deck={room.deck}
          deckId={room.deckId}
          selected={myVote}
          disabledReason={disabledReason}
          isOwner={isOwner}
          onSelect={castVote}
          onDeckChange={setDeck}
        />
      )}

      {shareOpen && <ShareModal room={room} onClose={() => setShareOpen(false)} notify={showToast} />}

      {editingName && (
        <Modal labelledBy="name-modal-title" onClose={() => setEditingName(false)} className="name-modal">
          <span id="name-modal-title" className="sr-only">
            Cambiar nombre
          </span>
          <NameForm
            title="Cambiar nombre"
            submitLabel="Guardar"
            initialName={me?.name ?? name}
            onSubmit={changeName}
            onCancel={() => setEditingName(false)}
          />
        </Modal>
      )}

      <Toast message={toast} />
    </div>
  );
}
