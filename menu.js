// Константы
const API_BASE_URL = "http://localhost:8000"; // Пример адреса бэкенда
const CLIENT_ID = "794548858892-t83a74dfs01bcftf54q1ng82gt9738tj.apps.googleusercontent.com";

// Состояние приложения
const appState = {
    token: null,
    user: null,
    currentLobby: null,
    isHost: false
};

// Инициализация при загрузке страницы
window.onload = () => {
    checkLocalStorage();
    setupEventListeners();
};

// --- Логика Аутентификации ---

function checkLocalStorage() {
    // Проверяем наличие токена в локальном хранилище
    const token = localStorage.getItem('kartohodets_token');

    if (token) {
        // Здесь можно добавить валидацию токена через запрос к бэкенду
        // Запрос: GET /api/validate_token (Header: Authorization: Bearer token)
        appState.token = token;
        // Предполагаем, что токен валиден, показываем меню
        showScreen('menu-screen');
        // Загружаем данные пользователя (имя и т.д.)
        // Запрос: GET /api/user/me
    } else {
        // Токена нет, показываем логин
        //showScreen('login-screen');
        showScreen('menu-screen');
        initGoogleLogin();
    }
}

function initGoogleLogin() {
    // Инициализация кнопки Google Auth (GIS)
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleGoogleResponse
    });
    google.accounts.id.renderButton(
        document.getElementById("google-btn"),
                                    { theme: "outline", size: "large" }
    );
}

function handleGoogleResponse(response) {
    // Получаем JWT токен от Google
    const googleToken = response.credential;

    // Отправляем токен на наш бэкенд для верификации и получения сессионного токена
    // Запрос: POST /api/auth/google { token: googleToken }
    console.log("Отправка токена на бэкенд:", googleToken);

    // Эмуляция ответа от сервера
    const serverToken = "mock_server_token_" + Date.now();
    localStorage.setItem('kartohodets_token', serverToken);
    appState.token = serverToken;

    showScreen('menu-screen');
}

function logout() {
    localStorage.removeItem('kartohodets_token');
    location.reload();
}

// --- Логика Лидерборда ---

async function loadLeaderboard() {
    // Запрос: GET /api/leaderboard
    // Ожидаемый ответ: { user_stats: {...}, top_10: [...] }

    // Эмуляция данных
    const mockData = {
        user: { rank: 42, score: 1500, accuracy: "85%", games: 10 },
        top: [
            { place: 1, name: "GeoMaster", score: 5000 },
            { place: 2, name: "Mapper", score: 4800 },
            // ...
        ]
    };

    // Заполнение UI
    document.getElementById('stat-rank').innerText = mockData.user.rank;
    document.getElementById('stat-score').innerText = mockData.user.score;
    document.getElementById('stat-accuracy').innerText = mockData.user.accuracy;
    document.getElementById('stat-games').innerText = mockData.user.games;

    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';
    mockData.top.forEach(player => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${player.place}</td><td>${player.name}</td><td>${player.score}</td>`;
        tbody.appendChild(tr);
    });
}

// --- Логика Мультиплеера (Лобби) ---

function handleLobbyInput() {
    const input = document.getElementById('lobby-code-input');
    const btn = document.getElementById('btn-enter-lobby');
    // Кнопка активна только если введено 6 символов
    btn.disabled = input.value.length !== 6;
}

async function joinLobby() {
    const code = document.getElementById('lobby-code-input').value;

    // Запрос: GET /api/lobby/{code} - проверка существования
    // Если ОК:
    console.log("Вход в лобби:", code);
    appState.currentLobby = code;
    appState.isHost = false;

    renderLobbyScreen();
}

async function createLobby() {
    // Запрос: POST /api/lobby/create
    // Ожидаемый ответ: { lobby_code: "123456" }

    const newCode = Math.floor(100000 + Math.random() * 900000); // Эмуляция
    console.log("Создано лобби:", newCode);

    appState.currentLobby = newCode;
    appState.isHost = true;

    renderLobbyScreen();
}

function renderLobbyScreen() {
    showScreen('lobby-screen');
    document.getElementById('lobby-code-display').innerText = appState.currentLobby;

    const startBtn = document.getElementById('btn-start-game');
    const guestMsg = document.getElementById('guest-msg');

    if (appState.isHost) {
        startBtn.style.display = 'block';
        guestMsg.style.display = 'none';

        // Навешиваем обработчик старта игры только для хоста
        startBtn.onclick = () => {
            // Запрос: POST /api/lobby/{code}/start
            // Или отправка сообщения в сокет
            console.log("Хост запустил игру");
            // Редирект в игру (передаем ID лобби и роль)
            window.location.href = `game_mp.html?lobby=${appState.currentLobby}&host=true`;
        };
    } else {
        startBtn.style.display = 'none';
        guestMsg.style.display = 'block';

        // Гость должен слушать сокет на предмет начала игры.
        // В рамках этого файла (menu.js) мы предполагаем, что как только
        // придет сигнал "game_started", мы делаем редирект.
        // Эмуляция (так как сокеты полностью будут в game_mp.js, здесь просто заглушка):
        // window.location.href = `game_mp.html?lobby=${appState.currentLobby}`;

        // Примечание: В реальном проекте здесь уже должно быть подключение к сокету
        // для обновления списка игроков в лобби.
    }
}

// --- Утилиты UI ---

function showScreen(screenId) {
    // Скрываем все экраны верхнего уровня
    const screens = ['loading-screen', 'login-screen', 'menu-screen', 'leaderboard-screen', 'room-enter-screen', 'lobby-screen'];
    screens.forEach(id => document.getElementById(id).style.display = 'none');

    // Показываем нужный
    document.getElementById(screenId).style.display = 'block';
}

function setupEventListeners() {
    // Кнопки меню
    document.getElementById('btn-solo').addEventListener('click', () => {
        window.location.href = 'game.html'; // Переход на соло игру
    });

    document.getElementById('btn-multi').addEventListener('click', () => {
        showScreen('room-enter-screen');
    });

    document.getElementById('btn-leaderboard').addEventListener('click', () => {
        showScreen('leaderboard-screen');
        loadLeaderboard();
    });

    document.getElementById('btn-logout').addEventListener('click', logout);

    // Кнопки внутри экранов
    document.getElementById('btn-back-menu-lb').addEventListener('click', () => showScreen('menu-screen'));
    document.getElementById('btn-back-menu-room').addEventListener('click', () => showScreen('menu-screen'));

    // Лобби
    document.getElementById('lobby-code-input').addEventListener('input', handleLobbyInput);
    document.getElementById('btn-enter-lobby').addEventListener('click', joinLobby);
    document.getElementById('btn-create-lobby').addEventListener('click', createLobby);
    document.getElementById('btn-leave-lobby').addEventListener('click', () => {
        // Запрос: POST /api/lobby/leave
        appState.currentLobby = null;
        showScreen('room-enter-screen');
    });
}
