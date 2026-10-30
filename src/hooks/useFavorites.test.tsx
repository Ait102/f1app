import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { FavButton } from '../components/bits';
import { readFavorites, toggleFavorite, useFavorites } from './useFavorites';

beforeEach(() => localStorage.clear());

describe('favorites', () => {
  it('toggles and persists in localStorage', () => {
    toggleFavorite('drivers', 'hamilton');
    expect(JSON.parse(localStorage.getItem('f1hub:favorites')!).drivers).toEqual(['hamilton']);
    toggleFavorite('drivers', 'hamilton');
    expect(readFavorites().drivers).toEqual([]);
  });

  it('ignores corrupted or unsafe stored values', () => {
    localStorage.setItem('f1hub:favorites', '{bad json');
    expect(readFavorites()).toEqual({ drivers: [], constructors: [] });
    localStorage.setItem('f1hub:favorites', JSON.stringify({ drivers: ['ok_id', '../x', 5] }));
    expect(readFavorites().drivers).toEqual(['ok_id']);
  });

  it('updates subscribers', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFav('constructors', 'ferrari')).toBe(false);
    act(() => toggleFavorite('constructors', 'ferrari'));
    expect(result.current.isFav('constructors', 'ferrari')).toBe(true);
  });

  it('star button reflects state', () => {
    render(
      <MemoryRouter>
        <FavButton kind="drivers" id="norris" name="Lando Norris" />
      </MemoryRouter>,
    );
    const btn = screen.getByRole('button', { name: /Добавить Lando Norris/ });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn);
    expect(screen.getByRole('button', { name: /Убрать Lando Norris/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
