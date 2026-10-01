import { useId } from 'react';
import { DECKS, type DeckId } from '@shared/protocol';
import { Card } from './Card';

export const DECK_NAMES: Record<DeckId, string> = {
  fibonacci: 'Fibonacci',
  tshirt: 'T-Shirt',
};

interface Props {
  deck: readonly string[];
  deckId: DeckId;
  selected: string | null;
  /** Motivo por el que no se puede votar (null = puede votar). */
  disabledReason: string | null;
  isOwner: boolean;
  onSelect: (value: string | null) => void;
  onDeckChange: (deckId: DeckId) => void;
}

/** "Tu baraja": mano del jugador. Pulsar la carta seleccionada retira el voto. */
export function Dock({ deck, deckId, selected, disabledReason, isOwner, onSelect, onDeckChange }: Props) {
  const selectId = useId();
  const disabled = disabledReason !== null;
  return (
    <section className="dock" aria-labelledby="dock-title">
      <div className="dock-head">
        <h2 id="dock-title" className="h-md">
          Tu baraja {DECK_NAMES[deckId]}
        </h2>
        {disabled ? (
          <span className="chip chip-muted">{disabledReason}</span>
        ) : selected ? (
          <span className="chip chip-primary" aria-live="polite">
            Tu voto: <strong>{selected}</strong> <span className="hide-sm">(toca otra para cambiar)</span>
          </span>
        ) : (
          <span className="chip chip-muted" aria-live="polite">
            Elige una carta
          </span>
        )}
        {isOwner && (
          <span className="dock-deck-select">
            <label htmlFor={selectId} className="sr-only-sm">
              Baraja
            </label>
            <select id={selectId} value={deckId} onChange={(e) => onDeckChange(e.target.value as DeckId)}>
              {(Object.keys(DECKS) as DeckId[]).map((id) => (
                <option key={id} value={id}>
                  {DECK_NAMES[id]}
                </option>
              ))}
            </select>
          </span>
        )}
      </div>
      <div className="hand" role="group" aria-label="Cartas para votar">
        {deck.map((value) => (
          <Card
            key={value}
            value={value}
            size="hand"
            selected={value === selected}
            disabled={disabled}
            onSelect={() => onSelect(value === selected ? null : value)}
          />
        ))}
      </div>
    </section>
  );
}
