import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DECKS, type RoomState } from '@shared/protocol';
import { ShareModal, shareLinks } from './ShareModal';

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn(async (text: string) => `data:image/png;base64,${btoa(text)}`) },
}));

const room: RoomState = {
  id: 'AB7K9X',
  ownerId: 'p1',
  selfId: 'p2',
  deckId: 'fibonacci',
  deck: [...DECKS.fibonacci],
  stories: [],
  currentStoryId: null,
  revealed: false,
  roundStartedAt: 0,
  revealedAt: null,
  serverNow: 0,
  participants: [
    { id: 'p1', name: 'Gastón Ferrufino', connected: true, role: 'player', hasVoted: true, vote: null, joinedAt: 1 },
    { id: 'p2', name: 'Ana', connected: true, role: 'player', hasVoted: false, vote: null, joinedAt: 2 },
    { id: 'p3', name: 'Pedro', connected: false, role: 'spectator', hasVoted: false, vote: null, joinedAt: 3 },
  ],
};

describe('ShareModal', () => {
  it('enlace /r/CODE, QR local, canales y participantes con iniciales', async () => {
    render(<ShareModal room={room} onClose={() => {}} notify={() => {}} />);
    const url = `${window.location.origin}/r/AB7K9X`;
    expect(screen.getByRole('dialog', { name: /Invitar al equipo/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Enlace de la sala')).toHaveValue(url);
    await waitFor(() => expect(screen.getByAltText(/Código QR/)).toHaveAttribute('src', `data:image/png;base64,${btoa(url)}`));
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', expect.stringContaining('https://wa.me/?text='));
    expect(screen.getByRole('link', { name: /Telegram/ })).toHaveAttribute('href', expect.stringContaining('https://t.me/share/url?url='));
    expect(screen.getByRole('link', { name: /Email/ })).toHaveAttribute('href', expect.stringMatching(/^mailto:/));
    expect(screen.getByText('GF')).toBeInTheDocument();
    expect(screen.getByText('Host 👑')).toBeInTheDocument();
    expect(screen.getByText('Listo')).toBeInTheDocument();
    expect(screen.getByText('Desconectado')).toBeInTheDocument();
    expect(screen.getByText(/tras una breve espera/)).toBeInTheDocument();
    expect(screen.queryByText(/30 segundos/)).not.toBeInTheDocument();
  });

  it('Slack copia el enlace y avisa', async () => {
    const notify = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ShareModal room={room} onClose={() => {}} notify={notify} />);
    await userEvent.click(screen.getByRole('button', { name: /Slack/ }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/r/AB7K9X`);
    expect(notify).toHaveBeenCalledWith('Enlace copiado: pégalo en Slack');
  });

  it('Esc cierra y el foco queda atrapado en el diálogo', async () => {
    const onClose = vi.fn();
    render(<ShareModal room={room} onClose={onClose} notify={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
    // Shift+Tab desde el primero va al último ("Volver a la mesa").
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Volver a la mesa' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('shareLinks codifica el enlace', () => {
    const l = shareLinks('https://x.test/r/AB7K9X', 'AB7K9X');
    expect(l.telegram).toContain(encodeURIComponent('https://x.test/r/AB7K9X'));
  });
});
