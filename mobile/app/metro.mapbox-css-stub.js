// Mapbox GL ships a CSS entry that is only used on web builds.
// Metro cannot load CSS, so we replace it with an empty module for native bundling.
module.exports = {};
