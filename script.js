document.addEventListener("DOMContentLoaded", () => {
  // Вспомогательные функции
  function showToast(message, type = "info") {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode === toastContainer) {
        toastContainer.removeChild(toast);
      }
    }, 4000);
  }

  function validateForm(form) {
    let valid = true;
    form.querySelectorAll("input[required], textarea[required]").forEach((input) => {
      // Следующий братский элемент — это span.error-message
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
      document.getElementById("auth-buttons").style.display = "none";
    } else {
      userSpan.textContent = "";
      document.getElementById("profile-btn").style.display = "none";
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

  // Подключение к серверу
  const API_URL = "http://localhost:3000/api";

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
      const res = await fetch(`${API_URL}/portfolios`);
      return await res.json();
    } catch (err) {
      console.error("Ошибка загрузки анкет:", err);
      return { error: "Ошибка связи с сервером" };
    }
  }

  // Отрисовка списка анкет
  function renderPortfolios(portfolios) {
    const portfolioList = document.getElementById("portfolio-list");
    portfolioList.innerHTML = "";
    portfolios.forEach((portfolio) => {
      const portfolioCard = document.createElement("div");
      portfolioCard.className = "portfolio-card";
      portfolioCard.innerHTML = `
        <h3>${portfolio.fullname}</h3>
        <p>${portfolio.description}</p>
        <p>Навыки: ${portfolio.skills.join(", ")}</p>
        ${
          portfolio.photo
            ? `<img src="${portfolio.photo}" alt="Фото" style="margin-top:10px; max-width:100%;"/>`
            : ""
        }
        <p class="creation-date">
          Создано: ${new Date(portfolio.createdAt).toLocaleString("ru-RU")}
        </p>
        ${
          portfolio.favorite
            ? `<p style="color:tomato; font-weight:bold;">Избранное</p>`
            : ""
        }
      `;
      portfolioList.appendChild(portfolioCard);
    });
  }

  // Загрузка и отображение анкет
  async function loadPortfolios() {
    const result = await getPortfoliosAPI();
    if (result.error) {
      showToast(result.error, "error");
    } else {
      renderPortfolios(result.portfolios);
    }
  }
  loadPortfolios();

  // Фильтр по вводу (поиск)
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", async () => {
    const query = searchInput.value.trim().toLowerCase();
    const result = await getPortfoliosAPI();
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    const filteredPortfolios = result.portfolios.filter((portfolio) =>
      portfolio.fullname.toLowerCase().includes(query)
    );
    renderPortfolios(filteredPortfolios);
  });

  // Отображение фильтров
  const filterToggle = document.getElementById("filter-toggle");
  const filterOptions = document.getElementById("filter-options");
  filterToggle.addEventListener("click", () => {
    filterOptions.style.display =
      filterOptions.style.display === "none" ? "block" : "none";
  });

  // Применение фильтра
  const applyFilterBtn = document.getElementById("apply-filter-btn");
  applyFilterBtn.addEventListener("click", async () => {
    const skills = Array.from(
      document.querySelectorAll('input[name="skill"]:checked')
    ).map((checkbox) => checkbox.value);

    const isFavoriteOnly = document.getElementById("filter-favorite").checked;
    const dateFrom = document.getElementById("date-from").value;
    const dateTo = document.getElementById("date-to").value;
    const sortBy = document.getElementById("sort-select").value;

    const result = await getPortfoliosAPI();
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    let filteredPortfolios = result.portfolios;

    // Фильтр по навыкам
    if (skills.length > 0) {
      filteredPortfolios = filteredPortfolios.filter((portfolio) =>
        skills.every((skill) => portfolio.skills.includes(skill))
      );
    }
    // Только избранные
    if (isFavoriteOnly) {
      filteredPortfolios = filteredPortfolios.filter((p) => p.favorite);
    }
    // Фильтр по дате
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filteredPortfolios = filteredPortfolios.filter(
        (p) => new Date(p.createdAt) >= fromDate
      );
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      // чтобы включить день "dateTo", берём конец текущих суток
      toDate.setHours(23, 59, 59, 999);
      filteredPortfolios = filteredPortfolios.filter(
        (p) => new Date(p.createdAt) <= toDate
      );
    }

    // Сортировка
    switch (sortBy) {
      case "date_desc":
        filteredPortfolios.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "date_asc":
        filteredPortfolios.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "alpha_asc":
        filteredPortfolios.sort((a, b) => a.fullname.localeCompare(b.fullname));
        break;
      case "alpha_desc":
        filteredPortfolios.sort((a, b) => b.fullname.localeCompare(a.fullname));
        break;
    }
    renderPortfolios(filteredPortfolios);
  });

  // Регистрация
  const regForm = document.getElementById("registration-form");
  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(regForm)) return;
      const formData = new FormData(regForm);
      const user = {
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      };
      const result = await registerUserAPI(user);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast("Регистрация успешна!");
        closeModal("modal-registration");
      }
    });
  }

  // Вход
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(loginForm)) return;
      const formData = new FormData(loginForm);
      const email = formData.get("email");
      const password = formData.get("password");
      const result = await loginUserAPI(email, password);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        setCurrentUser(result.user);
        showToast("Вход успешен!");
        closeModal("modal-login");
        updateCurrentUserName();
      }
    });
  }

  // Кнопка "Профиль" — показать текущий профиль
  const profileBtn = document.getElementById("profile-btn");
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      const user = getCurrentUser();
      if (!user) {
        showToast("Сначала войдите в систему.");
        return;
      }
      const profileInfo = document.getElementById("profile-info");
      // Заполним блок информацией о пользователе
      profileInfo.innerHTML = `
        <div class="photo-container">
          ${user.photo ? `<img src="${user.photo}" alt="Фото" />` : ""}
        </div>
        <p><strong>Имя:</strong> ${user.name}</p>
        <p><strong>Возраст:</strong> ${user.age || ""}</p>
        <p><strong>Место проживания:</strong> ${user.location || ""}</p>
        <p><strong>Стаж работы:</strong> ${user.experience || ""}</p>
        <p><strong>Образование:</strong> ${user.education || ""}</p>
      `;
      openModal("modal-profile");
    });
  }

  // Кнопка "Редактировать профиль"
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
      openModal("modal-edit-profile");
    });
  }

  // Сохранение изменений профиля
  const editProfileForm = document.getElementById("edit-profile-form");
  if (editProfileForm) {
    editProfileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(editProfileForm)) return;
      const user = getCurrentUser();
      if (!user) {
        showToast("Сначала войдите в систему.");
        return;
      }
      const formData = new FormData(editProfileForm);
      const updatedData = {
        name: formData.get("name"),
        age: formData.get("age"),
        location: formData.get("location"),
        experience: formData.get("experience"),
        education: formData.get("education"),
      };
      const photoFile = formData.get("photo");
      if (photoFile && photoFile.size > 0) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          updatedData.photo = event.target.result;
          const res = await updateUserProfile(user.id, updatedData);
          if (res.error) {
            showToast(res.error, "error");
          } else {
            setCurrentUser(res.user);
            showToast("Профиль обновлён!");
            closeModal("modal-edit-profile");
            updateCurrentUserName();
          }
        };
        reader.readAsDataURL(photoFile);
      } else {
        // Без изменения фото
        const res = await updateUserProfile(user.id, updatedData);
        if (res.error) {
          showToast(res.error, "error");
        } else {
          setCurrentUser(res.user);
          showToast("Профиль обновлён!");
          closeModal("modal-edit-profile");
          updateCurrentUserName();
        }
      }
    });
  }

  // Кнопка "Создать анкету"
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

  // Сохранение новой анкеты
  const createProfileForm = document.getElementById("create-profile-form");
  if (createProfileForm) {
    createProfileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(createProfileForm)) return;
      const user = getCurrentUser();
      if (!user) {
        showToast("Сначала войдите в систему.");
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
      };
      const photoFile = formData.get("photo");
      if (photoFile && photoFile.size > 0) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          portfolioData.photo = event.target.result;
          const res = await createPortfolioAPI(portfolioData);
          if (res.error) {
            showToast(res.error, "error");
          } else {
            showToast("Анкета создана!");
            closeModal("modal-create-profile");
            loadPortfolios();
          }
        };
        reader.readAsDataURL(photoFile);
      } else {
        // без фото
        const res = await createPortfolioAPI(portfolioData);
        if (res.error) {
          showToast(res.error, "error");
        } else {
          showToast("Анкета создана!");
          closeModal("modal-create-profile");
          loadPortfolios();
        }
      }
    });
  }

  // Кнопка "Выход" (в профиле)
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearCurrentUser();
      showToast("Вы вышли из системы.");
      updateCurrentUserName();
      closeModal("modal-profile");
    });
  }

  // Кнопка "Новости"
  const newsBtn = document.getElementById("news-btn");
  if (newsBtn) {
    newsBtn.addEventListener("click", () => {
      openModal("modal-news");
    });
  }

  // Закрытие модалок (крестики)
  document.querySelectorAll(".close").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-modal");
      closeModal(modalId);
    });
  });

  // Закрытие модалки по клику вне её
  window.addEventListener("click", (event) => {
    document.querySelectorAll(".modal").forEach((modal) => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });
});
