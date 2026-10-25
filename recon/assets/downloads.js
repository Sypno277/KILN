export const DOWNLOAD_TARGETS = ['win-x64', 'linux-x64', 'linux-arm64', 'osx-arm64', 'osx-x64'];
export const RELEASES_URL = 'https://github.com/KnifeLemon/Filee/releases';

const versionTag = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export function releaseSummary(release) {
  if (!release || release.draft || !versionTag.test(release.tag_name ?? '') || !Array.isArray(release.assets))
    throw new Error('Invalid release metadata');
  return {
    tag_name: release.tag_name,
    assets: release.assets.map(asset => ({
      name: asset.name,
      browser_download_url: asset.browser_download_url,
      size: Number.isSafeInteger(asset.size) && asset.size > 0 ? asset.size : 0,
    })),
  };
}

export function findDownloadAsset(release, target) {
  if (!DOWNLOAD_TARGETS.includes(target) || release?.draft
      || !versionTag.test(release?.tag_name ?? '') || !Array.isArray(release?.assets)) return null;
  const version = release.tag_name.replace(/^v/, '');
  const names = target === 'win-x64'
    ? [`Filee-${version}-win-Setup.exe`, 'Filee-win-Setup.exe']
    : [`Filee-${version}-${target}.tar.gz`];
  for (const name of names) {
    for (const asset of release.assets.filter(item => item?.name === name)) {
      try {
        const url = new URL(asset.browser_download_url);
        const path = `/KnifeLemon/Filee/releases/download/${release.tag_name}/${name}`;
        if (url.origin !== 'https://github.com' || url.username || url.password || url.search || url.hash
            || decodeURIComponent(url.pathname) !== path) continue;
        return { name, url: url.href, size: Number.isSafeInteger(asset.size) && asset.size > 0 ? asset.size : 0 };
      } catch { /* malformed asset URL */ }
    }
  }
  return null;
}

export function downloadChoice(release, target, failed = false) {
  const asset = findDownloadAsset(release, target);
  return {
    asset,
    url: asset?.url ?? RELEASES_URL,
    state: asset ? 'available' : failed ? 'unavailable' : release ? 'missing' : 'checking',
    development: target !== 'win-x64',
  };
}
