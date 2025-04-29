const badWords = [
  'badword1',
  'badword2',
  // …добавьте свои
];

export function hasBadWords(text = '') {
  const lower = text.toLowerCase();
  return badWords.some(w => lower.includes(w));
}

export function cleanText(text = '') {
  let result = text;
  badWords.forEach(w => {
    const regex = new RegExp(w, 'gi');
    result = result.replace(regex, '*'.repeat(w.length));
  });
  return result;
}
