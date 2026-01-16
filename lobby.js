console.log('renderLobbyScreen')

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



appState = JSON.parse(localStorage.getItem('appState'));
console.log(appState)
document.getElementById('lobby-code-display').innerText = appState.currentLobby;

const earth = document.getElementById('players-markers');

function addMarker(playerName) {
    const marker = document.createElement('div')

    marker.textContent = playerName
    marker.classList.add('marker')

    const rad = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random());
    const mx = earth.clientWidth;

    const [x, y] = polarToDecar(rad, d, mx);
    marker.style.top = y + 'px';
    marker.style.left = x + 'px'

    const img = document.createElement('img');
    img.src = 'res/marker.png';
    img.style.height = '30px';
    img.style.width = '19px';

    marker.appendChild(img)

    earth.appendChild(marker)
}

function polarToDecar(rad, d, mx) {
    let x = mx / 2 * (1 + d * Math.cos(rad))
    let y = mx / 2 * (1 + d * Math.sin(rad))
    return [x, y]
}



const startBtn = document.getElementById('btn-start-game');
const guestMsg = document.getElementById('guest-msg');

// Эмуляция данных
const mockData = {
    players: ['rimeifutamo', 'nq1s788', 'anya_mrkv3']
};

addMarker(appState.user)
mockData.players.forEach(addMarker)

if (appState.isHost) {
    startBtn.style.display = 'block';
    guestMsg.style.display = 'none';

    // Навешиваем обработчик старта игры только для хоста
    startBtn.onclick = () => {
        // Запрос: POST /api/lobby/{code}/start
        // Или отправка сообщения в сокет
        console.log("Хост запустил игру");
        // Редирект в игру (передаем ID лобби и роль)
        smoothRedirect(`game_mp.html?lobby=${appState.currentLobby}&host=true`)
    };
} else {
    startBtn.style.display = 'none';
    guestMsg.style.display = 'block';

    // Гость должен слушать сокет на предмет начала игры.
    // В рамках этого файла (menu.js) мы предполагаем, что как только
    // придет сигнал "game_started", мы делаем редирект.
    // Эмуляция (так как сокеты полностью будут в game_mp.js, здесь просто заглушка):
    setTimeout(() => {
        smoothRedirect(`game_mp.html?lobby=${appState.currentLobby}`)
    }, 2000);

    // Примечание: В реальном проекте здесь уже должно быть подключение к сокету
    // для обновления списка игроков в лобби.
}


document.getElementById('btn-leave-lobby').addEventListener('click', () => {
    // Запрос: POST /api/lobby/leave
    appState.currentLobby = null;
    appState.isHost = false

    localStorage.setItem('appState', JSON.stringify(appState));
    localStorage.setItem('uiState', 'room-enter-screen');
    smoothRedirect('index.html')
    //window.location.href = 'index.html';

});

