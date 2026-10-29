import { Fragment, memo } from 'react';
import { SKINS, backSymbolId, frontSymbolId } from './index';
import { ART_VIEWBOX } from './types';

/**
 * Sprite único con el arte de todas las skins (<symbol>). Las cartas lo
 * referencian con <use href="#…">, así cada ilustración se define una sola vez.
 */
export const SkinSprite = memo(function SkinSprite() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      {SKINS.map((s) => (
        <Fragment key={s.id}>
          <symbol id={frontSymbolId(s.id)} viewBox={ART_VIEWBOX} preserveAspectRatio="none">
            {s.front()}
          </symbol>
          <symbol id={backSymbolId(s.id)} viewBox={ART_VIEWBOX} preserveAspectRatio="none">
            {s.back()}
          </symbol>
        </Fragment>
      ))}
    </svg>
  );
});
