import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DECKS, type Participant } from '@shared/protocol';
import { computeResults } from '../lib/results';
import { ResultsBanner, ResultsPanel } from './ResultsPanel';

const p = (name: string, vote: string): Participant => ({
  id: name,
  name,
  connected: true,
  role: 'player',
  hasVoted: true,
  vote,
  joinedAt: 0,
});
const votes = [p('Gastón', '8'), p('María', '8'), p('Sofía', '8'), p('Ana', '8'), p('Carlos', '5'), p('Pedro', '13')];
const deck = [...DECKS.fibonacci];

describe('ResultsPanel', () => {
  it('métricas, distribución con votantes y discrepancia', () => {
    const r = computeResults(votes, deck);
    render(<ResultsPanel results={r} deck={deck} deckId="fibonacci" isOwner={false} hasCurrentStory onRevote={() => {}} onConfirm={() => {}} />);
    expect(screen.getByTestId('metric-average')).toHaveTextContent('8,3');
    expect(screen.getByTestId('metric-median')).toHaveTextContent('8');
    expect(screen.getByTestId('metric-mode')).toHaveTextContent('8');
    expect(screen.getByText('4 de 6 votos (66,7%)')).toBeInTheDocument();
    expect(screen.getByTestId('metric-range')).toHaveTextContent('5 → 13');
    expect(screen.getByText('Votantes: Gastón, María, Sofía, Ana')).toBeInTheDocument();
    expect(screen.getByText(/Diferencia entre/)).toHaveTextContent('Diferencia entre Carlos (5) y Pedro (13).');
    expect(screen.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument();
  });

  it('tshirt oculta promedio y mediana', () => {
    const r = computeResults([p('A', 'M'), p('B', 'L')], [...DECKS.tshirt]);
    render(<ResultsPanel results={r} deck={[...DECKS.tshirt]} deckId="tshirt" isOwner={false} hasCurrentStory onRevote={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByTestId('metric-average')).not.toBeInTheDocument();
    expect(screen.queryByTestId('metric-median')).not.toBeInTheDocument();
    expect(screen.getByTestId('metric-mode')).toHaveTextContent('L');
  });

  it('owner: estimación final por defecto la moda, confirma y vota de nuevo', async () => {
    const onConfirm = vi.fn();
    const onRevote = vi.fn();
    const r = computeResults(votes, deck);
    render(<ResultsPanel results={r} deck={deck} deckId="fibonacci" isOwner hasCurrentStory onRevote={onRevote} onConfirm={onConfirm} />);
    expect(screen.getByLabelText('Puntaje final estimado')).toHaveValue('8');
    await userEvent.selectOptions(screen.getByLabelText('Puntaje final estimado'), '13');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar 13 & siguiente/ }));
    expect(onConfirm).toHaveBeenCalledWith('13');
    await userEvent.click(screen.getByRole('button', { name: /Votar de nuevo/ }));
    expect(onRevote).toHaveBeenCalled();
  });

  it('sin historia actual: confirmar deshabilitado con explicación', () => {
    const r = computeResults(votes, deck);
    render(<ResultsPanel results={r} deck={deck} deckId="fibonacci" isOwner hasCurrentStory={false} onRevote={() => {}} onConfirm={() => {}} />);
    const btn = screen.getByRole('button', { name: /Confirmar/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAccessibleDescription(/Agrega o selecciona una historia/);
  });
});

describe('ResultsBanner', () => {
  it('Mayoría con valor y %', () => {
    render(<ResultsBanner results={computeResults(votes, deck)} />);
    expect(screen.getByRole('heading', { name: /Mayoría: 8/ })).toHaveTextContent('66,7% mayoría');
  });
  it('sin mayoría absoluta dice "más votado", no "mayoría"', () => {
    render(<ResultsBanner results={computeResults([p('A', '3'), p('B', '3'), p('C', '5'), p('D', '8')], deck)} />);
    const h = screen.getByRole('heading', { name: /Más votado: 3/ });
    expect(h).toHaveTextContent('50% más votado');
    expect(h).not.toHaveTextContent(/mayoría/i);
  });
  it('Consenso', () => {
    render(<ResultsBanner results={computeResults([p('A', '3'), p('B', '3')], deck)} />);
    expect(screen.getByRole('heading', { name: /Consenso: 3/ })).toBeInTheDocument();
  });
});
