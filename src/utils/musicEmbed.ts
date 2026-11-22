export interface ParsedMusicUrl {
  sourceKind: 'embed' | 'audio';
  embedUrl?: string;
  audioSrc?: string;
  providerLabel: string;
}

export function parseMusicUrl(rawUrl: string): ParsedMusicUrl | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let normalized = trimmed;
  if (!/^https?:\/\//i.test(normalized) && !normalized.startsWith('data:audio/')) {
    normalized = `https://${normalized}`;
  }

  if (normalized.startsWith('data:audio/')) {
    return {
      sourceKind: 'audio',
      audioSrc: normalized,
      providerLabel: 'Uploaded Audio',
    };
  }

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();

    // Spotify track / album / playlist / episode
    if (host.includes('spotify.com')) {
      const cleanPath = parsed.pathname.replace(/^\/intl-[a-z-]+/i, '');
      if (cleanPath.startsWith('/embed/')) {
        return {
          sourceKind: 'embed',
          embedUrl: `https://open.spotify.com${cleanPath}`,
          providerLabel: 'Spotify',
        };
      }
      const match = cleanPath.match(/^\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
      if (match) {
        return {
          sourceKind: 'embed',
          embedUrl: `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator`,
          providerLabel: 'Spotify',
        };
      }
    }

    // YouTube / YouTube Music / youtu.be
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let videoId = '';
      if (host.includes('youtu.be')) {
        videoId = parsed.pathname.slice(1).split('/')[0];
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      } else {
        videoId = parsed.searchParams.get('v') || '';
      }
      if (videoId) {
        return {
          sourceKind: 'embed',
          embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1`,
          providerLabel: 'YouTube',
        };
      }
    }

    // SoundCloud
    if (host.includes('soundcloud.com')) {
      if (host.startsWith('w.soundcloud.com')) {
        return {
          sourceKind: 'embed',
          embedUrl: parsed.toString(),
          providerLabel: 'SoundCloud',
        };
      }
      return {
        sourceKind: 'embed',
        embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(
          parsed.toString()
        )}&color=%23e11d48&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
        providerLabel: 'SoundCloud',
      };
    }

    // Direct audio file link (.mp3, .wav, .ogg, .m4a, .aac, .flac)
    return {
      sourceKind: 'audio',
      audioSrc: parsed.toString(),
      providerLabel: 'Direct Audio',
    };
  } catch {
    return null;
  }
}

export function readAudioFileAsDataUrl(file: File): Promise<{
  dataUrl: string;
  fileNameTitle: string;
}> {
  return new Promise((resolve, reject) => {
    const maxBytes = 12 * 1024 * 1024;
    if (file.size > maxBytes) {
      reject(
        new Error(
          'Audio file is larger than 12MB. For large songs, paste a Spotify, YouTube, SoundCloud, or MP3 link instead.'
        )
      );
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read audio file.'));
    reader.onload = () => {
      let dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        reject(new Error('Empty audio file.'));
        return;
      }

      if (
        dataUrl.startsWith('data:application/octet-stream;') ||
        dataUrl.startsWith('data:;')
      ) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const mimeMap: Record<string, string> = {
          mp3: 'audio/mpeg',
          m4a: 'audio/mp4',
          mp4: 'audio/mp4',
          wav: 'audio/wav',
          ogg: 'audio/ogg',
          aac: 'audio/aac',
          flac: 'audio/flac',
          webm: 'audio/webm',
        };
        const mime = mimeMap[ext] || 'audio/mpeg';
        dataUrl = dataUrl.replace(/^data:[^;]*;/, `data:${mime};`);
      }

      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
      resolve({
        dataUrl,
        fileNameTitle: cleanName || 'My Track',
      });
    };
    reader.readAsDataURL(file);
  });
}

export function parseBackgroundMusicUrl(
  rawUrl: string
): { sourceKind: 'audio' | 'youtube'; src: string; defaultTitle: string } | { error: string } | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let normalized = trimmed;
  if (!/^https?:\/\//i.test(normalized) && !normalized.startsWith('data:audio/')) {
    normalized = `https://${normalized}`;
  }

  if (normalized.startsWith('data:audio/')) {
    return { sourceKind: 'audio', src: normalized, defaultTitle: 'Background Track' };
  }

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('spotify.com') || host.includes('soundcloud.com')) {
      return {
        error:
          'Spotify/SoundCloud cannot auto-play in the background. Upload an MP3/audio file or paste a YouTube / direct MP3 link for BGM (or use Add Music for Spotify widgets).',
      };
    }

    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let videoId = '';
      if (host.includes('youtu.be')) {
        videoId = parsed.pathname.slice(1).split('/')[0];
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      } else {
        videoId = parsed.searchParams.get('v') || '';
      }
      if (videoId) {
        const cleanId = encodeURIComponent(videoId);
        return {
          sourceKind: 'youtube',
          src: `https://www.youtube.com/embed/${cleanId}?autoplay=1&loop=1&playlist=${cleanId}&controls=0`,
          defaultTitle: 'YouTube BGM',
        };
      }
    }

    return {
      sourceKind: 'audio',
      src: parsed.toString(),
      defaultTitle: 'Background Track',
    };
  } catch {
    return null;
  }
}
