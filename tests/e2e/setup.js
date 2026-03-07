import { createServer } from 'vite';

let viteServer;

export async function setup() {
  viteServer = await createServer({
    configFile: './vite.config.js',
    server: { port: 5173 },
  });
  await viteServer.listen();
}

export async function teardown() {
  if (viteServer) await viteServer.close();
}
