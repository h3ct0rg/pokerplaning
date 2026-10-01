# Planning Poker v2

App web de planning poker en tiempo real con el sistema visual "Agile Slate". El owner crea una sala y la comparte con un código corto, un enlace o un QR. Todos votan y los votos quedan ocultos hasta que se revelan.

Funciones:

- Código de sala de 6 caracteres, para unirse por código o por enlace (`/r/CODIGO`).
- Mazos Fibonacci (incluye ½) y T-Shirt (incluye XXL).
- Cola de historias: agregar, editar, eliminar y seleccionar. Al confirmar una estimación se pasa a la siguiente historia pendiente, y las estimadas quedan en el historial.
- Cronómetro de ronda calculado con el reloj del servidor.
- Modo espectador (no vota).
- Auto-transferencia de owner: si el owner se desconecta, el rol pasa al participante conectado más antiguo tras un periodo de gracia.
- Métricas de resultados y modal de compartir con QR generado localmente.
- Sin registro. El estado vive en memoria del servidor.

Estructura:

- `server/`: Node 24 + Express + Socket.IO.
- `client/`: React 18 + Vite.
- `shared/protocol.ts`: contrato de eventos v2 (`PROTOCOL_VERSION = 2`).

## Desarrollo

```bash
npm run install:all
npm run dev
```

- Servidor: http://localhost:3001 (tsx watch).
- Cliente: http://localhost:5173 (Vite con proxy de `/socket.io`). Abre esta URL.

## Producción

```bash
npm run build
npm start
```

Sirve la app completa (cliente + WebSockets) en http://localhost:3001.

| Variable | Default | Uso |
|---|---|---|
| `PORT` | `3001` | Puerto HTTP |
| `EMPTY_ROOM_TTL_MIN` | `30` | Minutos que vive una sala sin participantes conectados |
| `OWNER_GRACE_MS` | `30000` | Gracia antes de transferir el owner desconectado |
| `TRUST_PROXY` | — | `1` para tomar la IP de `X-Forwarded-For` (rate-limit) detrás de un proxy |
| `CORS_ORIGIN` | — | Orígenes permitidos (separados por comas) si el cliente se sirve desde otro dominio |

Seguridad: más de 30 intentos fallidos de unirse por IP y minuto devuelven `RATE_LIMITED`. El `clientId` del navegador nunca se envía a otros participantes.

## Despliegue con Docker

> **Una sola instancia.** El estado de las salas vive en memoria del proceso: no escales réplicas ni pongas varias instancias detrás de un balanceador. Si reinicias el contenedor, las salas abiertas se pierden.

Requisitos: Docker 24 o superior y Docker Compose v2. Ejecuta los comandos desde `software/`:

```bash
docker compose build          # construye la imagen poker-planning:2.0.0
docker compose up -d          # arranca en segundo plano (restart: unless-stopped)
docker compose ps             # estado y healthcheck (healthy)
docker compose logs -f        # logs (json-file rotado: 3 × 10 MB)
docker compose down           # detiene y elimina el contenedor
```

Actualizar a una versión nueva:

```bash
git pull                      # o copia el código nuevo
docker compose up -d --build
docker image prune -f         # opcional: borra imágenes antiguas sin uso
```

Cambiar el puerto del host (el contenedor siempre escucha en 3001):

```bash
HOST_PORT=8080 docker compose up -d
```

También puedes definir las variables en un archivo `.env` junto a `docker-compose.yml`:

| Variable | Default | Uso |
|---|---|---|
| `HOST_PORT` | `3001` | Puerto publicado en el host |
| `OWNER_GRACE_MS` | `30000` | Gracia antes de transferir el owner desconectado |
| `TRUST_PROXY` | `false` | `true` detrás de un reverse proxy, para que el rate-limit use la IP real (`X-Forwarded-For`) |

La imagen usa `node:24-alpine` y es multi-stage: el runtime solo lleva las dependencias de producción del server, `server/dist` y `client/dist`. Corre como usuario `node` (no root) y trae un `HEALTHCHECK` contra `/health`.

### Reverse proxy (nginx) con WebSocket

```nginx
server {
    listen 80;
    server_name poker.example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 1h;   # conexiones WebSocket largas
    }
}
```

Detrás del proxy, arranca con `TRUST_PROXY=true`. Si no lo haces, todos los clientes comparten la IP del proxy y el límite de intentos fallidos los bloquearía juntos. Activa `TRUST_PROXY` solo si el puerto del contenedor no está expuesto directamente a Internet: lo más seguro es publicarlo solo en localhost con `ports: ["127.0.0.1:3001:3001"]`.

## Verificación

```bash
npm run typecheck
npm test
```
