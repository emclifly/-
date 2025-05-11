// server/server.js
import express           from 'express';
import cors              from 'cors';
import bodyParser        from 'body-parser';
import bcrypt            from 'bcrypt';          // при проблемах см. примечание ниже
import nodemailer        from 'nodemailer';
import { JSONFilePreset } from 'lowdb/node';
import path              from 'path';
import { fileURLToPath } from 'url';

import { cleanText, hasBadWords } from './utils/censor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── LowDB ──────────────────────────────────────────────────────────────────────
const dbFile = path.join(__dirname, 'db.json');
const db     = await JSONFilePreset(dbFile, { users: [], portfolios: [] });

async function ensureDB() {
  // структура гарантирована, но держим функцию, чтобы не переписывать все вызовы
  db.data.users      ??= [];
  db.data.portfolios ??= [];
  await db.write();
}

// ─── E‑mail (Gmail app‑password) ───────────────────────────────────────────────
const EMAIL_USER = process.env.EMAIL_USER || 'onlineportfolio42@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'bwmllfriorjxujiy';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

function genCode()           { return (100000 + Math.random()*900000 | 0).toString(); }
const mailCode = async (to,c)=> transporter.sendMail({
  from: EMAIL_USER,
  to,
  subject: 'Подтверждение регистрации',
  text: `Ваш код подтверждения: ${c}`
});

// ─── Express ───────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

// Добавляем расширенные заголовки CORS для Render
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

// ─── 1) Регистрация ────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  await ensureDB();
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Заполните все поля' });

  const now      = Date.now();
  const code     = genCode();
  const expires  = now + 15*60*1000;
  const existing = db.data.users.find(u => u.email === email);

  if (existing) {
    if (existing.verified)
      return res.status(409).json({ error: 'Email уже зарегистрирован' });

    Object.assign(existing, { verificationCode: code, verificationExpires: expires });
    try { await mailCode(email, code); } catch {
      return res.status(500).json({ error: 'Не удалось отправить письмо' });
    }
    await db.write();
    return res.json({ message: 'Код отправлен заново' });
  }

  let hashed;
  try { hashed = await bcrypt.hash(password, 10); }
  catch { return res.status(500).json({ error: 'Ошибка шифрования пароля' }); }

  try { await mailCode(email, code); }
  catch { return res.status(500).json({ error: 'Не удалось отправить письмо' }); }

  db.data.users.push({
    id: now,
    name: cleanText(name),
    email,
    password: hashed,
    verified: false,
    verificationCode: code,
    verificationExpires: expires,
    favorites: []
  });
  await db.write();
  res.json({ message: 'Код отправлен' });
});

// ─── 2) Повторная отправка кода ────────────────────────────────────────────────
app.post('/api/resend-code', async (req, res) => {
  await ensureDB();
  const { email } = req.body;
  const user = db.data.users.find(u => u.email === email);
  if (!user)         return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.verified) return res.status(400).json({ error: 'Email уже подтверждён' });

  const code = genCode();
  Object.assign(user, { verificationCode: code, verificationExpires: Date.now()+15*60*1000 });
  await db.write();

  try { await mailCode(email, code); }
  catch { return res.status(500).json({ error: 'Не удалось отправить письмо' }); }

  res.json({ message: 'Новый код отправлен' });
});

// ─── 3) Подтверждение email ────────────────────────────────────────────────────
app.post('/api/verify-email', async (req, res) => {
  await ensureDB();
  const { email, code } = req.body;
  const user = db.data.users.find(u => u.email === email);
  if (!user)                      return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.verified)             return res.status(400).json({ error: 'Email уже подтверждён' });
  if (Date.now() > user.verificationExpires)
    return res.status(400).json({ error: 'Срок действия кода истёк' });
  if (user.verificationCode !== code)
    return res.status(400).json({ error: 'Неверный код' });

  user.verified = true;
  user.verificationCode = null;
  await db.write();
  const { password, ...safe } = user;
  res.json({ message: 'Email подтверждён', user: safe });
});

// ─── 4) Вход ────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  await ensureDB();
  const { email, password } = req.body;
  const user = db.data.users.find(u => u.email === email);
  if (!user)          return res.status(401).json({ error: 'Неверный email или пароль' });
  if (!user.verified) return res.status(403).json({ error: 'Email не подтверждён' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok)            return res.status(401).json({ error: 'Неверный email или пароль' });

  const { password:_, verificationCode, ...safe } = user;
  res.json({ message: 'Вход успешен', user: safe });
});

// ─── 5) Профиль ────────────────────────────────────────────────────────────────
app.get('/api/profile/:id', async (req, res) => {
  await ensureDB();
  const user = db.data.users.find(u => String(u.id) === req.params.id);
  if (!user) return res.status(404).json({ error: 'Не найдено' });
  const { password, verificationCode, ...safe } = user;
  res.json({ user: safe });
});

app.put('/api/profile/:id', async (req, res) => {
  await ensureDB();
  const idx = db.data.users.findIndex(u => String(u.id) === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Не найдено' });

  const bad = ['name','location','experience','education','phone']
    .some(f => req.body[f] && hasBadWords(req.body[f]));
  if (bad) return res.status(400).json({ error: 'Текст содержит неприемлемые слова' });

  const upd = { ...req.body };
  ['name','location','experience','education'].forEach(f => {
    if (upd[f]) upd[f] = cleanText(upd[f]);
  });

  db.data.users[idx] = { ...db.data.users[idx], ...upd };
  await db.write();
  const { password, verificationCode, ...safe } = db.data.users[idx];
  res.json({ message: 'Профиль обновлён', user: safe });
});

// ─── 6) Анкеты ────────────────────────────────────────────────────────────────
app.get('/api/portfolios', async (_req,res)=>{
  await ensureDB();
  res.json({ portfolios: db.data.portfolios });
});

app.post('/api/portfolios', async (req,res)=>{
  await ensureDB();
  const { fullname, description, skills=[], photo, owner, ownerId } = req.body;
  if (!owner || !ownerId) return res.status(401).json({ error:'Нет owner/ownerId' });

  if ([fullname, description].some(hasBadWords))
    return res.status(400).json({ error: 'Текст содержит неприемлемые слова' });

  const newPort = {
    id: Date.now(),
    fullname: cleanText(fullname),
    description: cleanText(description),
    skills,
    photo,
    owner,
    ownerId,
    createdAt: new Date().toISOString()
  };
  db.data.portfolios.push(newPort);
  await db.write();
  res.status(201).json({ message:'Анкета создана', portfolio:newPort });
});

app.delete('/api/portfolios/:id', async (req,res)=>{
  await ensureDB();
  const id = +req.params.id;
  const before = db.data.portfolios.length;
  db.data.portfolios = db.data.portfolios.filter(p=>p.id!==id);
  await db.write();
  if (db.data.portfolios.length===before)
    return res.status(404).json({ error:'Не найдено' });
  res.json({ message:'Анкета удалена' });
});

// ─── 7) Избранное ──────────────────────────────────────────────────────────────
app.put('/api/users/:id/favorites', async (req,res)=>{
  await ensureDB();
  const { id } = req.params;
  const { portfolioId } = req.body;
  const user = db.data.users.find(u=>String(u.id)===id);
  if (!user) return res.status(404).json({ error:'Пользователь не найден' });

  user.favorites ??= [];
  const i = user.favorites.indexOf(portfolioId);
  i === -1 ? user.favorites.push(portfolioId) : user.favorites.splice(i,1);
  await db.write();
  const { password, verificationCode, ...safe } = user;
  res.json({ message:'Избранное обновлено', user:safe });
});

// ─── Старт сервера ────────────────────────────────────────────────────────────
await ensureDB(); // Ensure DB is initialized before starting
app.listen(PORT, '0.0.0.0', () => console.log(`🟢 Server: http://localhost:${PORT}`));
