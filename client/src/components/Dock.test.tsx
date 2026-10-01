import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DECKS } from '@shared/protocol';
import { Dock } from './Dock';

const base = {
  deck: DECKS.fibonacci,
  deckId: 'fibonacci' as const,
  disabledReason: null,
  isOwner: false,
  onDeckChange: () => {},
};

describe('Dock', () => {
  it('cartas como botones con aria-pressed; ½ incluido; chip con el voto', () => {
    render(<Dock {...base} selected="8" onSelect={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(DECKS.fibonacci.length);
    expect(screen.getByRole('button', { name: 'Votar 8' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Votar Medio punto' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/Tu voto:/)).toHaveTextContent('Tu voto: 8 (toca otra para cambiar)');
  });

  it('seleccionar emite el valor; volver a pulsar la seleccionada retira el voto', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<Dock {...base} selected={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Votar 5' }));
    expect(onSelect).toHaveBeenLastCalledWith('5');
    rerender(<Dock {...base} selected="5" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Votar 5' }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('modo espectador deshabilita la mano y lo explica', async () => {
    const onSelect = vi.fn();
    render(<Dock {...base} selected={null} disabledReason="Modo espectador: no votas" onSelect={onSelect} />);
    expect(screen.getByText('Modo espectador: no votas')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Votar 3' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('solo el owner ve el selector de baraja', () => {
    const { rerender } = render(<Dock {...base} selected={null} onSelect={() => {}} />);
    expect(screen.queryByLabelText('Baraja')).not.toBeInTheDocument();
    rerender(<Dock {...base} isOwner selected={null} onSelect={() => {}} />);
    expect(screen.getByLabelText('Baraja')).toHaveValue('fibonacci');
  });
});
