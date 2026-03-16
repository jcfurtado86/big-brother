/**
 * Shared webcam response parser.
 * Maps API snake_case fields to camelCase client-side objects.
 */
export function parseWebcam(r) {
  return {
    id: r.id,
    webcamId: r.id,
    lat: r.lat,
    lon: r.lon,
    category: r.category,
    title: r.title || '',
    city: r.city || '',
    region: r.region || '',
    country: r.country || '',
    countryCode: r.country_code || '',
    provider: r.provider || '',
    status: r.status || 'active',
    playerUrl: r.player_url || null,
    playerFallbackUrl: null,
    imageUrl: r.image_url || null,
    streamUrl: r.stream_url || null,
    thumbnailUrl: r.thumbnail_url || null,
    direction: r.direction || null,
    route: r.route || null,
  };
}
