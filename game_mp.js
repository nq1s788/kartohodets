// Получаем параметры из URL
const urlParams = new URLSearchParams(window.location.search);
const lobbyId = urlParams.get('lobby');
const isHost = urlParams.get('host') === 'true';

// WebSocket соединение
let socket = null;
const WS_URL = `ws://localhost:8000/ws/${lobbyId}`; // Адрес вебсокета

const game = {
    map: null,
    streetView: null,
    userMarker: null, // Мой маркер
    ansMarker: null,  // Маркер правильного ответа
    otherMarkers: [], // Маркеры других игроков (массив)
    ansLoc: null,     // Координаты ответа
    line: null,
    myColor: null     // Мой случайный цвет (присваивается сервером)
};

// --- Инициализация карты ---
async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    document.getElementById('lobby-id').textContent = lobbyId;

    game.map = new Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        mapId: '4504f8b37365c3d0',
        disableDefaultUI: true,
        clickableIcons: false
    });

    game.streetView = new google.maps.StreetViewPanorama(
        document.getElementById("street-view"),
                                                         {
                                                             pov: { heading: 165, pitch: 0 },
                                                             zoom: 1,
                                                             showRoadLabels: false,
                                                             addressControl: false,
                                                             disableDefaultUI: true
                                                         }
    );

    // Подключаемся к сокету после инициализации карт
    connectWebSocket();
    attachUIEvents();
}

// --- WebSocket Логика ---

function connectWebSocket() {
    const token = localStorage.getItem('kartohodets_token');
    // Передаем токен при подключении (в реале может быть через subprotocols или query params)
    socket = new WebSocket(`${WS_URL}?token=${token}`);

    socket.onopen = () => {
        console.log("WS соединение установлено");
    };

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
    };

    socket.onclose = () => {
        alert("Соединение потеряно");
        window.location.href = 'index.html';
    };
}

function handleServerMessage(msg) {
    console.log("Сообщение от сервера:", msg);

    switch (msg.type) {
        case 'game_init':
            // Получаем свой цвет и начальные данные
            game.myColor = msg.color;
            setupMyMarker(msg.color);
            break;

        case 'new_round':
            // Сервер прислал координаты новой панорамы
            startRound(msg.lat, msg.lng);
            break;

        case 'timer_update':
            // Сервер шлет текущее время (15 сек отсчет)
            document.getElementById('timer').textContent = msg.seconds_left;
            if (msg.seconds_left <= 5) {
                document.getElementById('timer').style.color = 'red';
            }
            break;

        case 'round_result':
            // Раунд закончен, показываем результаты всех
            showRoundResults(msg.results, msg.correct_location);
            break;

        case 'player_count_update':
            document.getElementById('player-count').textContent = msg.count;
            break;

        case 'game_over':
            alert("Игра окончена! Победитель: " + msg.winner);
            sendPostGameResults(msg.stats); // Отправка POST запроса с результатами
            window.location.href = 'index.html';
            break;
    }
}

// --- Игровые функции ---

async function setupMyMarker(color) {
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const userPin = new google.maps.marker.PinElement({
        background: color,
        borderColor: "#fff",
        glyphColor: "#fff",
    });

    game.userMarker = new AdvancedMarkerElement({
        map: game.map,
        position: { lat: 0, lng: 0 },
        gmpDraggable: true,
        content: userPin.element,
        title: "Вы",
    });

    // При клике обновляем позицию, но пока не отправляем окончательный ответ
    game.map.addListener("click", (event) => {
        if (game.userMarker.gmpDraggable) {
            game.userMarker.position = event.latLng;
        }
    });
}

function startRound(lat, lng) {
    // Сброс UI
    resetMapForNewRound();

    // Установка панорамы
    game.ansLoc = { lat: lat, lng: lng };
    game.streetView.setPosition(game.ansLoc);

    showGameUI('guess');
}

function makeGuess() {
    // Пользователь нажал "Угадать"
    const position = game.userMarker.position;

    // Блокируем кнопку и маркер
    document.getElementById("guess").disabled = true;
    document.getElementById("guess").textContent = "Ожидание других...";
    game.userMarker.gmpDraggable = false;

    // Отправляем ответ на сервер через сокет
    // Сообщение: { type: 'guess', lat: ..., lng: ... }
    socket.send(JSON.stringify({
        type: 'guess',
        lat: typeof position.lat === 'function' ? position.lat() : position.lat,
                               lng: typeof position.lng === 'function' ? position.lng() : position.lng
    }));
}

async function showRoundResults(playersResults, correctLoc) {
    showGameUI('result');
    document.getElementById('timer').textContent = "";

    // Маркер правильного ответа
    const ansPin = new google.maps.marker.PinElement({
        background: "#fff", borderColor: "#000", glyphColor: '#000'
    });

    game.ansMarker = new google.maps.marker.AdvancedMarkerElement({
        map: game.map,
        position: correctLoc, // {lat, lng} от сервера
        content: ansPin.element,
    });

    game.map.setCenter(correctLoc);

    // Отрисовка маркеров других игроков
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    playersResults.forEach(player => {
        // Пропускаем себя, мой маркер уже стоит
        // Хотя можно перерисовать всех для надежности

        const pPin = new google.maps.marker.PinElement({
            background: player.color,
            borderColor: "#000",
            glyphColor: "#fff",
        });

        const marker = new AdvancedMarkerElement({
            map: game.map,
            position: { lat: player.lat, lng: player.lng },
            content: pPin.element,
            title: player.username
        });

        game.otherMarkers.push(marker);

        // Рисуем линию от игрока к ответу
        drawLine({lat: player.lat, lng: player.lng}, correctLoc, player.color);

        // Если это я, выводим дистанцию текстом
        // Сравнение по ID или токену (упрощенно считаем локально)
        // В реале сервер должен сказать "your_distance"
        if (player.isMe) {
            document.getElementById("distanceDisplay").textContent = `Дистанция: ${player.distance_text}`;
        }
    });

    // Если я Хост, показываем кнопки управления
    if (isHost) {
        document.getElementById('host-controls').classList.remove('hidden');
    }
}

// --- Утилиты ---

function attachUIEvents() {
    document.getElementById("guess").addEventListener("click", makeGuess);

    if (isHost) {
        document.getElementById("next-round").addEventListener("click", () => {
            // Хост командует начать следующий раунд
            socket.send(JSON.stringify({ type: 'host_next_round' }));
        });

        document.getElementById("end-game").addEventListener("click", () => {
            // Хост завершает игру
            socket.send(JSON.stringify({ type: 'host_end_game' }));
        });
    }
}

function showGameUI(stage) {
    const guessBtn = document.getElementById("guess");
    const mapsDiv = document.getElementById('maps');
    const searchDiv = document.getElementById('search');
    const hostControls = document.getElementById('host-controls');

    if (stage === 'guess') {
        mapsDiv.classList.remove('hidden');
        searchDiv.classList.add('hidden');
        guessBtn.disabled = false;
        guessBtn.textContent = "Угадать";
        guessBtn.classList.remove('hidden');
        hostControls.classList.add('hidden');
    } else if (stage === 'result') {
        guessBtn.classList.add('hidden');
    }
}

function resetMapForNewRound() {
    // Очистка маркеров соперников
    game.otherMarkers.forEach(m => m.map = null);
    game.otherMarkers = [];

    if (game.ansMarker) game.ansMarker.map = null;

    // Очистка линий (нужно хранить массив линий)
    // game.lines.forEach...

    // Сброс маркера игрока
    game.userMarker.position = { lat: 0, lng: 0 };
    game.userMarker.gmpDraggable = true;
    game.map.setZoom(2);
    game.map.setCenter({lat: 0, lng: 0});

    document.getElementById("distanceDisplay").textContent = "";
}

function drawLine(a, b, color = "#fff") {
    // Рисует линию на карте
    const line = new google.maps.Polyline({
        path: [a, b],
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        map: game.map,
    });
    // Сохраняем ссылку, чтобы потом удалить (нужен массив в game объекте)
}

function sendPostGameResults(stats) {
    // Отправка POST запроса с результатами на бэкенд
    // POST /api/game/results
    fetch('http://localhost:8000/api/game/results', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('kartohodets_token')}`
        },
        body: JSON.stringify(stats)
    }).catch(err => console.error(err));
}

// Экспорт для колбека карт
window.initMap = initMap;
