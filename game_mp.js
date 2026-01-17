// Получаем параметры из URL
const urlParams = new URLSearchParams(window.location.search);
const lobbyId = urlParams.get('lobby');
const isHost = urlParams.get('host') === 'true';

const game = {
    map: null,
    streetView: null,
    userMarker: null,
    ansMarker: null,
    ansPin: null,
    ansLoc: null,
    players: [],
    pin2d: false,
    firstAns: false,
};
function smoothRedirect(url) {
    const fade = document.getElementById('fade');
    fade.classList.add('active');

    setTimeout(() => {
        window.location.href = url;
    }, 600);
}

window.addEventListener('load', () => {
    const fade = document.getElementById('fade');
    setTimeout(() => fade.classList.remove('active'), 50);
});

let appState = JSON.parse(localStorage.getItem('appState'));
console.log(appState)

// Инициализации

async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    game.map = new Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        mapId: '4504f8b37365c3d0',
    });

    const userPin = new google.maps.marker.PinElement({
        background: "#000",
        borderColor: "#fff",
        glyphColor: "#fff",
    });

    game.userMarker = new AdvancedMarkerElement({
        map: game.map,
        position: { lat: 0, lng: 0 },
        gmpDraggable: true,
        content: userPin.element,
        title: "You wanna guess",
    });

    game.ansPin = new google.maps.marker.PinElement({
        background: "#fff",
        borderColor: "#000",
        glyphColor: '#000',
    });

    game.map.addListener("click", (event) => {
        if (game.userMarker.gmpDraggable)
            game.userMarker.position = event.latLng;
    });

    game.streetView = new google.maps.StreetViewPanorama(
        document.getElementById("street-view"),
        {
            pov: { heading: 165, pitch: 0 },
            zoom: 1,
            disableDefaultUI: true,
            showRoadLabels: false,
            addressControl: false,
        }
    );

    attachUIEvents();
    updateStreetView();
}

function attachUIEvents() {
    document.getElementById('leave').addEventListener('click', () => {

        localStorage.setItem('uiState', 'menu-screen');
        smoothRedirect('index.html')
        //window.location.href = 'index.html';

    });

    if (isHost) {
        document.querySelectorAll('.host-controls').forEach(x => x.classList.remove('hidden'))
    }


    document.getElementById("guess").addEventListener("click", clickGuess);
    document.getElementById("next").addEventListener("click", resetGame);

    const map = document.getElementById("map");

    map.addEventListener('dblclick', () => { if (!game.pin2d) map.classList.add('bigger') });
    map.addEventListener('mouseleave', () => { if (!game.pin2d) map.classList.remove('bigger') });
}
let phrases = null;

async function loadPhrases() {
    const res = await fetch('res/frase.json');
    phrases = await res.json();
}

loadPhrases();


// Игровая логика

function updateStreetView() {
    debugOtherAnsFirst() // ЭМУЛЯЦИЯ УДАЛИТЬ
    if (isHost) {
        const coords = getRandomCoords();
        const svService = new google.maps.StreetViewService();
        showGameUI('search');

        svService.getPanorama({ location: coords, radius: 5000 }, (data, status) => {
            if (status === google.maps.StreetViewStatus.OK) {
                game.ansLoc = data.location.latLng;
                game.streetView.setPosition(game.ansLoc);
                showGameUI('guess');
                console.log('нашлась панорама', data.location.pano)
                //отправить на сервер data.location.pano
            } else {
                console.log("нет панорамы");
                updateStreetView();
            }
        });
    }
    else {
        showGameUI('search');
        const svService = new google.maps.StreetViewService();

        //получили panoId
        let panoId = 'IzDel64coyePHXUADioa8A' //ЗАГЛУШКА
        svService.getPanorama({ pano: panoId }, (data, status) => {
            if (status === google.maps.StreetViewStatus.OK) {
                game.ansLoc = data.location.latLng;
                game.streetView.setPosition(game.ansLoc);
                showGameUI('guess');
                console.log('нашлась панорама', data.location.pano)
            } else {
                console.log("нет панорамы");
                updateStreetView();
            }
        });
    }
}

function clickGuess() {
    game.userMarker.gmpDraggable = false;

    if (!game.firstAns) {
        game.firstAns = true;
        //отправить сообщение на сервер запустить таймеры других игроков
        startTimer()
    }
    //lock guess btn
    showGameUI('wait');

}

let _myRes = { name: appState.user, };
function myResult() {
    //отправить на сервер lat lng
    let lat = game.userMarker.position.lat;
    let lng = game.userMarker.position.lng
    _myRes.coord = { lat, lng };
    console.log(lat, lng)

    let distance = google.maps.geometry.spherical.computeDistanceBetween(game.ansLoc, game.userMarker.position);

    document.getElementById("frase").textContent = frase(distance / 1000)
    appState.score += scoreFromDistance(distance / 1000)
    appState.games++;
    localStorage.setItem('appState', JSON.stringify(appState));
    console.log(appState)

    if (distance < 1000) distance = distance + ' m';
    else if (distance < 100000) distance = (distance / 1000).toFixed(2) + ' km';
    else distance = (distance / 1000).toFixed(0) + ' km'
    document.getElementById("res-cover").classList.add('visible');
    document.getElementById("distance").textContent = distance;
}


function resultGame(playersResults) {
    game.ansMarker = new google.maps.marker.AdvancedMarkerElement({
        map: game.map,
        position: game.ansLoc,
        gmpDraggable: false,
        content: game.ansPin.element,
        title: "This is answer lol",
    });

    game.map.setZoom(3);
    game.map.panTo(game.ansLoc);
    game.userMarker.gmpDraggable = false;

    const ranked = playersResults
        .map(player => {
            const distance = google.maps.geometry.spherical.computeDistanceBetween(
                game.ansLoc,
                player.coord
            );
            return { ...player, distance };
        })
        .sort((a, b) => a.distance - b.distance);

    addRating(ranked);
    addMarkeres(ranked);

    showGameUI('next');
}

function resetGame() {
    appState = JSON.parse(localStorage.getItem('appState'));

    document.getElementById("res-cover").classList.remove('visible');
    game.userMarker.gmpDraggable = true;
    if (game.ansMarker) {
        game.ansMarker.map = null;
        game.ansMarker = null;
    }

    if (game.players) {
        game.players.forEach(p => {
            p.marker.setMap(null);
            p.line.setMap(null);
        });
        game.players = [];
    }
    game.userMarker.position = { lat: 0, lng: 0 };
    game.map.setZoom(1);
    game.map.panTo(game.userMarker.position);
    game.streetView.setZoom(1);
    game.firstAns = false;
    updateStreetView();
}

//вызывается когда получили сообщение от сокета "кто-то запустил таймер" (наш ответ не первый)
function startTimer() {
    console.log('startTimer')
    game.firstAns = true
    const timer = document.getElementById('timer')
    timer.classList.remove('hidden')
    let sec = +timer.textContent;
    const interval = setInterval(() => {
        sec--;
        timer.textContent = sec;

        if (sec <= 0) {
            clearInterval(interval);
            game.firstAns = false
            myResult();
            //playersResults - получаем с сервера
            resultGame(debugPlayersRes());
        }
    }, 1000);
}


function debugOtherAnsFirst() {
    setTimeout(() => { if (!game.firstAns) startTimer() }, 5000 * (1 + Math.random()))
}

function debugPlayersRes() {
    let playersResults = [
        { name: "qq2345", coord: getRandomCoords() },
        { name: "smellydog356", coord: getRandomCoords() },
        { name: "mclovin", coord: getRandomCoords() },
        { name: "kristiana_F", coord: getRandomCoords() },
        { name: "ivan_gamaz", coord: getRandomCoords() },
        { name: "ribka_pickmi", coord: getRandomCoords() }
    ]
    playersResults.push(_myRes);
    return playersResults
}

// UI и вспомогательные функции

function showGameUI(stage) {
    switch (stage) {
        case 'search':
            document.getElementById('map3d').classList.add('blur');
            document.getElementById("guess").classList.remove('hidden');
            document.getElementById("guess").disabled = true;
            document.getElementById('street-view').querySelectorAll('table').forEach((t) => t.parentElement.classList.add('hidden'));
            document.getElementById('map').querySelectorAll('table').forEach((t) => t.parentElement.classList.add('hidden'));
            document.getElementById('search').classList.remove('hidden');
            document.getElementById('panorama-overlay').classList.remove('dark')
            document.getElementById("map").classList.remove('bigger')

            document.getElementById("games-count").textContent = appState.games;
            document.getElementById("score").textContent = appState.score;

            break;
        case 'guess':
            game.pin2d = false;
            document.getElementById('map3d').classList.remove('blur');
            document.getElementById('map3d').classList.remove('hidden');
            document.getElementById("guess").disabled = false;
            document.getElementById('search').classList.add('hidden');
            break;
        case 'next':
            document.getElementById('panorama-overlay').classList.add('dark')
            game.pin2d = true;
            document.getElementById("map").classList.add('bigger')
            document.getElementById("guess").classList.add('hidden');
            const timer = document.getElementById('timer')
            timer.classList.add('hidden');
            timer.textContent = 15;
            break;
        case 'wait':
            document.getElementById("guess").disabled = true;
        //game.pin2d = true;
    }
}

function addRating(ranked) {
    const liders = document.getElementById('liders');
    liders.innerHTML = '';
    ranked.slice(0, 3).forEach((player, index) => {
        const div = document.createElement('div');
        div.className = 'lider';
        div.style.borderLeft = `6px solid ${PLACE_COLORS[index]}`;

        div.innerHTML = `
            <p><span class="icon"></span>${player.name}</p>
            <p>${scoreFromDistance(player.distance / 1000)}</p>
            <p>${(player.distance / 1000).toFixed(0)} km</p>
        `;

        liders.appendChild(div);
    });
}

function addMarkeres(ranked) {
    ranked.forEach((player, index) => {
        const color = PLACE_COLORS[index] || '#999';

        const pin = createPlayerPin(color);

        const marker = new google.maps.marker.AdvancedMarkerElement({
            map: game.map,
            position: player.coord,
            content: pin.element,
            title: player.name,
        });

        const line = drawLine(game.ansLoc, player.coord, color);

        game.players.push({ marker, line });
    });
    console.log(game.players)
}

function getRandomCoords() {
    const lat = -90 + Math.random() * 180;
    const lng = -180 + Math.random() * 360;
    return { lat, lng };
}

function createPlayerPin(color) {
    return new google.maps.marker.PinElement({
        background: color,
        borderColor: "#fff",
        glyphColor: "#fff",
    });
}


function drawLine(a, b) {
    return new google.maps.Polyline({
        path: [a, b],
        strokeOpacity: 0, // основной stroke скрыт
        icons: [{
            icon: {
                path: 'M 0,-1 0,1', // маленькая вертикальная черта
                strokeOpacity: 1,
                strokeColor: '#000',
                strokeWeight: 1,
            },
            offset: '0',
            repeat: '10px',
        }],
        map: game.map,
    });
}


function frase(distanceKm) {
    if (!phrases) return "";

    const keys = Object.keys(phrases)
        .filter(k => k !== "+")
        .map(Number)
        .sort((a, b) => a - b);
    let bucket = "+";
    for (const k of keys) {
        if (distanceKm <= k) {
            bucket = k;
            break;
        }
    }
    const list = phrases[bucket];
    x = Math.floor(Math.random() * list.length);
    return list[x];
}


function scoreFromDistance(distance) {
    mx = 1000
    let score = Math.round(mx * Math.exp(-distance / 1000));
    console.log('distance', distance, 'score', score);

    return score;
}

const PLACE_COLORS = [
    '#6abb8f', // 1
    '#789ab7', // 2
    '#c8a3f5', // 3
    '#b77894', // 4
    '#b78878', // 5
    '#b7af78'  // 6+
];


//initMap();