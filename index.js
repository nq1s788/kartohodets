const API_BASE_URL = "http://localhost:8000";
const CLIENT_ID = "794548858892-t83a74dfs01bcftf54q1ng82gt9738tj.apps.googleusercontent.com";

// Состояние приложения
const appState = JSON.parse(localStorage.getItem('appState'))
    || {
    token: null,
    user: null,
    currentLobby: null,
    isHost: false,
    games: 1,
    score: 0,
};
console.log(appState);

// Инициализация при загрузке страницы
window.onload = () => {

    checkLocalStorage();
    setupEventListeners();
    const uiState = localStorage.getItem('uiState'); // запмнинаем экран с которого уходили чтоб вернуться при переадресации туда же
    if (uiState) {
        showScreen(uiState);
        localStorage.removeItem('uiState');
    }
};
window.addEventListener('load', () => {
    const fade = document.getElementById('fade');
    setTimeout(() => fade.classList.remove('active'), 50);
});


function smoothRedirect(url) {
    const fade = document.getElementById('fade');
    fade.classList.add('active');

    setTimeout(() => {
        window.location.href = url;
    }, 600);
}


// --- Логика Аутентификации --- хз.. думайте

function checkLocalStorage() {
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
        initGoogleLogin();
        showScreen('login-screen');
        //что-то надо сделать с кнопкой гугла иногда она не рендерится
        //initGoogleLogin();
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
    console.log('logout', localStorage)
    showScreen('login-screen');
}

// --- Логика Лидерборда ---

async function loadLeaderboard() {
    // Запрос: GET /api/leaderboard
    // Ожидаемый ответ: { user_stats: {...}, top_10: [...] }

    // Эмуляция данных
    const mockData = {
        user: { rank: 8, score: 1869.23, accuracy: 63, games: 17 },
        top: [
            { name: "qq2345", score: 3524.19 },
            { name: "smellydog356", score: 3318.83 },
            { name: "mclovin", score: 3192.58 },
            { name: "kristiana_F", score: 2523.67 },
            { name: "ivan_gamaz", score: 2473.49 },
            { name: "ribka_pickmi", score: 1912.34 },
            { name: "sadkun666", score: 1882.47 },
            { name: "azalkinmmm", score: 1869.23 },
            { name: "anna_mrkv", score: 1742.13 },
            { name: "sweetevelyn", score: 1612.96 },
        ]
    };

    // Заполнение UI
    document.getElementById('stat-rank').innerText = mockData.user.rank;
    document.getElementById('stat-score').innerText = mockData.user.score;
    document.getElementById('stat-accuracy').innerText = mockData.user.accuracy + '%';
    document.getElementById('stat-games').innerText = mockData.user.games;

    const body = document.getElementById('leaderboard-body');
    body.innerHTML = '';

    mockData.top.forEach((p, i) => {
        body.innerHTML += `
    <div class="row ${p.name === 'ozalkinmmm' ? 'me' : ''}">
      <div>${i + 1}. ${p.name}</div>
      <div class="score">${p.score.toFixed(2)}</div>
    </div>
  `;
    });

}

// --- Логика Мультиплеера (Лобби) ---


function handleLobbyInput() {
    const inputs = [...document.querySelectorAll('.otp-input')];
    const btn = document.getElementById('btn-enter-lobby');

    btn.disabled = inputs.some(x => !(x.value && x.value > 0 && x.value < 10));
}

async function joinLobby() {
    const input = document.querySelectorAll('.otp-input');
    let code = ''
    input.forEach(x => {
        code += x.value;
    });
    console.log(code)

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
    localStorage.setItem('appState', JSON.stringify(appState));
    smoothRedirect('lobby.html');
    //window.location.href = 'lobby.html';
}

// --- Утилиты UI ---

function showScreen(screenId) {
    console.log('showScreen', screenId)

    const screens = ['loading-screen', 'login-screen', 'menu-screen', 'room-enter-screen'];
    screens.forEach(id => document.getElementById(id).style.display = 'none');

    document.getElementById(screenId).style.display = 'flex';
}

function setupEventListeners() {
    document.getElementById("google-btn").addEventListener('click', () => {
        appState.user = 'player';
        const serverToken = "mock_server_token_" + Date.now();
        localStorage.setItem('kartohodets_token', serverToken);
        appState.token = serverToken;
        showScreen('menu-screen');
    })

    // Кнопки меню
    document.getElementById('btn-solo').addEventListener('click', () => {
        window.location.href = 'game.html'; // Переход на соло игру
    });

    document.getElementById('btn-multi').addEventListener('click', () => {
        showScreen('room-enter-screen');
    });

    document.getElementById('btn-leaderboard').addEventListener('click', () => {
        //showScreen('leaderboard-screen');
        document.getElementById('leaderboard-screen').style.visibility = 'visible'
        document.getElementById('leaderboard-screen').style.opacity = 1;


        loadLeaderboard();
    });

    document.getElementById('btn-logout').addEventListener('click', logout);

    // Кнопки внутри экранов
    document.getElementById('btn-back-menu-lb').addEventListener('click', () => {
        //showScreen('menu-screen');
        document.getElementById('leaderboard-screen').style.visibility = 'hidden'
        document.getElementById('leaderboard-screen').style.opacity = 0;
    });
    document.getElementById('btn-back-menu-room').addEventListener('click', () => showScreen('menu-screen'));

    // Лобби
    document.getElementById('btn-enter-lobby').addEventListener('click', joinLobby);
    document.getElementById('btn-create-lobby').addEventListener('click', createLobby);

    // инпут id комнаты
    const inputs = document.querySelectorAll('.otp-input');
    console.log(inputs.length)

    function focusEnd(input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
    }

    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            input.value = input.value.replace(/\D/g, '').slice(-1);
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!', input.value)
            if (e.target.value.length === 1 && index < inputs.length - 1) {
                focusEnd(inputs[index + 1]);
            }
            handleLobbyInput()
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value.length === 0 && index > 0) {
                focusEnd(inputs[index - 1]);
            }
            if (e.key === 'ArrowLeft' && index > 0) {
                e.preventDefault();
                focusEnd(inputs[index - 1]);
            }

            if (e.key === 'ArrowRight' && index < inputs.length - 1) {
                e.preventDefault();
                focusEnd(inputs[index + 1]);
            }
        });
    });
}