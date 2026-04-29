const STORAGE_KEY = "kutibxona_queue_v1";
const THEME_KEY = "kutibxona_theme_v1";
const USER_TICKET_KEY = "kutibxona_user_ticket";
const ADMIN_AUTH_KEY = "kutibxona_admin_auth";

const STATUS = {
  WAITING: "Kutmoqda",
  ACTIVE: "Kirildi",
  DONE: "Tugadi",
};

function loadQueue() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

function getNextNumber(queue) {
  if (!queue.length) return 1;
  return Math.max(...queue.map((item) => item.number)) + 1;
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2400);
}

function getStatusClass(status) {
  if (status === STATUS.ACTIVE) return "status-active";
  if (status === STATUS.DONE) return "status-done";
  return "status-waiting";
}

function applyTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  document.body.classList.toggle("theme-dark", savedTheme === "dark");
  document.body.classList.toggle("theme-light", savedTheme !== "dark");
}

function initThemeToggle() {
  applyTheme();
  const modeToggle = document.getElementById("modeToggle");
  if (!modeToggle) return;
  modeToggle.addEventListener("click", () => {
    const next = document.body.classList.contains("theme-dark") ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme();
  });
}

function playQueueSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 720;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.26);
  } catch (error) {
    /* Ovoz ixtiyoriy */
  }
}

function initLoader() {
  const loader = document.getElementById("loader");
  if (!loader) return;
  setTimeout(() => loader.classList.add("hidden"), 850);
}

function initUserPage() {
  const queueList = document.getElementById("queueList");
  if (!queueList) return;

  const queueCount = document.getElementById("queueCount");
  const myNumber = document.getElementById("myNumber");
  const myStatusBadge = document.getElementById("myStatusBadge");
  const currentClientCard = document.getElementById("currentClientCard");
  const takeQueueBtn = document.getElementById("takeQueueBtn");

  function render() {
    const queue = loadQueue();
    queueList.innerHTML = "";
    queueCount.textContent = `${queue.length} ta`;

    if (!queue.length) {
      queueList.innerHTML = `<li class="queue-item"><span>Navbat bo'sh</span></li>`;
    }

    queue.forEach((item) => {
      const li = document.createElement("li");
      li.className = "queue-item";
      li.innerHTML = `
        <strong>#${item.number} ${item.name ? `- ${item.name}` : ""}</strong>
        <span class="status-pill ${getStatusClass(item.status)}">${item.status}</span>
      `;
      queueList.appendChild(li);
    });

    const current = queue.find((item) => item.status === STATUS.ACTIVE) || queue.find((item) => item.status === STATUS.WAITING);
    if (current) {
      currentClientCard.innerHTML = `
        <p class="client-number">#${current.number}</p>
        <p class="client-status">${current.status}</p>
      `;
    } else {
      currentClientCard.innerHTML = `
        <p class="client-number">#-</p>
        <p class="client-status">Faol navbat yo'q</p>
      `;
    }

    const myTicket = Number(localStorage.getItem(USER_TICKET_KEY) || 0);
    const mine = queue.find((item) => item.number === myTicket);
    if (mine) {
      myNumber.textContent = `#${mine.number}`;
      myStatusBadge.textContent = mine.status;
      myStatusBadge.className = `status-pill ${getStatusClass(mine.status)}`;
    } else {
      myNumber.textContent = "-";
      myStatusBadge.textContent = "Kutmoqda";
      myStatusBadge.className = "status-pill status-waiting";
    }
  }

  takeQueueBtn.addEventListener("click", () => {
    const queue = loadQueue();
    const existingNumber = Number(localStorage.getItem(USER_TICKET_KEY) || 0);
    const existingTicket = queue.find((item) => item.number === existingNumber && item.status !== STATUS.DONE);
    if (existingTicket) {
      showToast(`Sizda allaqachon navbat bor: #${existingTicket.number}`, "error");
      return;
    }
    const newItem = {
      id: Date.now(),
      number: getNextNumber(queue),
      name: "",
      status: STATUS.WAITING,
      createdAt: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
    };
    queue.push(newItem);
    saveQueue(queue);
    localStorage.setItem(USER_TICKET_KEY, String(newItem.number));
    playQueueSound();
    render();
    showToast(`Sizga #${newItem.number} navbat biriktirildi`, "success");
  });

  render();
  window.addEventListener("storage", render);
}

function initAdminPage() {
  const loginSection = document.getElementById("loginSection");
  if (!loginSection) return;

  const dashboardSection = document.getElementById("dashboardSection");
  const loginForm = document.getElementById("loginForm");
  const addClientForm = document.getElementById("addClientForm");
  const clientNameInput = document.getElementById("clientNameInput");
  const adminQueueBody = document.getElementById("adminQueueBody");
  const logoutBtn = document.getElementById("logoutBtn");

  const totalCount = document.getElementById("totalCount");
  const activeCount = document.getElementById("activeCount");
  const doneCount = document.getElementById("doneCount");

  function setAuthView(authenticated) {
    loginSection.classList.toggle("hidden", authenticated);
    dashboardSection.classList.toggle("hidden", !authenticated);
  }

  function renderAdminQueue() {
    const queue = loadQueue();
    adminQueueBody.innerHTML = "";

    totalCount.textContent = String(queue.length);
    activeCount.textContent = String(queue.filter((item) => item.status === STATUS.ACTIVE).length);
    doneCount.textContent = String(queue.filter((item) => item.status === STATUS.DONE).length);

    if (!queue.length) {
      adminQueueBody.innerHTML = `
        <tr>
          <td colspan="5">Hozircha navbat yo'q</td>
        </tr>
      `;
      return;
    }

    queue.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>#${item.number}</strong></td>
        <td>${item.name || "Mijoz"}</td>
        <td><span class="status-pill ${getStatusClass(item.status)}">${item.status}</span></td>
        <td>${item.createdAt || "-"}</td>
        <td>
          <div class="table-actions">
            <select data-action="status" data-id="${item.id}">
              <option ${item.status === STATUS.WAITING ? "selected" : ""}>${STATUS.WAITING}</option>
              <option ${item.status === STATUS.ACTIVE ? "selected" : ""}>${STATUS.ACTIVE}</option>
              <option ${item.status === STATUS.DONE ? "selected" : ""}>${STATUS.DONE}</option>
            </select>
            <button class="btn danger" data-action="remove" data-id="${item.id}" type="button">O'chirish</button>
          </div>
        </td>
      `;
      adminQueueBody.appendChild(tr);
    });
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = document.getElementById("adminUser").value.trim();
    const password = document.getElementById("adminPass").value.trim();
    if (username === "admin" && password === "1234") {
      localStorage.setItem(ADMIN_AUTH_KEY, "1");
      setAuthView(true);
      renderAdminQueue();
      showToast("Admin panelga muvaffaqiyatli kirdingiz", "success");
    } else {
      showToast("Login yoki parol noto'g'ri", "error");
    }
  });

  addClientForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const queue = loadQueue();
    const newClient = {
      id: Date.now(),
      number: getNextNumber(queue),
      name: clientNameInput.value.trim(),
      status: STATUS.WAITING,
      createdAt: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
    };
    queue.push(newClient);
    saveQueue(queue);
    clientNameInput.value = "";
    renderAdminQueue();
    playQueueSound();
    showToast(`Yangi navbat qo'shildi: #${newClient.number}`, "success");
  });

  adminQueueBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.action !== "remove") return;
    const id = Number(target.dataset.id);
    const queue = loadQueue().filter((item) => item.id !== id);
    saveQueue(queue);
    renderAdminQueue();
    showToast("Navbat o'chirildi", "info");
  });

  adminQueueBody.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.dataset.action !== "status") return;
    const id = Number(target.dataset.id);
    const queue = loadQueue();
    const item = queue.find((client) => client.id === id);
    if (!item) return;
    item.status = target.value;
    saveQueue(queue);
    renderAdminQueue();
    showToast("Mijoz holati yangilandi", "info");
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    setAuthView(false);
    showToast("Tizimdan chiqdingiz", "info");
  });

  const authenticated = localStorage.getItem(ADMIN_AUTH_KEY) === "1";
  setAuthView(authenticated);
  if (authenticated) renderAdminQueue();
  window.addEventListener("storage", renderAdminQueue);
}

document.addEventListener("DOMContentLoaded", () => {
  initLoader();
  initThemeToggle();
  initUserPage();
  initAdminPage();
});
