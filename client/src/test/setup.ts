import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetSkinStore } from '../skins/store';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  resetSkinStore();
});
