// server/server.js
import express          from 'express';
import cors             from 'cors';
import bodyParser       from 'body-parser';
import bcrypt           from 'bcrypt';
import nodemailer       from 'nodemailer';
import { Low, JSONFile } from 'lowdb';
import path             from 'path';
import { fileURLToPath } from 'url';

import { cleanText, hasBadWords } from './utils/censor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// --- LowDB ------------------------------------------------------------------
const dbFile   = path.join(__dirname, 'db.json');
const adapter  = new JSONFile(dbFile);
const db       = new Low(adapter);
await ensureDB();                                 // сразу читаем/готовим БД

async function ensureDB() {
  await db.read();
  if (!db.data) db.data = { users: [], portfolios: [] };
  if (!db.data.users)       db.data.users       = [];
  if (!db.data.portfolios)  db.data.portfolios  = [];
  await db.write();
}

// --- E-mail (Gmail app-password) --------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'onlineportfolio42@gmail.com',
    pass: 'bwml lfri orjx ujiy'
  },
});

function genCode() { return Math.floor(100000 + Math.random()*900000).toString(); }
async function mailCode(to, code) {
  await transporter.sendMail({
    from: 'onlineportfolio42@gmail.com',
    to,
    subject: 'Подтверждение регистрации',
    text: `Ваш код подтверждения: ${code}`
  });
}

// --- Express ----------------------------------------------------------------
const app  = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

// ---------------------------------------------------------------------------
// 1) РЕГИСТРАЦИЯ – создаём черновик пользователя, шлём код
// ---------------------------------------------------------------------------
app.post('/api/register', async (req, res) => {
  await ensureDB();
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Заполните все поля' });

  const now = Date.now();
  const code = genCode();
  const expires = now + 15 * 60 * 1000;

  // Проверим существующего пользователя
  const existing = db.data.users.find(u => u.email === email);
  if (existing) {
    if (existing.verified) {
      return res.status(409).json({ error: 'Email уже зарегистрирован' });
    }
    // Повторная отправка кода для неподтвержденного пользователя
    existing.verificationCode = code;
    existing.verificationExpires = expires;
    try { await mailCode(email, code); }
    catch { return res.status(500).json({ error: 'Не удалось отправить письмо' }); }
    await db.write();
    return res.status(200).json({ message: 'Код отправлен заново' });
  }

  // Новый пользователь
  const hashed = await bcrypt.hash(password, 10);
  try {
    await mailCode(email, code);
  } catch {
    return res.status(500).json({ error: 'Не удалось отправить письмо' });
  }
  const draftUser = {
    id: now,
    name: cleanText(name),
    email,
    password: hashed,
    verified: false,
    verificationCode: code,
    verificationExpires: expires,
    favorites: []
  };
  db.data.users.push(draftUser);
  await db.write();
  res.status(200).json({ message: 'Код отправлен' });
});

// ---------------------------------------------------------------------------
// 2) ПОВТОРНАЯ ОТПРАВКА КОДА
// ---------------------------------------------------------------------------
app.post('/api/resend-code', async (req, res) => {
  await ensureDB();
  const { email } = req.body;
  const user = db.data.users.find(u => u.email === email);
  if (!user)            return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.verified)    return res.status(400).json({ error: 'Email уже подтверждён' });

  const code    = genCode();
  user.verificationCode    = code;
  user.verificationExpires = Date.now() + 15*60*1000;
  await db.write();

  try { await mailCode(email, code); }
  catch { return res.status(500).json({ error: 'Не удалось отправить письмо' }); }

  res.json({ message: 'Новый код отправлен' });
});

// ---------------------------------------------------------------------------
// 3) ПОДТВЕРЖДЕНИЕ EMAIL
// ---------------------------------------------------------------------------
app.post('/api/verify-email', async (req, res) => {
  await ensureDB();
  const { email, code } = req.body;
  const user = db.data.users.find(u => u.email === email);
  if (!user)            return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.verified)    return res.status(400).json({ error: 'Email уже подтверждён' });
  if (Date.now() > user.verificationExpires)
      return res.status(400).json({ error: 'Срок действия кода истёк' });
  if (user.verificationCode !== code)
      return res.status(400).json({ error: 'Неверный код' });

  user.verified = true;
  user.verificationCode = null;
  await db.write();
  const { password, ...safeUser } = user;
  res.json({ message: 'Email подтверждён', user: safeUser });
});

// ---------------------------------------------------------------------------
// 4) ВХОД
// ---------------------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  await ensureDB();
  const { email, password } = req.body;
  const user = db.data.users.find(u => u.email === email);
  if (!user)                      return res.status(401).json({ error: 'Неверный email или пароль' });
  if (!user.verified)             return res.status(403).json({ error: 'Email не подтверждён' });
  if (!await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: 'Неверный email или пароль' });

  const { password:_, verificationCode, ...safeUser } = user;
  res.json({ message: 'Вход успешен', user: safeUser });
});

// ---------------------------------------------------------------------------
// 5) ПОЛУЧИТЬ/ОБНОВИТЬ ПРОФИЛЬ
// ---------------------------------------------------------------------------
app.get('/api/profile/:id', async (req, res) => {
  await ensureDB();
  const user = db.data.users.find(u => String(u.id) === req.params.id);
  if (!user) return res.status(404).json({ error: 'Не найдено' });
  const { password, verificationCode, ...safe } = user;
  res.json({ user: safe });
});

app.put('/api/profile/:id', async (req, res) => {
  await ensureDB();
  const userIdx = db.data.users.findIndex(u => String(u.id) === req.params.id);
  if (userIdx === -1) return res.status(404).json({ error: 'Не найдено' });

  const forbidden = ['name','location','experience','education','phone']
    .some(f => req.body[f] && hasBadWords(req.body[f]));
  if (forbidden) return res.status(400).json({ error: 'Текст содержит неприемлемые слова' });

  const upd = { ...req.body };
  ['name','location','experience','education'].forEach(f => {
    if (upd[f]) upd[f] = cleanText(upd[f]);
  });

  db.data.users[userIdx] = { ...db.data.users[userIdx], ...upd };
  await db.write();
  const { password, verificationCode, ...safe } = db.data.users[userIdx];
  res.json({ message: 'Профиль обновлён', user: safe });
});

// ---------------------------------------------------------------------------
// 6) АНКЕТЫ
// ---------------------------------------------------------------------------
app.get('/api/portfolios', async (_req,res)=>{ await ensureDB(); res.json({portfolios: db.data.portfolios}); });

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
  db.data.portfolios.push(newPort); await db.write();
  res.status(201).json({ message:'Анкета создана', portfolio:newPort });
});

app.delete('/api/portfolios/:id', async (req,res)=>{
  await ensureDB();
  const id = Number(req.params.id);
  const before = db.data.portfolios.length;
  db.data.portfolios = db.data.portfolios.filter(p=>p.id!==id);
  await db.write();
  if (db.data.portfolios.length===before) return res.status(404).json({ error:'Не найдено' });
  res.json({ message:'Анкета удалена' });
});

// ---------------------------------------------------------------------------
// 7) ИЗБРАННОЕ
// ---------------------------------------------------------------------------
app.put('/api/users/:id/favorites', async (req,res)=>{
  await ensureDB();
  const uid = req.params.id;
  const { portfolioId } = req.body;
  const user = db.data.users.find(u=>String(u.id)===uid);
  if (!user) return res.status(404).json({ error:'Пользователь не найден' });

  user.favorites ??= [];
  const i = user.favorites.indexOf(portfolioId);
  i === -1 ? user.favorites.push(portfolioId)
           : user.favorites.splice(i,1);
  await db.write();
  const { password, verificationCode, ...safe } = user;
  res.json({ message:'Избранное обновлено', user:safe });
});

// ---------------------------------------------------------------------------
app.listen(PORT,()=>console.log(`🟢  Server: http://localhost:${PORT}`));
