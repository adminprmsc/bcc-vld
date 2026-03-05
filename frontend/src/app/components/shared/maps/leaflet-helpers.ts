import * as L from 'leaflet';

const ICON_RETINA_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const ICON_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const SHADOW_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let leafletConfigured = false;
let drawAssetsPromise: Promise<typeof L> | null = null;

export function ensureLeafletSetup(): typeof L {
  if (!leafletConfigured) {
    (L.Icon.Default as any).mergeOptions({
      iconRetinaUrl: ICON_RETINA_URL,
      iconUrl: ICON_URL,
      shadowUrl: SHADOW_URL
    });
    // Don't set `imagePath` here to avoid accidental double-prefixing of
    // paths; we've provided fully-resolved URLs above.
    leafletConfigured = true;
  }
  return L;
}

export function ensureLeafletDrawAssets(): Promise<typeof L> {
  if (drawAssetsPromise) {
    return drawAssetsPromise;
  }
  const mapLib = ensureLeafletSetup();
  if ((mapLib as any).Draw) {
    drawAssetsPromise = Promise.resolve(mapLib);
    return drawAssetsPromise;
  }
  drawAssetsPromise = new Promise(resolve => {
    const cssHref = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
    if (!document.querySelector(`link[rel="stylesheet"][href="${cssHref}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssHref;
      document.head.appendChild(link);
    }

    const scriptSrc = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
    if (document.querySelector(`script[src="${scriptSrc}"]`)) {
      const maybeReady = () => {
        if ((mapLib as any).Draw) {
          resolve(mapLib);
        } else {
          setTimeout(maybeReady, 100);
        }
      };
      maybeReady();
      return;
    }

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => resolve(mapLib);
    script.onerror = () => resolve(mapLib);
    document.body.appendChild(script);
  });
  return drawAssetsPromise;
}

export function createBaseLayers(): Record<string, L.TileLayer> {
  const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 25,
    attribution: '© OpenStreetMap contributors'
  });
  const humanitarian = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 25,
    attribution: '© OpenStreetMap contributors, HOT'
  });
  return {
    Streets: streets,
    Humanitarian: humanitarian
  };
}

