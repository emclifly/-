import { hasBadWords, cleanText } from '../utils/censor.js';

export function profanityFilter(req, res, next) {
  const body = req.body;
  for (const key in body) {
    if (typeof body[key] === 'string') {
      if (hasBadWords(body[key])) {
        return res.status(400).json({ error: 'В тексте присутствует нецензурная лексика' });
      }
      body[key] = cleanText(body[key]);
    }
  }
  next();
}
