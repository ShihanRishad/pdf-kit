import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:5173/pdf-kit/';

const ALL_TOOLS = [
  'merge', 'split', 'compress',
  'pdf2jpg', 'img2pdf', 'html2pdf',
  'organize', 'addtext', 'pagenums',
  'watermark', 'encrypt', 'extract',
];

let browser;
let page;

beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
});

afterAll(async () => {
  await browser.close();
});

beforeEach(async () => {
  await page.goto(BASE_URL, { waitUntil: 'load' });
});

describe('App shell', () => {
  it('has correct page title', async () => {
    const title = await page.title();
    expect(title).toContain('pdfkit');
  });

  it('shows the hero heading', async () => {
    const text = await page.$eval('h1', el => el.textContent);
    expect(text).toContain('Free PDF tools');
  });

  it('renders the header logo', async () => {
    const logo = await page.$('.logo');
    expect(logo).not.toBeNull();
  });

  it('shows 3 navigation buttons', async () => {
    const buttons = await page.$$('header nav button');
    expect(buttons.length).toBe(3);
  });

  it('renders the footer', async () => {
    const footer = await page.$('footer');
    expect(footer).not.toBeNull();
  });
});

describe('Tool cards', () => {
  ALL_TOOLS.forEach(tool => {
    it(`renders ${tool} card`, async () => {
      const card = await page.$(`[data-tool="${tool}"]`);
      expect(card).not.toBeNull();
    });
  });

  it('renders exactly 12 tool cards', async () => {
    const cards = await page.$$('[data-tool]');
    expect(cards.length).toBe(12);
  });
});

describe('Navigation', () => {
  it('opens a tool view when card is clicked', async () => {
    await page.click('[data-tool="merge"]');
    await page.waitForSelector('#tool-merge.active');
    const isActive = await page.$eval('#tool-merge', el => el.classList.contains('active'));
    expect(isActive).toBe(true);
  });

  it('hides home view when tool is open', async () => {
    await page.click('[data-tool="split"]');
    await page.waitForSelector('#tool-split.active');
    const homeDisplay = await page.$eval('#homeView', el => el.style.display);
    expect(homeDisplay).toBe('none');
  });

  it('returns to home on back button click', async () => {
    await page.click('[data-tool="compress"]');
    await page.waitForSelector('#tool-compress.active');
    await page.click('[data-back]');
    await page.waitForSelector('#homeView', { visible: true });
    const display = await page.$eval('#homeView', el => el.style.display);
    expect(display).not.toBe('none');
  });

  it('returns to home on logo click', async () => {
    await page.click('[data-tool="split"]');
    await page.waitForSelector('#tool-split.active');
    await page.click('#logoBtn');
    await page.waitForSelector('#homeView', { visible: true });
    const display = await page.$eval('#homeView', el => el.style.display);
    expect(display).not.toBe('none');
  });
});

describe('Tool views', () => {
  ALL_TOOLS.forEach(tool => {
    it(`opens ${tool} view`, async () => {
      await page.click(`[data-tool="${tool}"]`);
      await page.waitForSelector(`#tool-${tool}.active`);
      const isActive = await page.$eval(`#tool-${tool}`, el => el.classList.contains('active'));
      expect(isActive).toBe(true);
    });
  });
});
