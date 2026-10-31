import { useEffect, useState } from 'react';

import type { CommonsPhoto } from '../api/wikimedia';

type PhotoState = { status: 'loading' } | { status: 'done'; photo: CommonsPhoto | null };

/** Loads a photo; a failure means "no photo", never an error on the page. */
export function usePhoto(key: string | null, load: () => Promise<CommonsPhoto | null>): PhotoState {
  const [state, setState] = useState<{ key: string | null; value: PhotoState }>({
    key,
    value: { status: 'loading' },
  });
  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    setState({ key, value: { status: 'loading' } });
    load().then(
      (photo) => !cancelled && setState({ key, value: { status: 'done', photo } }),
      () => !cancelled && setState({ key, value: { status: 'done', photo: null } }),
    );
    return () => {
      cancelled = true;
    };
    // `load` is recreated on every render; the key identifies the photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (key === null) return { status: 'done', photo: null };
  return state.key === key ? state.value : { status: 'loading' };
}

/**
 * Photo with the attribution its licence requires (author, licence, link to the file).
 * Renders nothing when there is no photo.
 */
export function PhotoFigure({
  state,
  alt,
  caption,
  shape,
}: {
  state: PhotoState;
  alt: string;
  caption?: string;
  shape: 'portrait' | 'wide';
}) {
  const [loaded, setLoaded] = useState(false);
  if (state.status === 'done' && !state.photo) return null;
  const photo = state.status === 'done' ? state.photo : null;
  return (
    <figure className={`photo photo--${shape}${loaded ? ' is-loaded' : ''}`}>
      <div className="photo__frame">
        {photo && (
          <img
            src={photo.src}
            alt={alt}
            width={photo.width}
            height={photo.height}
            decoding="async"
            onLoad={() => setLoaded(true)}
          />
        )}
      </div>
      {photo && (
        <figcaption className="photo__credit">
          {caption && <span className="photo__caption">{caption}</span>}
          <span>
            Фото:{' '}
            <a href={photo.pageUrl} target="_blank" rel="noreferrer">
              {photo.artist ?? 'Wikimedia Commons'}
            </a>
            ,{' '}
            {photo.licenseUrl ? (
              <a href={photo.licenseUrl} target="_blank" rel="noreferrer license">
                {photo.license}
              </a>
            ) : (
              photo.license
            )}
          </span>
        </figcaption>
      )}
    </figure>
  );
}
