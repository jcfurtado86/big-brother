/**
 * Convert raw SVG string to a blob URL for use as Cesium billboard image.
 * @param {string} raw - SVG content string
 * @param {boolean} whiten - inject fill="white" so Cesium billboard.color can tint it
 */
export function svgToBlobUrl(raw, whiten = false) {
  let svg = raw;
  if (whiten) {
    svg = svg.replace(/<svg /, '<svg fill="white" ');
    // Remove inline fill styles so the parent fill="white" takes effect
    svg = svg.replace(/style="[^"]*fill:[^";]*;?[^"]*"/g, '');
    svg = svg.replace(/fill="(?!white)[^"]*"/g, '');
  }
  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}
