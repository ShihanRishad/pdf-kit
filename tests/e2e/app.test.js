import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import puppeteer from 'puppeteer';

const base_url = 'http://localhost:5173/pdf-kit/';

const all_tools = [
  'merge',
  'split',
  'compress',
  'organize',
  'addtext',
  'pagenums',
  'watermark',
  'encrypt',
  'extract',
  'pdf2jpg',
  'img2pdf',
  'html2pdf',
];

let browser;
let page;

beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
});

afterAll(async () => {
  await browser.close();
}, 60000);

beforeEach(async () => {
  await page.goto(base_url, { waitUntil: 'load' });
});

describe('App shell', () => {
  it('has correct page title', async () => {
    const title = await page.title();
    expect(title).toContain('pdfkit');
  });

  it('shows the unified workspace hero heading', async () => {
    const text = await page.$eval('h1', (el) => el.textContent);
    expect(text).toContain('One workspace');
  });

  it('renders the header logo', async () => {
    const logo = await page.$('.logo');
    expect(logo).not.toBeNull();
  });

  it('shows 3 navigation buttons', async () => {
    const buttons = await page.$$('#mainNav button');
    expect(buttons.length).toBe(3);
  });

  it('renders the footer', async () => {
    const footer = await page.$('footer');
    expect(footer).not.toBeNull();
  });
});

describe('Tool triggers', () => {
  all_tools.forEach((tool) => {
    it(`renders trigger(s) for ${tool}`, async () => {
      const triggerCount = await page.$$eval(`[data-tool="${tool}"]`, (elements) => elements.length);
      expect(triggerCount).toBeGreaterThan(0);
    });
  });
});

describe('Unified workspace navigation', () => {
  it('opens the workspace when a tool card is clicked', async () => {
    await page.click('#homeView [data-tool="merge"]');
    await page.waitForSelector('#appView', { visible: true });
    const visible = await page.$eval('#appView', (el) => getComputedStyle(el).display !== 'none');
    expect(visible).toBe(true);
  });

  it('activates the correct tool options panel', async () => {
    await page.click('#homeView [data-tool="split"]');
    await page.waitForSelector('#appView', { visible: true });
    const title = await page.$eval('#toolOptionsTitle', (el) => el.textContent);
    expect(title).toContain('Split PDF');
  });

  it('returns to home on back button click', async () => {
    await page.click('#homeView [data-tool="compress"]');
    await page.waitForSelector('#appView', { visible: true });
    await page.click('[data-back]');
    await page.waitForSelector('#homeView', { visible: true });
    const visible = await page.$eval('#homeView', (el) => getComputedStyle(el).display !== 'none');
    expect(visible).toBe(true);
  });

  it('keeps the same workspace shell when switching tools', async () => {
    await page.click('#homeView [data-tool="merge"]');
    await page.waitForSelector('#appView', { visible: true });
    await page.click('#appView .tool-nav-btn[data-tool="watermark"]');
    const title = await page.$eval('#toolOptionsTitle', (el) => el.textContent);
    expect(title).toContain('Add Watermark');
  });
});
