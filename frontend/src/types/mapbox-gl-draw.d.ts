declare module '@mapbox/mapbox-gl-draw' {
  import type { Map } from 'maplibre-gl';
  import type { FeatureCollection } from 'geojson';

  type DrawMode =
    | 'simple_select'
    | 'direct_select'
    | 'draw_point'
    | 'draw_line_string'
    | 'draw_polygon'
    | 'static';

  interface MapboxDrawOptions {
    displayControlsDefault?: boolean;
    controls?: Record<string, boolean>;
    defaultMode?: DrawMode | string;
    userProperties?: boolean;
  }

  export default class MapboxDraw {
    constructor(options?: MapboxDrawOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    changeMode(mode: DrawMode | string, options?: Record<string, unknown>): void;
    getAll(): FeatureCollection;
    set(geojson: FeatureCollection): void;
    deleteAll(): void;
    getMode(): string;
  }
}
