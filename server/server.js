// server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Low, JSONFile } from 'lowdb';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

// Определяем __dirname для ES-модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к файлу базы данных
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// Гарантируем наличие структуры в БД
async function ensureDBData() {
  await db.read();
  if (!db.data) {
    db.data = { users: [], portfolios: [] };
  }
  if (!db.data.users) db.data.users = [];
  if (!db.data.portfolios) db.data.portfolios = [];
  await db.write();
}
await ensureDBData();

// Настраиваем почтовый транспорт (пример с Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'onlineportfolio42@gmail.com',   // <-- здесь ваш gmail
    pass: 'Gupioshio_32',      // <-- app password (не обычный пароль)
}

// Генерация 6-значного кода подтверждения
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Отправка письма
async function sendVerificationEmail(email, code) {
  const mailOptions = {
    from: 'onlineportfolio42@gmail.com',
    to: email,
    subject: 'Подтверждение регистрации',
    text: `Ваш код подтверждения: ${code}`,
  };
  await transporter.sendMail(mailOptions);
}

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

// Простой маршрут
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ---------------------------------------------
// РЕГИСТРАЦИЯ (шаг 1: отправляем код на почту)
// ---------------------------------------------
app.post('/api/register', async (req, res) => {
  await ensureDBData();
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }
  // Проверяем, не существует ли уже
  const existingUser = db.data.users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationCode = generateVerificationCode();

  // Создаём "черновик" пользователя (verified: false)
  const newUser = {
    id: Date.now(),
    name,
    email,
    password: hashedPassword,
    verified: false,
    verificationCode,
    favorites: [], // массив избранных анкет (ID)
  };

  db.data.users.push(newUser);
  await db.write();

  // Пытаемся отправить письмо
  try {
    await sendVerificationEmail(email, verificationCode);
    res.json({
      message: 'Код отправлен на вашу почту. Введите его, чтобы завершить регистрацию.',
    });
  } catch (err) {
    console.error('Ошибка при отправке письма:', err);
    res.status(500).json({ error: 'Не удалось отправить код подтверждения' });
  }
});

// ---------------------------------------------
// ВЕРИФИКАЦИЯ EMAIL (шаг 2)
// ---------------------------------------------
app.post('/api/verify-email', async (req, res) => {
  await ensureDBData();
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Укажите email и код' });
  }

  const userIndex = db.data.users.findIndex(u => u.email === email);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const user = db.data.users[userIndex];
  if (user.verified) {
    return res.status(400).json({ error: 'Этот пользователь уже подтверждён' });
  }

  if (user.verificationCode !== code) {
    return res.status(400).json({ error: 'Неверный код' });
  }

  // Подтверждаем
  user.verified = true;
  user.verificationCode = null; // стираем код
  db.data.users[userIndex] = user;
  await db.write();

  res.json({ message: 'Email подтверждён!', user });
});

// ---------------------------------------------
// ВХОД (проверяем verified)
// ---------------------------------------------
app.post('/api/login', async (req, res) => {
  await ensureDBData();
  const { email, password } = req.body;
  const user = db.data.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  if (!user.verified) {
    return res.status(403).json({ error: 'Ваш email ещё не подтверждён' });
  }
  // Успешный вход
  res.json({ message: 'Вход успешен', user });
});

// ---------------------------------------------
// ПОЛУЧЕНИЕ ПРОФИЛЯ
// ---------------------------------------------
app.get('/api/profile/:userId', async (req, res) => {
  await ensureDBData();
  const user = db.data.users.find(u => String(u.id) === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  // Можно скрыть пароль и т.п.
  const { password, verificationCode, ...rest } = user;
  res.json({ user: rest });
});

// ---------------------------------------------
// ОБНОВЛЕНИЕ ПРОФИЛЯ
// ---------------------------------------------
app.put('/api/profile/:userId', async (req, res) => {
  await ensureDBData();
  const { name, age, location, experience, education, photo, phone } = req.body;
  const userIndex = db.data.users.findIndex(u => String(u.id) === req.params.userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  db.data.users[userIndex] = {
    ...db.data.users[userIndex],
    name,
    age,
    location,
    experience,
    education,
    photo,
    phone,
  };
  await db.write();

  const updatedUser = db.data.users[userIndex];
  // Снова убираем поле password и verificationCode
  const { password, verificationCode, ...rest } = updatedUser;
  res.json({ message: 'Профиль обновлён', user: rest });
});

// ---------------------------------------------
// ПОЛУЧЕНИЕ ВСЕХ АНКЕТ
// ---------------------------------------------
app.get('/api/portfolios', async (req, res) => {
  await ensureDBData();
  res.json({ portfolios: db.data.portfolios });
});

// ---------------------------------------------
// СОЗДАНИЕ АНКЕТЫ
// ---------------------------------------------
app.post('/api/portfolios', async (req, res) => {
  await ensureDBData();
  const { fullname, description, skills, photo, owner, ownerId } = req.body;
  if (!owner || !ownerId) {
    return res.status(401).json({ error: 'Необходимо указать владельца (owner, ownerId)' });
  }

  const newPortfolio = {
    id: Date.now(),
    fullname,
    description,
    skills: skills || [],
    photo,
    owner,    // email
    ownerId,  // id пользователя
    createdAt: new Date().toISOString(),
  };
  db.data.portfolios.push(newPortfolio);
  await db.write();
  res.status(201).json({ message: 'Анкета создана', portfolio: newPortfolio });
});

// ---------------------------------------------
// УДАЛЕНИЕ АНКЕТЫ
// ---------------------------------------------
app.delete('/api/portfolios/:id', async (req, res) => {
  await ensureDBData();
  const portfolioId = Number(req.params.id);
  const initialLength = db.data.portfolios.length;
  db.data.portfolios = db.data.portfolios.filter(p => p.id !== portfolioId);
  await db.write();
  if (db.data.portfolios.length === initialLength) {
    return res.status(404).json({ error: 'Анкета не найдена' });
  }
  res.json({ message: 'Анкета удалена' });
});

// ---------------------------------------------
// ТОГЛ ДЛЯ "ИЗБРАННОГО" (у пользователя)
// ---------------------------------------------
app.put('/api/users/:userId/favorites', async (req, res) => {
  await ensureDBData();
  const { portfolioId } = req.body;
  const userId = req.params.userId;

  const userIndex = db.data.users.findIndex(u => String(u.id) === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  if (!db.data.users[userIndex].favorites) {
    db.data.users[userIndex].favorites = [];
  }
  const favArr = db.data.users[userIndex].favorites;
  const alreadyFav = favArr.includes(portfolioId);

  if (alreadyFav) {
    // Убираем из избранного
    db.data.users[userIndex].favorites = favArr.filter(id => id !== portfolioId);
  } else {
    // Добавляем в избранное
    db.data.users[userIndex].favorites.push(portfolioId);
  }

  await db.write();
  const user = db.data.users[userIndex];
  const { password, verificationCode, ...rest } = user; // скроем лишнее
  res.json({ message: 'Избранное обновлено', user: rest });
});

// ---------------------------------------------
app.listen(PORT, () => {
  console.log(`Server запущен на http://localhost:${PORT}`);
});
