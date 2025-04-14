// server.js (ES-модуль, lowdb@3.0.0)
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Low, JSONFile } from 'lowdb';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

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
  // Если база пуста или нет нужных полей — заполним
  if (!db.data) {
    db.data = { users: [], portfolios: [] };
  }
  if (!db.data.users) db.data.users = [];
  if (!db.data.portfolios) db.data.portfolios = [];
  await db.write();
}

await ensureDBData();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));


// Простой маршрут для проверки сервера
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Регистрация пользователя
app.post('/api/register', async (req, res) => {
  await ensureDBData();
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }
  if (db.data.users.find((u) => u.email === email)) {
    return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now(),
    name,
    email,
    password: hashedPassword
  };
  db.data.users.push(newUser);
  await db.write();
  res.status(201).json({ message: 'Регистрация успешна', user: newUser });
});

// Вход пользователя
app.post('/api/login', async (req, res) => {
  await ensureDBData();
  const { email, password } = req.body;
  const user = db.data.users.find((u) => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  res.json({ message: 'Вход успешен', user });
});

// Получение профиля по ID
app.get('/api/profile/:userId', async (req, res) => {
  await ensureDBData();
  const user = db.data.users.find((u) => String(u.id) === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  res.json({ user });
});

// Обновление профиля
app.put('/api/profile/:userId', async (req, res) => {
  await ensureDBData();
  const { name, age, location, experience, education, photo } = req.body;
  const userIndex = db.data.users.findIndex((u) => String(u.id) === req.params.userId);
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
  };
  await db.write();
  res.json({ message: 'Профиль обновлён', user: db.data.users[userIndex] });
});

// Получение всех анкет
app.get('/api/portfolios', async (req, res) => {
  await ensureDBData();
  res.json({ portfolios: db.data.portfolios });
});

// Создание анкеты
app.post('/api/portfolios', async (req, res) => {
  await ensureDBData();
  const { fullname, description, skills, photo, owner } = req.body;
  if (!owner) {
    return res.status(401).json({ error: 'Необходимо указать владельца анкеты' });
  }
  const newPortfolio = {
    id: Date.now(),
    fullname,
    description,
    skills: skills || [],
    photo,
    owner,
    createdAt: new Date().toISOString(),
    favorite: false,
  };
  db.data.portfolios.push(newPortfolio);
  await db.write();
  res.status(201).json({ message: 'Анкета создана', portfolio: newPortfolio });
});

// Обновление анкеты
app.put('/api/portfolios/:id', async (req, res) => {
  await ensureDBData();
  const { fullname, description, skills, photo, favorite } = req.body;
  const portfolioId = Number(req.params.id);
  const index = db.data.portfolios.findIndex((p) => p.id === portfolioId);
  if (index === -1) {
    return res.status(404).json({ error: 'Анкета не найдена' });
  }
  db.data.portfolios[index] = {
    ...db.data.portfolios[index],
    fullname,
    description,
    skills,
    photo,
  };
  // Если хотим поменять признак "избранное"
  if (typeof favorite === 'boolean') {
    db.data.portfolios[index].favorite = favorite;
  }
  await db.write();
  res.json({ message: 'Анкета обновлена', portfolio: db.data.portfolios[index] });
});

// Удаление анкеты
app.delete('/api/portfolios/:id', async (req, res) => {
  await ensureDBData();
  const portfolioId = Number(req.params.id);
  const initialLength = db.data.portfolios.length;
  db.data.portfolios = db.data.portfolios.filter((p) => p.id !== portfolioId);
  await db.write();
  if (db.data.portfolios.length === initialLength) {
    return res.status(404).json({ error: 'Анкета не найдена' });
  }
  res.json({ message: 'Анкета удалена' });
});

// Удаление всех анкет (для разработчика/тестов)
app.delete('/api/portfolios', async (req, res) => {
  await ensureDBData();
  db.data.portfolios = [];
  await db.write();
  res.json({ message: 'Все анкеты удалены' });
});

app.listen(PORT, () => {
  console.log(`Server запущен на http://localhost:${PORT}`);
});
