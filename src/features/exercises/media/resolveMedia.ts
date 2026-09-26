import { bundledPosters, bundledVideos } from '../../../data/mediaAssets';
import type { ExerciseMedia } from '../types';

export type MediaSource = number | { uri: string };

export type ResolvedMedia = {
  video: MediaSource;
  poster: MediaSource | null;
  /** Remote clips need a connection; bundled ones work offline. */
  isRemote: boolean;
};

type AssetMaps = {
  videos: Record<string, number>;
  posters: Record<string, number>;
};

const bundled: AssetMaps = { videos: bundledVideos, posters: bundledPosters };

function httpsOnly(url: string | null): { uri: string } | null {
  return url && url.startsWith('https://') ? { uri: url } : null;
}

/**
 * Turns media metadata into something the player can load. A bundled file
 * wins over a remote URL. Returns null when the metadata points at a file
 * that isn't actually available, so the screen can say so.
 */
export function resolveMedia(
  media: ExerciseMedia,
  assets: AssetMaps = bundled,
): ResolvedMedia | null {
  const local = media.localAssetKey
    ? assets.videos[media.localAssetKey]
    : undefined;
  const remote = httpsOnly(media.remoteUrl);
  const video = local ?? remote;
  if (video === undefined || video === null) {
    return null;
  }

  const poster =
    (media.posterAssetKey ? assets.posters[media.posterAssetKey] : undefined) ??
    httpsOnly(media.posterUrl);

  return { video, poster, isRemote: local === undefined };
}
