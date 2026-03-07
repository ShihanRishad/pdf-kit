import { describe, it, expect, beforeEach } from 'vitest';
import { formatSize, hexToRgb, setProgress, hideProgress } from '../../src/core/Utils.js';

describe('formatSize', () => {
  it('formats bytes under 1 KB', () => expect(formatSize(500)).toBe('500 B'));
  it('formats 0 bytes', () => expect(formatSize(0)).toBe('0 B'));
  it('formats exactly 1 KB', () => expect(formatSize(1024)).toBe('1.0 KB'));
  it('formats kilobytes', () => expect(formatSize(1536)).toBe('1.5 KB'));
  it('formats exactly 1 MB', () => expect(formatSize(1048576)).toBe('1.00 MB'));
  it('formats megabytes', () => expect(formatSize(2097152)).toBe('2.00 MB'));
});

describe('hexToRgb', () => {
  it('converts black', () => expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 }));
  it('converts white', () => expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 }));
  it('converts brand accent orange', () => expect(hexToRgb('#ff6b4a')).toEqual({ r: 255, g: 107, b: 74 }));
  it('converts brand green', () => expect(hexToRgb('#4ade80')).toEqual({ r: 74, g: 222, b: 128 }));
  it('converts brand blue', () => expect(hexToRgb('#60a5fa')).toEqual({ r: 96, g: 165, b: 250 }));
});

describe('setProgress', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="testBar">
        <div class="progress-bar-fill"></div>
      </div>`;
  });

  it('adds active class to bar', () => {
    setProgress('testBar', 50);
    expect(document.getElementById('testBar').classList.contains('active')).toBe(true);
  });

  it('sets fill width to given percentage', () => {
    setProgress('testBar', 75);
    expect(document.querySelector('.progress-bar-fill').style.width).toBe('75%');
  });

  it('handles 0%', () => {
    setProgress('testBar', 0);
    expect(document.querySelector('.progress-bar-fill').style.width).toBe('0%');
  });

  it('handles 100%', () => {
    setProgress('testBar', 100);
    expect(document.querySelector('.progress-bar-fill').style.width).toBe('100%');
  });
});

describe('hideProgress', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="testBar" class="active">
        <div class="progress-bar-fill" style="width: 80%"></div>
      </div>`;
  });

  it('removes active class', () => {
    hideProgress('testBar');
    expect(document.getElementById('testBar').classList.contains('active')).toBe(false);
  });

  it('resets fill width to 0%', () => {
    hideProgress('testBar');
    expect(document.querySelector('.progress-bar-fill').style.width).toBe('0%');
  });
});
