// script.js
document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const searchInput = document.getElementById("search-input");
  const createProfileBtn = document.getElementById("create-profile-btn");
  const authButtons = document.getElementById("auth-buttons");
  const userSpan = document.getElementById("current-user");
  const filterToggle = document.getElementById("filter-toggle");
  const filterOptions = document.getElementById("filter-options");
  const applyFilterBtn = document.getElementById("apply-filter-btn");
  const portfolioList = document.getElementById("portfolio-list");
  const registrationForm = document.getElementById("registration-form");
  const verifyForm = document.getElementById("verify-form");
  const loginForm = document.getElementById("login-form");
  const createProfileForm = document.getElementById("create-profile-form");
  
  if (!searchInput || !createProfileBtn || !authButtons || !userSpan || 
      !filterToggle || !filterOptions || !applyFilterBtn || !portfolioList ||
      !registrationForm || !verifyForm || !loginForm || !createProfileForm) {
    console.error("Не найдены необходимые элементы на странице");
    return;
  }

  // ---------------------------------------------
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ---------------------------------------------
  function showToast(message, type = "info") {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      console.error("Не найден контейнер для уведомлений");
      return;
    }

    // Удаляем предыдущие уведомления того же типа
    const existingToasts = toastContainer.querySelectorAll(`.toast.${type}`);
    existingToasts.forEach(toast => {
      if (toast.parentNode === toastContainer) {
        toastContainer.removeChild(toast);
      }
    });

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    
    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.setAttribute('aria-hidden', 'true');
    
    switch (type) {
      case "success":
        icon.textContent = "✓";
        break;
      case "error":
        icon.textContent = "✕";
        break;
      case "warning":
        icon.textContent = "!";
        break;
      case "info":
        icon.textContent = "i";
        break;
    }
    
    const messageSpan = document.createElement("span");
    messageSpan.textContent = message;
    
    toast.appendChild(icon);
    toast.appendChild(messageSpan);
    toastContainer.appendChild(toast);

    // Автоматическое удаление через 4 секунды
    setTimeout(() => {
      if (toast.parentNode === toastContainer) {
        toast.classList.add("fade-out");
        setTimeout(() => {
          if (toast.parentNode === toastContainer) {
            toastContainer.removeChild(toast);
          }
        }, 300);
      }
    }, 4000);
  }

  function validateForm(form) {
    if (!form) return { isValid: false, errors: ['Form not found'] };
    
    const errors = [];
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    
    inputs.forEach((input) => {
      const errorSpan = input.nextElementSibling;
      if (!errorSpan) return;
      
      // Очищаем предыдущие ошибки
      errorSpan.textContent = "";
      
      // Проверка на пустое значение
      if (!input.value.trim()) {
        errors.push(`${input.name} is required`);
        errorSpan.textContent = "Это поле обязательно";
        return;
      }
      
      // Специфичные проверки для разных типов полей
      switch (input.type) {
        case "email":
          if (!isValidEmail(input.value)) {
            errors.push('Invalid email format');
            errorSpan.textContent = "Введите корректный email";
          }
          break;
        case "password":
          if (!isValidPassword(input.value)) {
            errors.push('Password must be at least 6 characters');
            errorSpan.textContent = "Пароль должен содержать минимум 6 символов";
          }
          break;
        case "text":
          if (input.name === "skills") {
            if (!isValidSkills(input.value)) {
              errors.push('At least one skill is required');
              errorSpan.textContent = "Введите хотя бы один навык";
            }
          }
          break;
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  function getCurrentUser() {
    try {
      const user = localStorage.getItem("currentUser");
      return user ? JSON.parse(user) : null;
    } catch (err) {
      console.error("Ошибка при получении данных пользователя:", err);
      return null;
    }
  }

  function setCurrentUser(user) {
    try {
      localStorage.setItem("currentUser", JSON.stringify(user));
    } catch (err) {
      console.error("Ошибка при сохранении данных пользователя:", err);
      showToast("Ошибка сохранения данных", "error");
    }
  }

  function clearCurrentUser() {
    try {
      localStorage.removeItem("currentUser");
    } catch (err) {
      console.error("Ошибка при удалении данных пользователя:", err);
    }
  }

  function updateCurrentUserName() {
    const user = getCurrentUser();
    if (user) {
      userSpan.textContent = `Привет, ${user.name}`;
      createProfileBtn.style.display = "inline-block";
      authButtons.style.display = "none";
    } else {
      userSpan.textContent = "";
      createProfileBtn.style.display = "none";
      authButtons.style.display = "flex";
    }
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Модальное окно ${modalId} не найдено`);
      return;
    }
    modal.classList.add("show");
    modal.style.display = "block";
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Модальное окно ${modalId} не найдено`);
      return;
    }
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }

  // Функция для чтения файла как Data URL
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve(null);
        return;
      }

      // Проверка размера файла (максимум 2MB)
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error("Максимальный размер файла - 2MB"));
        return;
      }

      // Проверка типа файла
      if (!file.type.startsWith('image/')) {
        reject(new Error("Файл должен быть изображением"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("Ошибка при чтении файла"));
      reader.readAsDataURL(file);
    });
  }

  // Функция для проверки валидности email
  function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // Функция для проверки валидности пароля
  function isValidPassword(password) {
    return password.length >= 6;
  }

  // Функция для проверки валидности кода подтверждения
  function isValidVerificationCode(code) {
    return /^\d{6}$/.test(code);
  }

  // Функция для проверки валидности навыков
  function isValidSkills(skills) {
    const skillsArray = skills.split(',').map(s => s.trim());
    return skillsArray.length > 0 && skillsArray.every(s => s.length > 0);
  }

  // ---------------------------------------------
  // API-ФУНКЦИИ
  // ---------------------------------------------
  const API_URL = "/api";

  async function handleApiError(err, message) {
    console.error(message, err);
    let errorMessage = "Произошла ошибка при выполнении запроса";
    
    if (err.response) {
      try {
        const data = await err.response.json();
        errorMessage = data.error || errorMessage;
      } catch {
        errorMessage = `Ошибка сервера: ${err.response.status}`;
      }
    } else if (err.request) {
      errorMessage = "Нет ответа от сервера. Проверьте подключение к интернету.";
    }
    
    showToast(errorMessage, "error");
    return { error: errorMessage };
  }

  async function registerUserAPI(user) {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      const data = await res.json();
      if (!res.ok) {
        throw { response: { json: () => Promise.resolve(data) } };
      }
      return data;
    } catch (err) {
      return handleApiError(err, "Ошибка регистрации:");
    }
  }

  async function verifyEmailAPI(email, code) {
    try {
      const res = await fetch(`${API_URL}/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw { response: { json: () => Promise.resolve(data) } };
      }
      return data;
    } catch (err) {
      return handleApiError(err, "Ошибка подтверждения email:");
    }
  }

  async function loginUserAPI(email, password) {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw { response: { json: () => Promise.resolve(data) } };
      }
      return data;
    } catch (err) {
      return handleApiError(err, "Ошибка входа:");
    }
  }

  async function createPortfolioAPI(portfolioData) {
    try {
      const res = await fetch(`${API_URL}/portfolios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(portfolioData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw { response: { json: () => Promise.resolve(data) } };
      }
      return data;
    } catch (err) {
      return handleApiError(err, "Ошибка создания анкеты:");
    }
  }

  async function getPortfoliosAPI() {
    try {
      const res = await fetch(`${API_URL}/portfolios`);
      const data = await res.json();
      if (!res.ok) {
        throw { response: { json: () => Promise.resolve(data) } };
      }
      return data;
    } catch (err) {
      return handleApiError(err, "Ошибка загрузки анкет:");
    }
  }

  async function deletePortfolioAPI(id) {
    try {
      const res = await fetch(`${API_URL}/portfolios/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw { response: { json: () => Promise.resolve(data) } };
      }
      return data;
    } catch (err) {
      return handleApiError(err, "Ошибка удаления анкеты:");
    }
  }

  // ---------------------------------------------
  // ФУНКЦИЯ ПОЛУЧЕНИЯ+ФИЛЬТРАЦИИ+СОРТИРОВКИ АНКЕТ
  // ---------------------------------------------
  async function filterAndRenderPortfolios() {
    try {
      const result = await getPortfoliosAPI();
      if (result.error) {
        throw new Error(result.error);
      }

      let portfolios = result.portfolios || [];
      const user = getCurrentUser();

      // Поиск
      const query = searchInput.value.trim().toLowerCase();
      if (query) {
        portfolios = portfolios.filter((p) =>
          p.fullname.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.skills.some(skill => skill.toLowerCase().includes(query))
        );
      }

      // Фильтр по навыкам
      const skills = Array.from(document.querySelectorAll('input[name="skill"]:checked'))
        .map((checkbox) => checkbox.value);

      if (skills.length > 0) {
        portfolios = portfolios.filter((p) =>
          skills.every((skill) => p.skills.includes(skill))
        );
      }

      // Фильтр по дате
      const dateFromValue = document.getElementById("date-from").value;
      const dateToValue = document.getElementById("date-to").value;
      
      if (dateFromValue) {
        const fromDate = new Date(dateFromValue);
        portfolios = portfolios.filter((p) => new Date(p.createdAt) >= fromDate);
      }
      
      if (dateToValue) {
        const toDate = new Date(dateToValue);
        toDate.setHours(23, 59, 59, 999);
        portfolios = portfolios.filter((p) => new Date(p.createdAt) <= toDate);
      }

      // Сортировка
      const sortBy = document.getElementById("sort-select").value;
      switch (sortBy) {
        case "date_desc":
          portfolios.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case "date_asc":
          portfolios.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
        case "alpha_asc":
          portfolios.sort((a, b) => a.fullname.localeCompare(b.fullname));
          break;
        case "alpha_desc":
          portfolios.sort((a, b) => b.fullname.localeCompare(a.fullname));
          break;
      }

      // Отрисовка результатов
      if (portfolios.length === 0) {
        portfolioList.innerHTML = '<div class="no-results">По вашему запросу ничего не найдено</div>';
      } else {
        renderPortfolios(portfolios);
      }
    } catch (error) {
      showToast(error.message, "error");
      portfolioList.innerHTML = '<div class="error-message">Ошибка при загрузке анкет</div>';
    }
  }

  // ---------------------------------------------
  // ОТОБРАЖЕНИЕ СПИСКА АНКЕТ
  // ---------------------------------------------
  function renderPortfolios(portfolios) {
    if (!portfolioList) return;
    
    portfolioList.innerHTML = "";
    const currentUser = getCurrentUser();

    portfolios.forEach((portfolio) => {
      const portfolioCard = document.createElement("div");
      portfolioCard.className = "portfolio-card";
      
      // Форматирование даты
      const creationDate = new Date(portfolio.createdAt);
      const formattedDate = creationDate.toLocaleString("ru-RU", {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      portfolioCard.innerHTML = `
        <h3>${portfolio.fullname}</h3>
        <p class="description">${portfolio.description}</p>
        <div class="skills-container">
          ${portfolio.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
        </div>
        ${portfolio.photo ? `
          <div class="photo-container">
            <img src="${portfolio.photo}" alt="Фото" loading="lazy"/>
          </div>
        ` : ''}
        <p class="creation-date">
          Создано: ${formattedDate}
        </p>
      `;

      // Кнопка удаления (только для владельца)
      if (currentUser && currentUser.email === portfolio.owner) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete";
        deleteBtn.textContent = "Удалить";
        deleteBtn.addEventListener("click", async () => {
          if (confirm("Вы действительно хотите удалить эту анкету?")) {
            try {
              const result = await deletePortfolioAPI(portfolio.id);
              if (result.error) {
                throw new Error(result.error);
              }
              showToast("Анкета успешно удалена", "success");
              filterAndRenderPortfolios();
            } catch (error) {
              showToast(error.message, "error");
            }
          }
        });
        portfolioCard.appendChild(deleteBtn);
      }

      portfolioList.appendChild(portfolioCard);
    });
  }

  // ---------------------------------------------
  // ЭЛЕМЕНТЫ ДЛЯ ФИЛЬТРА
  // ---------------------------------------------
  if (filterToggle && filterOptions) {
    filterToggle.addEventListener("click", () => {
      filterOptions.style.display = filterOptions.style.display === "none" ? "block" : "none";
    });
  }

  if (applyFilterBtn) {
    applyFilterBtn.addEventListener("click", () => {
      filterAndRenderPortfolios();
    });
  }

  // Initial load
  if (portfolioList) {
    filterAndRenderPortfolios();
  }

  // Поиск при вводе
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      filterAndRenderPortfolios();
    });
  }

  // ---------------------------------------------
  // ОБРАБОТЧИКИ СОБЫТИЙ
  // ---------------------------------------------
  // Регистрация
  if (registrationForm) {
    registrationForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(registrationForm)) return;

      const submitBtn = registrationForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const formData = new FormData(registrationForm);
        const email = formData.get("email");
        const password = formData.get("password");

        if (!isValidEmail(email)) {
          throw new Error("Неверный формат email");
        }

        if (!isValidPassword(password)) {
          throw new Error("Пароль должен содержать минимум 6 символов");
        }

        const user = {
          name: formData.get("name"),
          email: email,
          password: password,
        };

        const result = await registerUserAPI(user);
        if (result.error) {
          throw new Error(result.error);
        }

        showToast("Регистрация успешна! Проверьте email для подтверждения.", "success");
        closeModal("modal-registration");
        openModal("modal-verify");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Подтверждение email
  if (verifyForm) {
    verifyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(verifyForm)) return;

      const submitBtn = verifyForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const formData = new FormData(verifyForm);
        const email = formData.get("email");
        const code = formData.get("code");

        if (!isValidEmail(email)) {
          throw new Error("Неверный формат email");
        }

        if (!isValidVerificationCode(code)) {
          throw new Error("Код подтверждения должен состоять из 6 цифр");
        }

        const result = await verifyEmailAPI(email, code);
        if (result.error) {
          throw new Error(result.error);
        }

        showToast("Email подтвержден! Теперь вы можете войти.", "success");
        closeModal("modal-verify");
        openModal("modal-login");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Вход
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(loginForm)) return;

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const formData = new FormData(loginForm);
        const email = formData.get("email");
        const password = formData.get("password");

        if (!isValidEmail(email)) {
          throw new Error("Неверный формат email");
        }

        if (!isValidPassword(password)) {
          throw new Error("Пароль должен содержать минимум 6 символов");
        }

        const result = await loginUserAPI(email, password);
        if (result.error) {
          throw new Error(result.error);
        }

        setCurrentUser(result.user);
        updateCurrentUserName();
        showToast("Вход выполнен успешно!", "success");
        closeModal("modal-login");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Создание анкеты
  if (createProfileForm) {
    createProfileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(createProfileForm)) return;

      const submitBtn = createProfileForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const formData = new FormData(createProfileForm);
        const photoFile = formData.get("photo");
        
        // Проверка навыков
        const skills = formData.get("skills");
        if (!isValidSkills(skills)) {
          throw new Error("Пожалуйста, введите хотя бы один навык");
        }

        const portfolioData = {
          fullname: formData.get("fullname"),
          description: formData.get("description"),
          skills: skills.split(",").map((s) => s.trim()),
          photo: photoFile ? await readFileAsDataURL(photoFile) : null,
        };

        const result = await createPortfolioAPI(portfolioData);
        if (result.error) {
          throw new Error(result.error);
        }

        showToast("Анкета создана успешно!", "success");
        closeModal("modal-create-profile");
        filterAndRenderPortfolios();
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Кнопки открытия модальных окон
  const regBtn = document.getElementById("reg-btn");
  const loginBtn = document.getElementById("login-btn");
  
  if (regBtn) {
    regBtn.addEventListener("click", () => {
      openModal("modal-registration");
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      openModal("modal-login");
    });
  }

  if (createProfileBtn) {
    createProfileBtn.addEventListener("click", () => {
      openModal("modal-create-profile");
    });
  }

  // Кнопки закрытия модальных окон
  document.querySelectorAll(".close").forEach((btn) => {
    if (btn.dataset.modal) {
      btn.addEventListener("click", () => {
        closeModal(btn.dataset.modal);
      });
    }
  });

  // Закрытие модальных окон по клику вне контента
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
});
