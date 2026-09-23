// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import type { Language } from '../../i18n';

let language: Language = 'en';
const setLanguage = vi.fn();

vi.mock('../../store', () => ({
  useStore: (selector: (s: { language: Language; setLanguage: typeof setLanguage }) => unknown) =>
    selector({ language, setLanguage }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  language = 'en';
});

describe('LanguageSwitcher', () => {
  it('renders a button for each supported language', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText('EN')).toBeTruthy();
    expect(screen.getByText('PL')).toBeTruthy();
    expect(screen.getByText('DE')).toBeTruthy();
  });

  it('calls setLanguage with the clicked language', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText('PL'));
    expect(setLanguage).toHaveBeenCalledWith('pl');
  });

  it('marks only the active language as pressed for assistive tech', () => {
    language = 'de';
    render(<LanguageSwitcher />);
    expect(screen.getByText('EN').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('PL').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('DE').getAttribute('aria-pressed')).toBe('true');
  });
});
