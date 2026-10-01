import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';

// src/index.ts (tsx) y dist/index.js (build) están ambos a dos niveles de software/
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = process.env.CLIENT_DIST ?? path.resolve(here, '../../client/dist');
const port = Number(process.env.PORT) || 3001;
const ttlMin = Number(process.env.EMPTY_ROOM_TTL_MIN);
const ownerGraceMs = Number(process.env.OWNER_GRACE_MS);

const { httpServer } = createApp({
  clientDist,
  emptyRoomTtlMs: ttlMin > 0 ? ttlMin * 60 * 1000 : undefined,
  ownerGraceMs: ownerGraceMs >= 0 && process.env.OWNER_GRACE_MS ? ownerGraceMs : undefined,
  trustProxy: process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true',
  corsOrigin: process.env.CORS_ORIGIN?.split(','),
});

httpServer.listen(port, () => {
  console.log(`Planning poker escuchando en http://localhost:${port}`);
});
