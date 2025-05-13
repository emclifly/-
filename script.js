// script.js
document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------------------------
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ---------------------------------------------
  function showToast(message, type = "info") {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;
    
    // Создаем контейнер для тоста, если его нет
    if (!document.getElementById("toast-container")) {
      const container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    // Добавляем иконку в зависимости от типа
    if (type === "error") {
      toast.innerHTML = `<span class="toast-icon">⚠️</span> ${message}`;
    } else if (type === "success") {
      toast.innerHTML = `<span class="toast-icon">✅</span> ${message}`;
    } else {
      toast.textContent = message;
    }
    
    toastContainer.appendChild(toast);
    
    // Автоматически удаляем через 4 секунды
    setTimeout(() => {
      if (toast.parentNode === toastContainer) {
        toast.classList.add("toast-fade-out");
        setTimeout(() => toastContainer.removeChild(toast), 500);
      }
    }, 4000);
  }

  function validateForm(form) {
    let valid = true;
    form.querySelectorAll("input[required], textarea[required]").forEach((input) => {
      const errorSpan = input.nextElementSibling;
      if (!input.value.trim()) {
        errorSpan.textContent = "Это поле обязательно";
        valid = false;
      } else {
        errorSpan.textContent = "";
      }
    });
    return valid;
  }

  function getCurrentUser() {
    return JSON.parse(localStorage.getItem("currentUser"));
  }

  function setCurrentUser(user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
  }

  function clearCurrentUser() {
    localStorage.removeItem("currentUser");
  }

  function updateCurrentUserName() {
    const userSpan = document.getElementById("current-user");
    const user = getCurrentUser();
    if (user) {
      userSpan.textContent = `Привет, ${user.name}`;
      document.getElementById("profile-btn").style.display = "inline-block";
      document.getElementById("create-profile-btn").style.display = "inline-block";
      document.getElementById("auth-buttons").style.display = "none";
    } else {
      userSpan.textContent = "";
      document.getElementById("profile-btn").style.display = "none";
      document.getElementById("create-profile-btn").style.display = "none";
      document.getElementById("auth-buttons").style.display = "flex";
    }
  }
  updateCurrentUserName();

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("show");
      modal.style.display = "block";
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("show");
      setTimeout(() => {
        modal.style.display = "none";
      }, 300);
    }
  }

  // ---------------------------------------------
  // API-ФУНКЦИИ
  // ---------------------------------------------
  const API_URL = "https://online-porfolio-tz20.onrender.com/api";
  
  // Можно добавить запасной вариант, если API недоступен
  async function checkApiAvailability() {
    try {
      const res = await fetch(`${API_URL}/portfolios`, { method: "GET" });
      return res.ok;
    } catch (err) {
      console.error("API недоступен:", err);
      return false;
    }
  }

  async function registerUserAPI(user) {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      return await res.json();
    } catch (err) {
      console.error("Ошибка регистрации:", err);
      return { error: "Ошибка связи с сервером" };
    }
  }

  async function verifyEmailAPI(email, code) {
    try {
      const res = await fetch(`${API_URL}/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      return await res.json();
    } catch (err) {
      console.error("Ошибка подтверждения email:", err);
      return { error: "Ошибка связи с сервером" };
    }
  }

  async function loginUserAPI(email, password) {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return await res.json();
    } catch (err) {
      console.error("Ошибка входа:", err);
      return { error: "Ошибка связи с сервером" };
    }
  }

  async function updateUserProfile(userId, profileData) {
    try {
      const res = await fetch(`${API_URL}/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      return await res.json();
    } catch (err) {
      console.error("Ошибка обновления профиля:", err);
      return { error: "Ошибка связи с сервером" };
    }
  }

  async function createPortfolioAPI(portfolioData) {
    try {
      // Убедимся, что передаем больше информации о владельце
      const user = getCurrentUser();
      if (user) {
        // Добавляем больше информации о пользователе
        portfolioData.ownerInfo = {
          name: user.name,
          photo: user.photo,
          age: user.age,
          location: user.location,
          experience: user.experience,
          education: user.education,
          phone: user.phone
        };
        
        // Важно: сохраняем имя владельца отдельно, чтобы оно всегда было доступно
        portfolioData.ownerName = user.name;
      }
      
      const res = await fetch(`${API_URL}/portfolios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(portfolioData),
      });
      return await res.json();
    } catch (err) {
      console.error("Ошибка создания анкеты:", err);
      return { error: "Ошибка связи с сервером" };
    }
  }

  async function getPortfoliosAPI() {
    try {
      // Проверяем доступность API перед основным запросом
      const isApiAvailable = await checkApiAvailability();
      if (!isApiAvailable) {
        return { error: "Сервер недоступен. Пожалуйста, повторите попытку позже." };
      }
      
      const res = await fetch(`${API_URL}/portfolios`);
      if (!res.ok) {
        throw new Error(`Ошибка HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error("Ошибка загрузки анкет:", err);
      return { error: "Ошибка связи с сервером. Возможно, сервер временно недоступен." };
    }
  }

  // Новый эндпоинт для получения профиля по ID
  async function getUserByIdAPI(userId) {
    try {
      const res = await fetch(`${API_URL}/users/${userId}`);
      if (!res.ok) {
        throw new Error(`Ошибка HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error("Ошибка загрузки профиля:", err);
      return { error: "Ошибка связи с сервером" };
    }
  }

  // Новый эндпоинт для добавления/убирания анкеты из избранного
  async function toggleFavoriteAPI(userId, portfolioId) {
    try {
      const res = await fetch(`${API_URL}/users/${userId}/favorites`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId }),
      });
      return await res.json();
    } catch (err) {
      console.error("Ошибка избранного:", err);
      return { error: "Ошибка связи с сервером" };
    }
  }

  async function deletePortfolioAPI(id) {
    try {
      const res = await fetch(`${API_URL}/portfolios/${id}`, {
        method: "DELETE",
      });
      return await res.json();
    } catch (err) {
      console.error("Ошибка удаления анкеты:", err);
      return { error: "Ошибка связи с сервером" };
    }
  }

  // После других API функций добавим новые для восстановления пароля
  async function requestPasswordResetAPI(email) {
    try {
      const res = await fetch(`${API_URL}/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      return await res.json();
    } catch (err) {
      console.error("Ошибка запроса сброса пароля:", err);
      return { error: "Ошибка связи с сервером" };
    }
  }

  async function resetPasswordAPI(email, code, newPassword) {
    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      return await res.json();
    } catch (err) {
      console.error("Ошибка сброса пароля:", err);
      return { error: "Ошибка связи с сервером" };
    }
  }

  // ---------------------------------------------
  // ФУНКЦИЯ ПОЛУЧЕНИЯ+ФИЛЬТРАЦИИ+СОРТИРОВКИ АНКЕТ
  // ---------------------------------------------
  async function filterAndRenderPortfolios() {
    const result = await getPortfoliosAPI();
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    let portfolios = result.portfolios || [];
    const user = getCurrentUser();

    // 1) Поиск
    const query = searchInput.value.trim().toLowerCase();
    if (query) {
      portfolios = portfolios.filter((p) =>
        p.fullname.toLowerCase().includes(query)
      );
    }

    // 2) Фильтр по навыкам
    const skills = Array.from(document.querySelectorAll('input[name="skill"]:checked'))
      .map((checkbox) => checkbox.value);

    if (skills.length > 0) {
      portfolios = portfolios.filter((p) =>
        skills.every((skill) => p.skills.includes(skill))
      );
    }

    // 3) "Только избранные"
    const isFavoriteOnly = document.getElementById("filter-favorite").checked;
    if (isFavoriteOnly && user) {
      const favs = user.favorites || [];
      portfolios = portfolios.filter((p) => favs.includes(String(p.id)));
    }

    // 4) Фильтр по дате
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

    // 5) Сортировка
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

    // 6) Избранные выше остальных
    if (user && user.favorites) {
      portfolios.sort((a, b) => {
        const aFav = user.favorites.includes(String(a.id));
        const bFav = user.favorites.includes(String(b.id));
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return 0;
      });
    }

    // Отрисовываем
    renderPortfolios(portfolios);
  }

  // ---------------------------------------------
  // ОТОБРАЖЕНИЕ СПИСКА АНКЕТ
  // ---------------------------------------------
  function renderPortfolios(portfolios) {
    const portfolioList = document.getElementById("portfolio-list");
    portfolioList.innerHTML = "";
    const currentUser = getCurrentUser();

    portfolios.forEach((portfolio) => {
      const portfolioCard = document.createElement("div");
      portfolioCard.className = "portfolio-card";
      portfolioCard.innerHTML = `
        <h3>${portfolio.fullname}</h3>
        <p class="portfolio-description">${portfolio.description}</p>
        <p>Навыки: ${portfolio.skills.join(", ")}</p>
        ${
          portfolio.photo
            ? `<img src="${portfolio.photo}" alt="Фото" style="margin-top:10px; max-width:100%;"/>`
            : ""
        }
        <p class="creation-date">
          Создано: ${new Date(portfolio.createdAt).toLocaleString("ru-RU")}
        </p>
      `;

      // Добавляем кнопку просмотра профиля пользователя
      const viewProfileBtn = document.createElement("button");
      viewProfileBtn.className = "profile-view-btn";
      viewProfileBtn.textContent = "Профиль автора";
      viewProfileBtn.addEventListener("click", async () => {
        try {
          // Проверяем, есть ли сохраненные данные о профиле в самой анкете
          if (portfolio.ownerInfo) {
            showUserProfileModal(portfolio.ownerInfo);
            return;
          }
          
          // Если нет сохраненных данных, пытаемся запросить через API
          if (portfolio.ownerId) {
            const userResult = await getUserByIdAPI(portfolio.ownerId);
            if (!userResult.error && userResult.user) {
              showUserProfileModal(userResult.user);
              return;
            }
          }
          
          // В крайнем случае, пытаемся использовать API для поиска по email
          const ownerEmail = portfolio.owner;
          if (ownerEmail) {
            const response = await fetch(`${API_URL}/user-by-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: ownerEmail }),
            });
            
            if (response.ok) {
              const userData = await response.json();
              if (!userData.error && userData.user) {
                showUserProfileModal(userData.user);
                return;
              }
            }
          }
          
          // Если все попытки не удались, показываем упрощенную информацию
          const fallbackUserData = {
            // Используем сохраненное имя, если оно есть, иначе берем из текущего пользователя
            // или в последнюю очередь из email
            name: portfolio.ownerName || 
                  (currentUser && currentUser.email === portfolio.owner ? currentUser.name : 
                  (portfolio.owner ? portfolio.owner.split('@')[0] : "Автор анкеты")),
            photo: portfolio.photo || null,
            // Добавляем информацию, если это текущий пользователь
            ...(currentUser && currentUser.email === portfolio.owner ? {
              age: currentUser.age,
              location: currentUser.location,
              experience: currentUser.experience,
              education: currentUser.education,
              phone: currentUser.phone
            } : {})
          };
          showUserProfileModal(fallbackUserData);
        } catch (error) {
          console.error("Ошибка при загрузке профиля:", error);
          // Показываем минимальную информацию в случае ошибки
          const minimalUserData = {
            // Также используем сохраненное имя владельца, если оно есть
            name: portfolio.ownerName || 
                  (portfolio.owner ? portfolio.owner.split('@')[0] : "Автор анкеты"),
            photo: portfolio.photo || null
          };
          showUserProfileModal(minimalUserData);
        }
      });
      portfolioCard.appendChild(viewProfileBtn);

      // Кнопка избранного (если анкета не моя)
      if (
        currentUser &&
        String(currentUser.id) !== String(portfolio.ownerId) // чужая анкета
      ) {
        const userFavs = currentUser.favorites || [];
        const isFav = userFavs.includes(String(portfolio.id));
        const favBtn = document.createElement("button");
        favBtn.className = "secondary";
        favBtn.textContent = isFav ? "Убрать из избранного" : "В избранное";
        favBtn.style.marginRight = "10px";
        favBtn.addEventListener("click", async () => {
          const toggleRes = await toggleFavoriteAPI(currentUser.id, String(portfolio.id));
          if (toggleRes.error) {
            showToast(toggleRes.error, "error");
          } else {
            setCurrentUser(toggleRes.user);
            showToast("Избранное изменено!");
            filterAndRenderPortfolios();
          }
        });
        portfolioCard.appendChild(favBtn);
      }

      // Кнопка "Удалить" (только если это моя анкета)
      if (currentUser && currentUser.email === portfolio.owner) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete";
        deleteBtn.textContent = "Удалить";
        deleteBtn.addEventListener("click", async () => {
          if (confirm("Вы действительно хотите удалить эту анкету?")) {
            const result = await deletePortfolioAPI(portfolio.id);
            if (result.error) {
              showToast(result.error, "error");
            } else {
              showToast("Анкета удалена!");
              filterAndRenderPortfolios();
            }
          }
        });
        portfolioCard.appendChild(deleteBtn);
      }

      portfolioList.appendChild(portfolioCard);
    });
  }

  // ---------------------------------------------
  // ПОКАЗ ЧУЖОГО ПРОФИЛЯ
  // ---------------------------------------------
  function showUserProfileModal(userData) {
    const modalViewUser = document.getElementById("modal-view-user");
    if (!modalViewUser) return;
    const contentDiv = modalViewUser.querySelector(".modal-content-inner");
    
    // Обеспечиваем наличие минимальных полей даже если они не предоставлены
    userData = userData || {};
    
    contentDiv.innerHTML = `
      <h2>Профиль пользователя</h2>
      <div class="photo-container">
        ${userData.photo ? `<img src="${userData.photo}" alt="Фото"/>` : ""}
      </div>
      <p><strong>Имя:</strong> ${userData.name || "Нет данных"}</p>
      <p><strong>Возраст:</strong> ${userData.age || "Нет данных"}</p>
      <p><strong>Место проживания:</strong> ${userData.location || "Нет данных"}</p>
      <p><strong>Стаж работы:</strong> ${userData.experience || "Нет данных"}</p>
      <p><strong>Образование:</strong> ${userData.education || "Нет данных"}</p>
      <p><strong>Телефон:</strong> ${userData.phone || "Нет данных"}</p>
    `;
    openModal("modal-view-user");
  }

  // ---------------------------------------------
  // ЭЛЕМЕНТЫ ДЛЯ ФИЛЬТРА
  // ---------------------------------------------
  const searchInput = document.getElementById("search-input");
  const applyFilterBtn = document.getElementById("apply-filter-btn");
  const filterToggle = document.getElementById("filter-toggle");
  const filterOptions = document.getElementById("filter-options");
  const searchSection = document.querySelector(".search-section");

  // Показ/скрытие блока с опциями фильтра
  filterToggle.addEventListener("click", () => {
    const isHidden = filterOptions.style.display === "none";
    filterOptions.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      searchSection.classList.add("expanded");
    } else {
      searchSection.classList.remove("expanded");
    }
  });

  // При загрузке — сразу фильтруем и выводим
  filterAndRenderPortfolios();

  // Поиск (при вводе)
  searchInput.addEventListener("input", () => {
    filterAndRenderPortfolios();
  });

  // Кнопка "Применить фильтр"
  applyFilterBtn.addEventListener("click", () => {
    filterAndRenderPortfolios();
  });

  // ---------------------------------------------
  // РЕГИСТРАЦИЯ (Шаг 1)
  // ---------------------------------------------
  const regForm = document.getElementById("registration-form");
  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(regForm)) return;

      // Проверка совпадения паролей
      const password = regForm.querySelector('input[name="password"]').value;
      const confirmPassword = regForm.querySelector('input[name="confirm_password"]').value;
      const confirmPasswordError = regForm.querySelector('input[name="confirm_password"]').nextElementSibling;
      
      if (password !== confirmPassword) {
        confirmPasswordError.textContent = "Пароли не совпадают";
        return;
      } else {
        confirmPasswordError.textContent = "";
      }

      const submitBtn = regForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const formData = new FormData(regForm);
      const user = {
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      };
      const result = await registerUserAPI(user);
      if (result.error) {
        showToast(result.error, "error");
        submitBtn.disabled = false;
      } else {
        showToast("Код отправлен на почту. Подтвердите email.");
        closeModal("modal-registration");

        // Откроем форму verify
        document.getElementById("verify-form").reset();
        openModal("modal-verify");
      }
    });
  }

  // ---------------------------------------------
  // ВЕРИФИКАЦИЯ (Шаг 2)
  // ---------------------------------------------
  const verifyForm = document.getElementById("verify-form");
  if (verifyForm) {
    verifyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(verifyForm)) return;

      const submitBtn = verifyForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const formData = new FormData(verifyForm);
      const email = formData.get("email");
      const code = formData.get("code");

      const result = await verifyEmailAPI(email, code);
      if (result.error) {
        showToast(result.error, "error");
        submitBtn.disabled = false;
      } else {
        showToast("Email подтверждён! Теперь можете войти.");
        closeModal("modal-verify");
      }
    });
  }

  // ---------------------------------------------
  // ВХОД
  // ---------------------------------------------
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    // Добавим ссылку для восстановления пароля
    const passwordField = loginForm.querySelector('input[name="password"]');
    if (passwordField && !document.getElementById("forgot-password-link")) {
      const forgotLink = document.createElement("a");
      forgotLink.id = "forgot-password-link";
      forgotLink.href = "#";
      forgotLink.textContent = "Забыли пароль?";
      forgotLink.style.fontSize = "12px";
      forgotLink.style.marginLeft = "10px";
      forgotLink.style.cursor = "pointer";
      
      forgotLink.addEventListener("click", (e) => {
        e.preventDefault();
        closeModal("modal-login");
        openModal("modal-password-reset");
      });
      
      passwordField.parentNode.appendChild(forgotLink);
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(loginForm)) return;

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const formData = new FormData(loginForm);
      const email = formData.get("email");
      const password = formData.get("password");
      const result = await loginUserAPI(email, password);
      if (result.error) {
        showToast(result.error, "error");
        submitBtn.disabled = false;
      } else {
        setCurrentUser(result.user);
        showToast("Вход успешен!");
        closeModal("modal-login");
        updateCurrentUserName();
        filterAndRenderPortfolios();
      }
    });
  }

  // ---------------------------------------------
  // ПРОСМОТР СОБСТВЕННОГО ПРОФИЛЯ
  // ---------------------------------------------
  const profileBtn = document.getElementById("profile-btn");
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      const user = getCurrentUser();
      if (!user) {
        showToast("Сначала войдите в систему.");
        return;
      }
      const profileInfo = document.getElementById("profile-info");
      profileInfo.innerHTML = `
        <div class="photo-container">
          ${user.photo ? `<img src="${user.photo}" alt="Фото" />` : ""}
        </div>
        <p><strong>Имя:</strong> ${user.name}</p>
        <p><strong>Возраст:</strong> ${user.age || ""}</p>
        <p><strong>Место проживания:</strong> ${user.location || ""}</p>
        <p><strong>Стаж работы:</strong> ${user.experience || ""}</p>
        <p><strong>Образование:</strong> ${user.education || ""}</p>
        <p><strong>Телефон:</strong> ${user.phone || ""}</p>
      `;
      openModal("modal-profile");
    });
  }

  // ---------------------------------------------
  // РЕДАКТИРОВАНИЕ ПРОФИЛЯ
  // ---------------------------------------------
  const editProfileBtn = document.getElementById("edit-profile-btn");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      const user = getCurrentUser();
      if (!user) {
        showToast("Сначала войдите в систему.");
        return;
      }
      const editForm = document.getElementById("edit-profile-form");
      editForm.name.value = user.name || "";
      editForm.age.value = user.age || "";
      editForm.location.value = user.location || "";
      editForm.experience.value = user.experience || "";
      editForm.education.value = user.education || "";
      editForm.phone.value = user.phone || "";
      openModal("modal-edit-profile");
    });
  }

  const editProfileForm = document.getElementById("edit-profile-form");
  if (editProfileForm) {
    editProfileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(editProfileForm)) return;

      const submitBtn = editProfileForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const user = getCurrentUser();
      if (!user) {
        showToast("Сначала войдите в систему.");
        submitBtn.disabled = false;
        return;
      }
      const formData = new FormData(editProfileForm);
      const updatedData = {
        name: formData.get("name"),
        age: formData.get("age"),
        location: formData.get("location"),
        experience: formData.get("experience"),
        education: formData.get("education"),
        phone: formData.get("phone"),
      };

      const photoFile = formData.get("photo");
      if (photoFile && photoFile.size > 0) {
        if (photoFile.size > 2 * 1024 * 1024) {
          showToast("Максимальный размер фото — 2 МБ", "error");
          submitBtn.disabled = false;
          return;
        }
        const reader = new FileReader();
        reader.onload = async (event) => {
          updatedData.photo = event.target.result;
          const res = await updateUserProfile(user.id, updatedData);
          if (res.error) {
            showToast(res.error, "error");
            submitBtn.disabled = false;
          } else {
            setCurrentUser(res.user);
            showToast("Профиль обновлён!");
            closeModal("modal-edit-profile");
            updateCurrentUserName();
            filterAndRenderPortfolios();
          }
        };
        reader.readAsDataURL(photoFile);
      } else {
        // Без изменения фото
        const res = await updateUserProfile(user.id, updatedData);
        if (res.error) {
          showToast(res.error, "error");
          submitBtn.disabled = false;
        } else {
          setCurrentUser(res.user);
          showToast("Профиль обновлён!");
          closeModal("modal-edit-profile");
          updateCurrentUserName();
          filterAndRenderPortfolios();
        }
      }
    });
  }

  // ---------------------------------------------
  // СОЗДАНИЕ НОВОЙ АНКЕТЫ
  // ---------------------------------------------
  const createProfileBtn = document.getElementById("create-profile-btn");
  if (createProfileBtn) {
    createProfileBtn.addEventListener("click", () => {
      const user = getCurrentUser();
      if (!user) {
        showToast("Сначала войдите, чтобы создать анкету.");
        openModal("modal-login");
        return;
      }
      const createForm = document.getElementById("create-profile-form");
      createForm.reset();
      openModal("modal-create-profile");
    });
  }

  const createProfileForm = document.getElementById("create-profile-form");
  if (createProfileForm) {
    createProfileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(createProfileForm)) return;

      const submitBtn = document.getElementById("save-create-btn");
      submitBtn.disabled = true;

      const user = getCurrentUser();
      if (!user) {
        showToast("Сначала войдите в систему.");
        submitBtn.disabled = false;
        return;
      }
      const formData = new FormData(createProfileForm);
      const portfolioData = {
        fullname: formData.get("fullname"),
        description: formData.get("description"),
        skills: formData.get("skills")
          ? formData
              .get("skills")
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter((s) => s)
          : [],
        owner: user.email,
        ownerId: user.id,
      };

      const photoFile = formData.get("photo");
      if (photoFile && photoFile.size > 0) {
        if (photoFile.size > 2 * 1024 * 1024) {
          showToast("Максимальный размер фото — 2 МБ", "error");
          submitBtn.disabled = false;
          return;
        }
        const reader = new FileReader();
        reader.onload = async (event) => {
          portfolioData.photo = event.target.result;
          const res = await createPortfolioAPI(portfolioData);
          if (res.error) {
            showToast(res.error, "error");
            submitBtn.disabled = false;
          } else {
            showToast("Анкета создана!");
            closeModal("modal-create-profile");
            filterAndRenderPortfolios();
          }
        };
        reader.readAsDataURL(photoFile);
      } else {
        // без фото
        const res = await createPortfolioAPI(portfolioData);
        if (res.error) {
          showToast(res.error, "error");
          submitBtn.disabled = false;
        } else {
          showToast("Анкета создана!");
          closeModal("modal-create-profile");
          filterAndRenderPortfolios();
        }
      }
    });
  }

  // ---------------------------------------------
  // ВЫХОД
  // ---------------------------------------------
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearCurrentUser();
      showToast("Вы вышли из системы.");
      updateCurrentUserName();
      closeModal("modal-profile");
      filterAndRenderPortfolios();
    });
  }

  // ---------------------------------------------
  // НОВОСТИ
  // ---------------------------------------------
  const newsBtn = document.getElementById("news-btn");
  if (newsBtn) {
    newsBtn.addEventListener("click", () => {
      openModal("modal-news");
    });
  }

  // ---------------------------------------------
  // ЗАКРЫТИЕ МОДАЛОК
  // ---------------------------------------------
  document.querySelectorAll(".close").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-modal");
      closeModal(modalId);
    });
  });

  window.addEventListener("click", (event) => {
    document.querySelectorAll(".modal").forEach((modal) => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  // ---------------------------------------------
  // СОЦИАЛЬНЫЕ КНОПКИ
  // ---------------------------------------------
  // Telegram button
  const tgButton = document.querySelector('.social-btn.tg');
  if (tgButton) {
    tgButton.addEventListener('click', function() {
      window.open('https://t.me/onlineportfoliofeedback_bot', '_blank');
    });
  }
  
  // Email button
  const emailButton = document.querySelector('.social-btn.email');
  if (emailButton) {
    emailButton.addEventListener('click', function() {
      // Создаем элемент для модального окна с email
      const emailPopup = document.createElement('div');
      emailPopup.className = 'email-popup';
      emailPopup.innerHTML = `
        <div class="email-popup-content">
          <h3>Наш электронный адрес:</h3>
          <p class="email-address">onlineportfolio42@gmail.com</p>
          <div class="popup-buttons">
            <button id="copy-email-btn">Копировать</button>
            <button id="open-mail-btn">Открыть почтовый клиент</button>
            <button id="close-popup-btn">Закрыть</button>
          </div>
        </div>
      `;
      
      // Добавляем стили для попапа
      const style = document.createElement('style');
      style.textContent = `
        .email-popup {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .email-popup-content {
          background-color: #222;
          color: white;
          padding: 20px;
          border-radius: 5px;
          text-align: center;
          max-width: 90%;
          width: 400px;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        }
        .email-address {
          font-size: 18px;
          font-weight: bold;
          margin: 15px 0;
          padding: 10px;
          background-color: #333;
          color: #fff;
          border-radius: 3px;
        }
        .popup-buttons {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 15px;
        }
        .popup-buttons button {
          padding: 8px 12px;
          cursor: pointer;
        }
        #copy-email-btn {
          background-color: #4caf50;
          color: white;
          border: none;
        }
        #open-mail-btn {
          background-color: #2196f3;
          color: white;
          border: none;
        }
        #close-popup-btn {
          background-color: #f44336;
          color: white;
          border: none;
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(emailPopup);
      
      // Копирование email в буфер обмена
      document.getElementById('copy-email-btn').addEventListener('click', function() {
        const emailText = 'onlineportfolio42@gmail.com';
        navigator.clipboard.writeText(emailText)
          .then(() => {
            showToast('Email скопирован в буфер обмена!', 'success');
          })
          .catch(err => {
            showToast('Не удалось скопировать email', 'error');
            console.error('Ошибка копирования: ', err);
          });
      });
      
      // Открытие почтового клиента
      document.getElementById('open-mail-btn').addEventListener('click', function() {
        window.location.href = 'mailto:onlineportfolio42@gmail.com';
        closeEmailPopup();
      });
      
      // Закрытие попапа
      document.getElementById('close-popup-btn').addEventListener('click', closeEmailPopup);
      
      // Закрытие при клике вне попапа
      emailPopup.addEventListener('click', function(e) {
        if (e.target === emailPopup) {
          closeEmailPopup();
        }
      });
      
      // Функция закрытия попапа
      function closeEmailPopup() {
        emailPopup.remove();
      }
    });
  }

  // Добавим модальные окна для восстановления пароля в HTML
  const modalContainer = document.querySelector('body');
  
  // Проверим, существуют ли уже эти модальные окна
  if (!document.getElementById("modal-password-reset")) {
    const resetRequestModal = document.createElement("div");
    resetRequestModal.className = "modal";
    resetRequestModal.id = "modal-password-reset";
    resetRequestModal.innerHTML = `
      <div class="modal-content">
        <span class="close" data-modal="modal-password-reset">&times;</span>
        <div class="modal-content-inner">
          <h2>Восстановление пароля</h2>
          <form id="reset-request-form">
            <div class="form-group">
              <label for="email">Email:</label>
              <input type="email" name="email" required>
              <span class="error"></span>
            </div>
            <div class="form-group">
              <button type="submit">Отправить код восстановления</button>
            </div>
          </form>
        </div>
      </div>
    `;
    modalContainer.appendChild(resetRequestModal);
  }
  
  if (!document.getElementById("modal-password-reset-confirm")) {
    const resetConfirmModal = document.createElement("div");
    resetConfirmModal.className = "modal";
    resetConfirmModal.id = "modal-password-reset-confirm";
    resetConfirmModal.innerHTML = `
      <div class="modal-content">
        <span class="close" data-modal="modal-password-reset-confirm">&times;</span>
        <div class="modal-content-inner">
          <h2>Введите код и новый пароль</h2>
          <form id="reset-confirm-form">
            <div class="form-group">
              <label for="email">Email:</label>
              <input type="email" name="email" required readonly>
              <span class="error"></span>
            </div>
            <div class="form-group">
              <label for="code">Код из письма:</label>
              <input type="text" name="code" required>
              <span class="error"></span>
            </div>
            <div class="form-group">
              <label for="new_password">Новый пароль:</label>
              <input type="password" name="new_password" required>
              <span class="error"></span>
            </div>
            <div class="form-group">
              <label for="confirm_password">Подтвердите пароль:</label>
              <input type="password" name="confirm_password" required>
              <span class="error"></span>
            </div>
            <div class="form-group">
              <button type="submit">Сменить пароль</button>
            </div>
          </form>
        </div>
      </div>
    `;
    modalContainer.appendChild(resetConfirmModal);
  }

  // Обработчики форм восстановления пароля
  // Шаг 1: Запрос сброса пароля
  const resetRequestForm = document.getElementById("reset-request-form");
  if (resetRequestForm) {
    resetRequestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(resetRequestForm)) return;

      const submitBtn = resetRequestForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const email = resetRequestForm.querySelector('input[name="email"]').value;
      const result = await requestPasswordResetAPI(email);
      
      if (result.error) {
        showToast(result.error, "error");
        submitBtn.disabled = false;
      } else {
        showToast("Код для сброса пароля отправлен на вашу почту", "success");
        closeModal("modal-password-reset");
        openModal("modal-password-reset-confirm");
        
        // Предзаполним поле email на следующем шаге
        const confirmForm = document.getElementById("reset-confirm-form");
        if (confirmForm) {
          confirmForm.querySelector('input[name="email"]').value = email;
        }
      }
    });
  }

  // Шаг 2: Подтверждение сброса пароля и установка нового
  const resetConfirmForm = document.getElementById("reset-confirm-form");
  if (resetConfirmForm) {
    resetConfirmForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(resetConfirmForm)) return;

      const submitBtn = resetConfirmForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const email = resetConfirmForm.querySelector('input[name="email"]').value;
      const code = resetConfirmForm.querySelector('input[name="code"]').value;
      const newPassword = resetConfirmForm.querySelector('input[name="new_password"]').value;
      const confirmPassword = resetConfirmForm.querySelector('input[name="confirm_password"]').value;
      
      // Проверка совпадения паролей
      if (newPassword !== confirmPassword) {
        resetConfirmForm.querySelector('input[name="confirm_password"]').nextElementSibling.textContent = 
          "Пароли не совпадают";
        submitBtn.disabled = false;
        return;
      }
      
      const result = await resetPasswordAPI(email, code, newPassword);
      
      if (result.error) {
        showToast(result.error, "error");
        submitBtn.disabled = false;
      } else {
        showToast("Пароль успешно изменен! Теперь вы можете войти.", "success");
        closeModal("modal-password-reset-confirm");
        openModal("modal-login");
      }
    });
  }
});
