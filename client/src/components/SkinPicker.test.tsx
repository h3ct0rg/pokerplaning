import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkinPicker } from './SkinPicker';
import { Card } from './Card';

describe('SkinPicker', () => {
  it('abre "Mi mazo" con radiogroup accesible, aplica y persiste la elección', async () => {
    render(
      <>
        <SkinPicker />
        <Card value="8" onSelect={() => {}} />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Mi mazo/ }));
    const dialog = screen.getByRole('dialog', { name: 'Mi mazo' });
    // Modal en portal a <body>: nunca dentro de un header con overflow/backdrop-filter.
    expect(dialog.closest('.modal-backdrop')?.parentElement).toBe(document.body);
    expect(dialog.closest('header.app-header')).toBeNull();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(screen.getByRole('radio', { name: /Clásico/ })).toBeChecked();
    expect(dialog.querySelectorAll('.skin-preview .pcard')).toHaveLength(8); // frente + dorso por skin

    await userEvent.click(screen.getByRole('radio', { name: /Viejo Oeste/ }));
    expect(screen.getByRole('radio', { name: /Viejo Oeste/ })).toBeChecked();
    expect(window.localStorage.getItem('pp.skin')).toBe('west');
    expect(screen.getByRole('button', { name: 'Votar 8' })).toHaveClass('skin-west');

    // Teclado: flechas recorren el grupo.
    screen.getByRole('radio', { name: /Viejo Oeste/ }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: /Futurista/ })).toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
