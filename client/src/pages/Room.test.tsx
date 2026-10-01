import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { DECKS, type Participant, type RoomState } from '@shared/protocol';
import { SocketContext } from '../lib/socket';
import { getClientId, saveName } from '../lib/identity';
import { FakeSocket } from '../test/fakeSocket';
import { App } from '../App';

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async () => 'data:image/png;base64,AA') } }));

function Where() {
  const loc = useLocation();
  return <span data-testid="path">{loc.pathname}</span>;
}

function renderAt(path: string, socket: FakeSocket) {
  return render(
    <SocketContext.Provider value={socket.asSocket()}>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
        <Where />
      </MemoryRouter>
    </SocketContext.Provider>,
  );
}

const ME = 'pub-me';
const part = (id: string, name: string, over: Partial<Participant> = {}): Participant => ({
  id,
  name,
  connected: true,
  role: 'player',
  hasVoted: false,
  vote: null,
  joinedAt: 1,
  ...over,
});

function state(over: Partial<RoomState> = {}): RoomState {
  return {
    id: 'AB7K9X',
    selfId: ME,
    ownerId: ME,
    deckId: 'fibonacci',
    deck: [...DECKS.fibonacci],
    stories: [{ id: 's1', key: 'CORE-142', title: 'Implementar webhook de pagos', estimate: null, estimatedAt: null }],
    currentStoryId: 's1',
    revealed: false,
    roundStartedAt: 1_000_000,
    revealedAt: null,
    serverNow: 1_000_000,
    participants: [part(ME, 'Ana'), part('pub-2', 'Bruno', { connected: false, hasVoted: true })],
    ...over,
  };
}

function joinedSocket() {
  const socket = new FakeSocket();
  socket.responders['room:join'] = () => ({ ok: true });
  return socket;
}

afterEach(() => vi.useRealTimers());

describe('Rutas', () => {
  it('/room/:id redirige a /r/:ID en mayúsculas', () => {
    saveName('Ana');
    renderAt('/room/ab7k9x', joinedSocket());
    expect(screen.getByTestId('path')).toHaveTextContent('/r/AB7K9X');
  });
});

describe('Room', () => {
  it('sin nombre guardado pide el nombre antes de unirse y lo recuerda', async () => {
    const socket = joinedSocket();
    renderAt('/r/ab7k9x', socket);
    expect(socket.count('room:join')).toBe(0);
    await userEvent.type(screen.getByLabelText('¿Cómo te llamas?'), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar a la sala' }));
    expect(socket.emitted.find((e) => e.event === 'room:join')?.args[0]).toEqual({
      roomId: 'AB7K9X',
      name: 'Ana',
      clientId: getClientId(),
    });
    expect(window.localStorage.getItem('pp:name')).toBe('Ana');
  });

  it('re-emite room:join al reconectar el socket', () => {
    saveName('Ana');
    const socket = joinedSocket();
    renderAt('/r/AB7K9X', socket);
    const initial = socket.count('room:join');
    act(() => {
      socket.serverEmit('disconnect');
      socket.serverEmit('connect');
    });
    expect(socket.count('room:join')).toBe(initial + 1);
  });

  it('ROOM_NOT_FOUND y RATE_LIMITED muestran mensajes claros', () => {
    saveName('Ana');
    const s1 = new FakeSocket();
    s1.responders['room:join'] = () => ({ ok: false, error: 'ROOM_NOT_FOUND' });
    const { unmount } = renderAt('/r/ZZZZZZ', s1);
    expect(screen.getByRole('heading', { name: 'Sala no encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    unmount();
    const s2 = new FakeSocket();
    s2.responders['room:join'] = () => ({ ok: false, error: 'RATE_LIMITED' });
    renderAt('/r/ZZZZZZ', s2);
    expect(screen.getByRole('heading', { name: 'Demasiados intentos' })).toBeInTheDocument();
  });

  it('arena owner: historia, progreso, asientos, revelar y votar', async () => {
    saveName('Ana');
    const socket = joinedSocket();
    renderAt('/r/AB7K9X', socket);
    act(() => socket.serverEmit('room:state', state()));

    expect(screen.getByRole('heading', { name: 'Implementar webhook de pagos' })).toBeInTheDocument();
    expect(screen.getByText('Historia 1 de 1')).toBeInTheDocument();
    expect(screen.getByText('CORE-142', { selector: '.chip-key' })).toBeInTheDocument();
    // Progreso: Bruno desconectado pero votó → cuenta; 1/2.
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    const seats = within(screen.getByRole('list', { name: 'Participantes en la mesa' }));
    expect(seats.getByText('Pensando…')).toBeInTheDocument();
    expect(seats.getByText('Conectando…')).toBeInTheDocument();
    expect(seats.getByRole('img', { name: 'Voto oculto' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Votar 8' }));
    expect(socket.emitted.find((e) => e.event === 'vote:cast')?.args[0]).toEqual({ value: '8' });
    await userEvent.click(screen.getByRole('button', { name: /Revelar votos/ }));
    expect(socket.count('round:reveal')).toBe(1);
  });

  it('no-owner: sin acciones de owner; espectador deshabilita la mano', async () => {
    saveName('Ana');
    const socket = joinedSocket();
    renderAt('/r/AB7K9X', socket);
    act(() => socket.serverEmit('room:state', state({ ownerId: 'pub-2' })));
    expect(screen.queryByRole('button', { name: /Revelar votos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Agregar historia/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Vista espectador/ }));
    expect(socket.emitted.find((e) => e.event === 'role:set')?.args[0]).toEqual({ role: 'spectator' });

    act(() =>
      socket.serverEmit(
        'room:state',
        state({ ownerId: 'pub-2', participants: [part(ME, 'Ana', { role: 'spectator' }), part('pub-2', 'Bruno')] }),
      ),
    );
    expect(screen.getByRole('button', { name: /Vista espectador/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Votar 5' })).toBeDisabled();
    expect(screen.getAllByText('Espectador').length).toBeGreaterThan(0);
  });

  it('cronómetro corrige desfase con serverNow y se congela al revelar', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(500_000); // reloj local muy distinto al del servidor
    saveName('Ana');
    const socket = joinedSocket();
    renderAt('/r/AB7K9X', socket);
    act(() => socket.serverEmit('room:state', state({ roundStartedAt: 1_000_000, serverNow: 1_065_000 })));
    expect(screen.getByTestId('round-timer')).toHaveTextContent('01:05');
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByTestId('round-timer')).toHaveTextContent('01:08');
    act(() =>
      socket.serverEmit(
        'room:state',
        state({
          revealed: true,
          revealedAt: 1_090_000,
          serverNow: 1_090_000,
          participants: [part(ME, 'Ana', { hasVoted: true, vote: '5' })],
        }),
      ),
    );
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByTestId('round-timer')).toHaveTextContent('01:30');
  });

  it('resultados: cartas con grupo, confirmar envía round:confirm', async () => {
    saveName('Ana');
    const socket = joinedSocket();
    renderAt('/r/AB7K9X', socket);
    act(() =>
      socket.serverEmit(
        'room:state',
        state({
          revealed: true,
          revealedAt: 1_100_000,
          participants: [
            part(ME, 'Ana', { hasVoted: true, vote: '8' }),
            part('b', 'Bruno', { hasVoted: true, vote: '8' }),
            part('c', 'Carla', { hasVoted: true, vote: '13' }),
          ],
        }),
      ),
    );
    expect(screen.getByRole('heading', { name: /Mayoría: 8/ })).toBeInTheDocument();
    const seats = within(screen.getByRole('list', { name: 'Participantes en la mesa' }));
    expect(seats.getAllByRole('img', { name: 'Carta 8' })[0]).toHaveClass('group-majority');
    expect(seats.getByRole('img', { name: 'Carta 13' })).toHaveClass('group-higher');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar 8 & siguiente/ }));
    expect(socket.emitted.find((e) => e.event === 'round:confirm')?.args[0]).toEqual({ estimate: '8' });
  });

  it('sin mayoría absoluta: asientos, leyenda, hub y métrica dicen "Más votado"/"Moda"', () => {
    saveName('Ana');
    const socket = joinedSocket();
    renderAt('/r/AB7K9X', socket);
    act(() =>
      socket.serverEmit(
        'room:state',
        state({
          revealed: true,
          revealedAt: 1_100_000,
          participants: [
            part(ME, 'Ana', { hasVoted: true, vote: '3' }),
            part('b', 'Bruno', { hasVoted: true, vote: '3' }),
            part('c', 'Carla', { hasVoted: true, vote: '5' }),
            part('d', 'Dani', { hasVoted: true, vote: '8' }),
            part('e', 'Eva', { hasVoted: true, vote: '13' }),
          ],
        }),
      ),
    );
    const seats = within(screen.getByRole('list', { name: 'Participantes en la mesa' }));
    expect(seats.getAllByText('Más votado')).toHaveLength(2);
    expect(seats.queryByText('Mayoría')).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Leyenda de colores' })).toHaveTextContent('Más votado (3)');
    expect(screen.queryByText('Moda (mayoría)')).not.toBeInTheDocument();
    expect(screen.getByText('Moda', { selector: '.metric-label' })).toBeInTheDocument();
    expect(screen.queryByText(/mayoría/i)).not.toBeInTheDocument();
  });

  it('con mayoría absoluta mantiene "Mayoría"', () => {
    saveName('Ana');
    const socket = joinedSocket();
    renderAt('/r/AB7K9X', socket);
    act(() =>
      socket.serverEmit(
        'room:state',
        state({
          revealed: true,
          revealedAt: 1_100_000,
          participants: [
            part(ME, 'Ana', { hasVoted: true, vote: '3' }),
            part('b', 'Bruno', { hasVoted: true, vote: '3' }),
            part('c', 'Carla', { hasVoted: true, vote: '5' }),
          ],
        }),
      ),
    );
    const seats = within(screen.getByRole('list', { name: 'Participantes en la mesa' }));
    expect(seats.getAllByText('Mayoría')).toHaveLength(2);
    expect(screen.getByText('Moda (mayoría)')).toBeInTheDocument();
  });

  it('toast al cambiar el host', () => {
    saveName('Ana');
    const socket = joinedSocket();
    renderAt('/r/AB7K9X', socket);
    act(() => socket.serverEmit('room:state', state({ ownerId: 'pub-2' })));
    act(() => socket.serverEmit('room:state', state({ ownerId: ME })));
    expect(screen.getByText('👑 Ahora eres el host')).toBeInTheDocument();
    act(() => socket.serverEmit('room:state', state({ ownerId: 'pub-2' })));
    expect(screen.getByText('👑 Bruno ahora es el host')).toBeInTheDocument();
  });

  it('owner agrega historia y abre el modal de compartir', async () => {
    saveName('Ana');
    const socket = joinedSocket();
    renderAt('/r/AB7K9X', socket);
    act(() => socket.serverEmit('room:state', state({ stories: [], currentStoryId: null })));
    await userEvent.type(screen.getByLabelText('Clave (opcional)'), 'core-7');
    await userEvent.type(screen.getByLabelText('Título'), 'Login con SSO');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(socket.emitted.find((e) => e.event === 'story:add')?.args[0]).toEqual({ title: 'Login con SSO', key: 'CORE-7' });

    await userEvent.click(screen.getByRole('button', { name: 'Compartir sala' }));
    expect(screen.getByRole('dialog', { name: /Invitar al equipo/ })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Home', () => {
  it('crea sala con nombre y baraja y navega a /r/:code', async () => {
    const socket = joinedSocket();
    socket.responders['room:create'] = () => ({ ok: true, roomId: 'NEW234' });
    renderAt('/', socket);
    await userEvent.type(screen.getByLabelText('¿Cómo te llamas?'), 'Ana');
    await userEvent.click(screen.getByRole('radio', { name: /T-Shirt sizes/ }));
    await userEvent.click(screen.getByRole('button', { name: /Crear Room y ser Owner/ }));
    expect(socket.emitted.find((e) => e.event === 'room:create')?.args[0]).toEqual({
      name: 'Ana',
      clientId: getClientId(),
      deckId: 'tshirt',
    });
    expect(screen.getByTestId('path')).toHaveTextContent('/r/NEW234');
  });

  it('unirse acepta un link completo y normaliza el código', async () => {
    const socket = joinedSocket();
    renderAt('/', socket);
    await userEvent.type(screen.getByLabelText('¿Cómo te llamas?'), 'Ana');
    await userEvent.click(screen.getByRole('tab', { name: /Unirse a Room existente/ }));
    await userEvent.type(screen.getByLabelText('Código o enlace de la sala'), 'https://poker.example.com/r/ab7k9x');
    await userEvent.click(screen.getByRole('button', { name: /Unirse a la sala/ }));
    expect(screen.getByTestId('path')).toHaveTextContent('/r/AB7K9X');
  });

  it('código inválido muestra error', async () => {
    renderAt('/', joinedSocket());
    await userEvent.click(screen.getByRole('tab', { name: /Unirse/ }));
    await userEvent.type(screen.getByLabelText('Código o enlace de la sala'), 'xyz');
    await userEvent.click(screen.getByRole('button', { name: /Unirse a la sala/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Código o enlace no válido');
  });
});
