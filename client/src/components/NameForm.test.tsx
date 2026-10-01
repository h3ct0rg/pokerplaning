import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NameForm } from './NameForm';

describe('NameForm', () => {
  it('rechaza nombre vacío o solo espacios', async () => {
    const onSubmit = vi.fn();
    render(<NameForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('¿Cómo te llamas?'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar a la sala' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe tu nombre.');
  });

  it('envía el nombre recortado y muestra la identidad en la mesa', async () => {
    const onSubmit = vi.fn();
    render(<NameForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('¿Cómo te llamas?'), '  Ana  ');
    expect(screen.getByText('Identidad en la mesa:').nextSibling).toHaveTextContent('Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar a la sala' }));
    expect(onSubmit).toHaveBeenCalledWith('Ana');
  });

  it('limita la longitud a 30 caracteres', () => {
    render(<NameForm onSubmit={() => {}} />);
    expect(screen.getByLabelText('¿Cómo te llamas?')).toHaveAttribute('maxLength', '30');
  });
});
