export function toneLabel(tone) {
  if (tone < -5) return 'negative';
  if (tone > 5) return 'positive';
  return 'neutral';
}

export function parseSeenDate(raw) {
  if (!raw) return new Date();
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
  return new Date(raw);
}
