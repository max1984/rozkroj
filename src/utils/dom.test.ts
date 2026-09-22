// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isEditableElement } from './dom';

describe('isEditableElement', () => {
  it('returns false for null', () => {
    expect(isEditableElement(null)).toBe(false);
  });

  it('returns false for a non-element target', () => {
    expect(isEditableElement(window as unknown as EventTarget)).toBe(false);
  });

  it('returns false for a plain div', () => {
    expect(isEditableElement(document.createElement('div'))).toBe(false);
  });

  it('returns true for a text input', () => {
    expect(isEditableElement(document.createElement('input'))).toBe(true);
  });

  it('returns true for a textarea', () => {
    expect(isEditableElement(document.createElement('textarea'))).toBe(true);
  });

  it('returns true for a select', () => {
    expect(isEditableElement(document.createElement('select'))).toBe(true);
  });

  it('returns true for a contenteditable element', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
    expect(isEditableElement(div)).toBe(true);
    document.body.removeChild(div);
  });
});
