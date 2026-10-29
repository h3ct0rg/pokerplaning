import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { DECKS } from '@shared/protocol';
import { Card, FaceDownCard, cardLabel } from '../components/Card';
import { SKINS, DEFAULT_SKIN, getSkin, isSkinId, skinStyle } from './index';
import { contrastRatio } from './contrast';
import { SKIN_STORAGE_KEY, getSkinId, resetSkinStore, setSkinId } from './store';
import classicSrc from './classic.tsx?raw';
import westSrc from './west.tsx?raw';
import futuristicSrc from './futuristic.tsx?raw';
import creaturesSrc from './creatures.tsx?raw';

describe('registro de skins', () => {
  it('4 skins con ids únicos y Clásico por defecto', () => {
    expect(SKINS.map((s) => s.id)).toEqual(['classic', 'west', 'futuristic', 'creatures']);
    expect(SKINS.map((s) => s.nombre)).toEqual(['Clásico', 'Viejo Oeste', 'Futurista', 'Criaturas']);
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length);
    expect(DEFAULT_SKIN).toBe('classic');
    expect(getSkin('desconocida').id).toBe('classic');
    expect(isSkinId('west')).toBe(true);
    expect(isSkinId('pokemon')).toBe(false);
  });

  it.each(SKINS.map((s) => [s.id, s] as const))('%s: contraste ≥ 4.5:1 del valor, seleccionado y grupos', (_id, s) => {
    const t = s.tokens;
    for (const fg of [t.cardFg, t.selectedFg, t.groupMajority, t.groupLower, t.groupHigher]) {
      expect(contrastRatio(fg, t.cardBg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(t.cardIndex, t.cardBg)).toBeGreaterThanOrEqual(3);
  });

  it('grupos distinguibles entre sí en cada skin', () => {
    for (const s of SKINS) {
      const { groupMajority, groupLower, groupHigher } = s.tokens;
      expect(new Set([groupMajority, groupLower, groupHigher]).size).toBe(3);
    }
  });

  it('sin propiedad intelectual de terceros en el arte ni en los textos', () => {
    const forbidden = /pok[eé]|pocket\s*monster|pikachu|pok[eé]\s*ball/i;
    for (const src of [classicSrc, westSrc, futuristicSrc, creaturesSrc]) expect(src).not.toMatch(forbidden);
    for (const s of SKINS) expect(`${s.nombre} ${s.descripcion}`).not.toMatch(forbidden);
  });

  it('skinStyle memoiza y expone las variables CSS', () => {
    expect(skinStyle('west')).toBe(skinStyle('west'));
    expect(skinStyle('west')).toMatchObject({ '--card-bg': getSkin('west').tokens.cardBg });
  });
});

describe('persistencia pp.skin', () => {
  it('por defecto clásico; guarda y relee', () => {
    expect(getSkinId()).toBe('classic');
    setSkinId('futuristic');
    expect(window.localStorage.getItem(SKIN_STORAGE_KEY)).toBe('futuristic');
    resetSkinStore();
    expect(getSkinId()).toBe('futuristic');
  });

  it('valor desconocido → clásico', () => {
    window.localStorage.setItem(SKIN_STORAGE_KEY, 'pokemon');
    resetSkinStore();
    expect(getSkinId()).toBe('classic');
  });

  it('localStorage que lanza → clásico sin romper', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const spySet = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    resetSkinStore();
    expect(getSkinId()).toBe('classic');
    expect(() => setSkinId('west')).not.toThrow();
    expect(getSkinId()).toBe('west');
    spy.mockRestore();
    spySet.mockRestore();
  });
});

describe('cartas por skin', () => {
  const values = [...new Set<string>([...DECKS.fibonacci, ...DECKS.tshirt])];

  it.each(SKINS.map((s) => s.id))('%s: el valor es texto (incl. ½, ?, ☕ y tallas) y se usa su arte', (id) => {
    const { container, unmount } = render(
      <div>
        {values.map((v) => (
          <Card key={v} value={v} skin={id} />
        ))}
      </div>,
    );
    for (const v of values) {
      const card = screen.getByRole('img', { name: `Carta ${cardLabel(v)}` });
      expect(card).toHaveClass(`skin-${id}`);
      expect(card.querySelector('.pcard-value')?.textContent).toBe(v);
    }
    expect(container.querySelector(`use[href="#pp-skin-${id}-front"]`)).not.toBeNull();
    unmount();
  });

  it.each(SKINS.map((s) => s.id))('%s: boca abajo usa el dorso y conserva "Voto oculto" con pie inferior "Oculto"', (id) => {
    const { container } = render(<FaceDownCard skin={id} />);
    const card = screen.getByRole('img', { name: 'Voto oculto' });
    expect(card).toHaveTextContent('Oculto');
    // El pie va en el borde inferior, no como bloque central sobre el arte.
    expect(card.querySelector('.pcard-lockbadge')).not.toBeNull();
    expect(card.querySelector('.pcard-lockbadge')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector(`use[href="#pp-skin-${id}-back"]`)).not.toBeNull();
  });

  it('sin skin explícita sigue la preferencia del usuario en vivo', () => {
    render(<Card value="5" onSelect={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Votar 5' });
    expect(btn).toHaveClass('skin-classic');
    act(() => setSkinId('creatures'));
    expect(btn).toHaveClass('skin-creatures');
  });
});
