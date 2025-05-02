import Filter from 'bad-words';

const filter = new Filter();

export function cleanText(text) {
  return filter.clean(text);
}

export function hasBadWords(text) {
  return filter.isProfane(text);
}
