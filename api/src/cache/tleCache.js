let tleText = null;
let satCount = 0;
let fetchedAt = null;

export function setTle(text, count) {
  tleText = text;
  satCount = count;
  fetchedAt = new Date();
}

export function getTle() {
  return { tleText, satCount, fetchedAt };
}
