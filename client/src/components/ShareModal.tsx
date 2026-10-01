import { useEffect, useId, useState } from 'react';
import QRCode from 'qrcode';
import type { RoomState } from '@shared/protocol';
import { copyText } from '../lib/clipboard';
import { initials } from '../lib/initials';
import { roomUrl } from '../lib/roomCode';
import { Modal } from './Modal';

interface Props {
  room: RoomState;
  onClose: () => void;
  notify: (msg: string) => void;
}

export function shareLinks(url: string, code: string) {
  const text = `Únete a mi sala de Poker Planning (código ${code})`;
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    email: `mailto:?subject=${encodeURIComponent('Invitación a Poker Planning')}&body=${encodeURIComponent(`${text}:\n${url}`)}`,
  };
}

export function ShareModal({ room, onClose, notify }: Props) {
  const titleId = useId();
  const url = roomUrl(room.id);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const links = shareLinks(url, room.id);
  const connected = room.participants.filter((p) => p.connected).length;

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: 'M', color: { dark: '#0b1326', light: '#ffffff' } })
      .then((data) => alive && setQr(data))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [url]);

  const copy = async (then?: string) => {
    const ok = await copyText(url);
    setCopied(ok);
    notify(ok ? then ?? '¡Enlace copiado!' : 'No se pudo copiar el enlace');
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'Poker Planning', text: `Únete a la sala ${room.id}`, url });
    } catch {
      /* cancelado */
    }
  };

  return (
    <Modal labelledBy={titleId} onClose={onClose} className="share-modal">
      <header className="modal-head">
        <div>
          <h2 id={titleId} className="h-lg">
            Invitar al equipo <span className="chip chip-mono">{room.id}</span>
          </h2>
          <p className="mono small success">
            <span className="live-dot" aria-hidden="true" /> {connected} conectados ahora
          </p>
        </div>
        <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </header>

      <div className="modal-body">
        <section aria-labelledby="share-link-title">
          <div className="panel-head">
            <h3 id="share-link-title" className="eyebrow">
              Enlace directo
            </h3>
            <span className="small success">Entra sin contraseña</span>
          </div>
          <div className="link-box">
            <input className="mono" type="text" readOnly value={url} aria-label="Enlace de la sala" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="btn btn-primary" onClick={() => copy()}>
              {copied ? '✓ Copiado' : 'Copiar enlace'}
            </button>
          </div>
        </section>

        <div className="share-grid">
          <section className="qr-box" aria-labelledby="qr-title">
            <h3 id="qr-title" className="eyebrow">
              Escanear para unirse
            </h3>
            {qr ? (
              <img src={qr} width={200} height={200} alt={`Código QR del enlace a la sala ${room.id}`} />
            ) : (
              <div className="qr-placeholder" aria-hidden="true" />
            )}
            <p className="small muted">Ideal para planning presencial o para unirse desde otro teléfono.</p>
          </section>

          <section aria-labelledby="channels-title">
            <h3 id="channels-title" className="eyebrow">
              Compartir por
            </h3>
            {canShare && (
              <button type="button" className="btn btn-secondary-strong btn-lg share-native" onClick={share}>
                ⇪ Compartir vía Web Share
              </button>
            )}
            <div className="channels">
              <a className="channel" href={links.whatsapp} target="_blank" rel="noopener noreferrer">
                <span className="channel-icon ch-wa" aria-hidden="true">
                  ✆
                </span>
                <span>
                  WhatsApp<span className="small muted">Grupo del equipo</span>
                </span>
              </a>
              <a className="channel" href={links.telegram} target="_blank" rel="noopener noreferrer">
                <span className="channel-icon ch-tg" aria-hidden="true">
                  ✈
                </span>
                <span>
                  Telegram<span className="small muted">Chat o grupo</span>
                </span>
              </a>
              <a className="channel" href={links.email}>
                <span className="channel-icon ch-mail" aria-hidden="true">
                  ✉
                </span>
                <span>
                  Email<span className="small muted">Invitar por correo</span>
                </span>
              </a>
              <button type="button" className="channel" onClick={() => copy('Enlace copiado: pégalo en Slack')}>
                <span className="channel-icon ch-slack" aria-hidden="true">
                  #
                </span>
                <span>
                  Slack<span className="small muted">Copia el enlace</span>
                </span>
              </button>
              <button type="button" className="channel" onClick={() => copy('Enlace copiado: pégalo en Teams')}>
                <span className="channel-icon ch-teams" aria-hidden="true">
                  T
                </span>
                <span>
                  Teams<span className="small muted">Copia el enlace</span>
                </span>
              </button>
            </div>
          </section>
        </div>

        <section aria-labelledby="share-people-title">
          <div className="panel-head">
            <h3 id="share-people-title" className="eyebrow">
              En la sala ahora
            </h3>
            <span className="chip chip-mono">{connected} activos</span>
          </div>
          <ul className="people">
            {room.participants.map((p) => {
              const state = !p.connected
                ? { cls: 'st-offline', text: 'Desconectado' }
                : p.role === 'spectator'
                  ? { cls: 'st-spectator', text: 'Espectador' }
                  : p.hasVoted
                    ? { cls: 'st-voted', text: 'Listo' }
                    : { cls: 'st-pending', text: 'Pensando' };
              return (
                <li key={p.id} className="person">
                  <span className="avatar" aria-hidden="true">
                    {initials(p.name)}
                  </span>
                  <span className="person-name">
                    {p.name}
                    {p.id === room.selfId && <span className="muted"> (Tú)</span>}
                    {p.id === room.ownerId && <span className="chip chip-owner chip-xs">Host 👑</span>}
                  </span>
                  <span className={`seat-status ${state.cls}`}>{state.text}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="info-list">
          <p>
            <strong>⚡ Sin registro</strong>
            <span className="muted">Cualquiera con el enlace entra con su nombre. No se necesitan cuentas.</span>
          </p>
          <p>
            <strong>👑 Transferencia automática de host</strong>
            <span className="muted">
              Si el host se desconecta, tras una breve espera el rol pasa al siguiente participante conectado.
            </span>
          </p>
        </section>
      </div>

      <footer className="modal-foot">
        <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>
          Volver a la mesa
        </button>
      </footer>
    </Modal>
  );
}
