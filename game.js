const game = {
    map: null,
    streetView: null,
    userMarker: null,
    ansMarker: null,
    ansPin: null,
    ansLoc: null,
    line: null,
};

// --- Инициализация карты и панорамы ---

async function initMap() {
    // Импорт библиотек Google Maps
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    // Создание карты (изначально скрыта или на весь экран)
    game.map = new Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        mapId: '4504f8b37365c3d0', // ID стиля карты
        disableDefaultUI: true,   // Отключаем лишние контролы
        clickableIcons: false
    });

    // Создание маркера игрока (черный)
    const userPin = new google.maps.marker.PinElement({
        background: "#000",
        borderColor: "#fff",
        glyphColor: "#fff",
    });

    // Маркер игрока, который можно перетаскивать
    game.userMarker = new AdvancedMarkerElement({
        map: game.map,
        position: { lat: 0, lng: 0 },
        gmpDraggable: true, // Разрешаем перетаскивание
        content: userPin.element,
        title: "Ваш выбор",
    });

    // Пин для правильного ответа (белый)
    game.ansPin = new google.maps.marker.PinElement({
        background: "#fff",
        borderColor: "#000",
        glyphColor: '#000',
    });

    // Обработчик клика по карте: перемещает маркер игрока
    game.map.addListener("click", (event) => {
        if (game.userMarker.gmpDraggable) {
            game.userMarker.position = event.latLng;
        }
    });

    // Создание панорамы StreetView
    game.streetView = new google.maps.StreetViewPanorama(
        document.getElementById("street-view"),
                                                         {
                                                             pov: { heading: 165, pitch: 0 },
                                                             zoom: 1,
                                                             showRoadLabels: false, // Скрываем названия улиц
                                                             addressControl: false,
                                                             disableDefaultUI: true
                                                         }
    );

    attachUIEvents();
    updateStreetView(); // Запускаем первый раунд
}

function attachUIEvents() {
    document.getElementById("guess").addEventListener("click", resultGame);
    document.getElementById("next").addEventListener("click", resetGame);
}

// --- Игровая логика ---

// Функция поиска новой локации
function updateStreetView() {
    const coords = getRandomCoords();
    const svService = new google.maps.StreetViewService();
    showGameUI('search'); // Показываем экран загрузки

    // Запрос к Google Street View Service для поиска панорамы в радиусе 5000м от случайной точки
    svService.getPanorama({ location: coords, radius: 5000 }, (data, status) => {
        if (status === google.maps.StreetViewStatus.OK) {
            // Панорама найдена
            game.ansLoc = data.location.latLng;
            game.streetView.setPosition(game.ansLoc);
            showGameUI('guess'); // Показываем игру
            console.log('Панорама найдена');
        } else {
            // Если панорама не найдена, пробуем снова рекурсивно
            console.log("Панорама не найдена, ищем другую...");
            updateStreetView();
        }
    });
}

// Функция завершения раунда (нажатие "Угадать")
function resultGame() {
    // Создаем маркер правильного ответа
    game.ansMarker = new google.maps.marker.AdvancedMarkerElement({
        map: game.map,
        position: game.ansLoc,
        gmpDraggable: false,
        content: game.ansPin.element,
        title: "Правильный ответ",
    });

    // Рисуем линию между ответом игрока и истиной
    drawLine(game.ansLoc, game.userMarker.position);

    game.map.setCenter(game.ansLoc);
    game.userMarker.gmpDraggable = false; // Блокируем маркер игрока

    // Вычисляем расстояние
    let distance = google.maps.geometry.spherical.computeDistanceBetween(game.ansLoc, game.userMarker.position);

    // Форматирование расстояния
    if (distance < 1000) distance = Math.round(distance) + ' м';
    else if (distance < 10000) distance = (distance / 1000).toFixed(2) + ' км';
    else distance = (distance / 1000).toFixed(0) + ' км';

    document.getElementById("distanceDisplay").textContent = "Ошибка: " + distance;

    showGameUI('next'); // Показываем кнопку "Следующий раунд"
}

// Функция сброса для нового раунда
function resetGame() {
    document.getElementById("distanceDisplay").textContent = " ";
    game.userMarker.gmpDraggable = true;

    // Удаляем маркер ответа и линию
    if (game.ansMarker) {
        game.ansMarker.map = null;
        game.ansMarker = null;
    }
    if (game.line) {
        game.line.setMap(null);
        game.line = null;
    }

    // Сбрасываем позицию маркера игрока
    game.userMarker.position = { lat: 0, lng: 0 };
    game.map.setCenter(game.userMarker.position);
    game.map.setZoom(2);

    updateStreetView();
}

// --- UI и Вспомогательные функции ---

function showGameUI(stage) {
    const guessBtn = document.getElementById("guess");
    const nextBtn = document.getElementById("next");
    const mapsDiv = document.getElementById('maps');
    const searchDiv = document.getElementById('search');

    switch (stage) {
        case 'search':
            // Режим поиска: блюрим карту, прячем кнопки
            nextBtn.classList.add('hidden');
            mapsDiv.classList.add('blur'); // Предполагается CSS класс .blur
            guessBtn.classList.remove('hidden');
            guessBtn.disabled = true;
            searchDiv.classList.remove('hidden');
            break;
        case 'guess':
            // Режим угадывания: показываем карту
            mapsDiv.classList.remove('blur');
            mapsDiv.classList.remove('hidden');
            guessBtn.disabled = false;
            searchDiv.classList.add('hidden');
            break;
        case 'next':
            // Режим результатов: показываем кнопку "Дальше"
            nextBtn.classList.remove('hidden');
            guessBtn.classList.add('hidden');
            break;
    }
}

// Генерация случайных координат
function getRandomCoords() {
    const lat = -90 + Math.random() * 180;
    const lng = -180 + Math.random() * 360;
    return { lat, lng };
}

// Рисование пунктирной линии
function drawLine(a, b) {
    game.line = new google.maps.Polyline({
        path: [a, b],
        strokeOpacity: 0,
        strokeColor: "#fff",
        icons: [{
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 1.5, fillOpacity: 0.5, strokeOpacity: 1 },
            offset: "0",
            repeat: "15px",
        }],
        map: game.map,
    });
}

// Делаем initMap глобальной для callback вызова Google Maps API
window.initMap = initMap;
