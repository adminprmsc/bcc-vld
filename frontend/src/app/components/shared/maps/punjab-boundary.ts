import { Feature, Polygon } from 'geojson';

// Simplified administrative boundary for Punjab, Pakistan.
export const PUNJAB_BOUNDARY: Feature<Polygon> = {
  type: 'Feature',
  properties: { name: 'Punjab' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [69.3309, 32.0108],
      [69.7807, 31.2759],
      [70.5257, 30.7422],
      [71.3538, 29.8827],
      [72.1274, 29.3904],
      [73.4577, 29.3561],
      [74.4216, 29.8279],
      [75.0890, 30.6716],
      [75.2430, 31.2796],
      [74.9537, 32.1640],
      [74.6487, 32.8479],
      [74.8563, 33.3180],
      [74.5114, 33.7784],
      [73.7291, 34.1045],
      [72.9086, 34.3035],
      [72.2465, 34.1178],
      [71.3243, 33.8903],
      [70.7496, 33.4935],
      [70.1560, 32.9168],
      [69.6270, 32.5092],
      [69.3309, 32.0108]
    ]]
  }
};
