// Matter.js 모듈 별칭 설정
const Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Events = Matter.Events,
    Composite = Matter.Composite,
    Body = Matter.Body;

// DOM 요소 가져오기
const gameContainer = document.getElementById('game-container');
const gameOverScreen = document.getElementById('game-over-screen');
const restartButton = document.getElementById('restart-button');
const finalScoreElement = document.getElementById('final-score');
const nextFruitCanvas = document.getElementById('next-fruit-canvas');
const nextFruitCtx = nextFruitCanvas.getContext('2d');
const fruitOrderCanvas = document.getElementById('fruit-order-canvas');
const fruitOrderCtx = fruitOrderCanvas.getContext('2d');
const currentScoreElement = document.getElementById('current-score');
const leaderboardElement = document.getElementById('leaderboard');
const introScreen = document.getElementById('intro-screen');
const gameWrapper = document.getElementById('game-wrapper');
const playerNameInput = document.getElementById('player-name');
const startGameButton = document.getElementById('start-game-button');
const gameBGM = document.getElementById('game-bgm');
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const closeButton = document.querySelector('.close-button');
const bgmVolumeControl = document.getElementById('bgm-volume');
const bgmMuteCheckbox = document.getElementById('bgm-mute');
const themeRadios = document.querySelectorAll('input[name="background-theme"]');

const THEMES = {
    spring: './image/hanavi_spring.png',
    summer: './image/hanavi_summer.png',
    autumn: './image/hanavi_autumn.png',
    winter: './image/hanavi_winter.png',
};

let currentScore = 0;
let leaderboard = [];
let currentPlayerName = 'Guest';

// 테마 적용 함수
function applyTheme(themeName) {
    const imageUrl = THEMES[themeName];
    if (imageUrl) {
        document.body.style.backgroundImage = `url('${imageUrl}')`;
        localStorage.setItem('hanaviTheme', themeName);
    }
}

// 초기 테마 로드
const savedTheme = localStorage.getItem('hanaviTheme') || 'summer'; // 기본값 여름
applyTheme(savedTheme);

// 라디오 버튼 이벤트 리스너
themeRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
        applyTheme(event.target.value);
    });
    if (radio.value === savedTheme) {
        radio.checked = true;
    }
});

// 스코어 업데이트 함수
function updateScore(points) {
    currentScore += points;
    currentScoreElement.textContent = currentScore;
}

// 리더보드 로드 및 저장
function loadLeaderboard() {
    const storedLeaderboard = localStorage.getItem('suikaLeaderboard');
    if (storedLeaderboard) {
        leaderboard = JSON.parse(storedLeaderboard);
    }
    displayLeaderboard();
}

function saveLeaderboard() {
    localStorage.setItem('suikaLeaderboard', JSON.stringify(leaderboard));
}

// 리더보드 표시
function displayLeaderboard() {
    leaderboardElement.innerHTML = '';
    const validLeaderboard = leaderboard.filter(entry => typeof entry === 'object' && entry !== null && typeof entry.score === 'number');
    validLeaderboard.sort((a, b) => b.score - a.score);

    validLeaderboard.slice(0, 5).forEach((entry, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${index + 1}. ${entry.name}: ${entry.score}`;
        leaderboardElement.appendChild(listItem);
    });
}

// 게임 종료 시 리더보드 업데이트
function updateLeaderboardOnGameOver() {
    leaderboard.push({ name: currentPlayerName, score: currentScore });
    saveLeaderboard();
    displayLeaderboard();
}

// Matter.js 엔진 생성
const engine = Engine.create();
const world = engine.world;
const runner = Matter.Runner.create();

// 렌더러 생성 및 설정
const render = Render.create({
    element: gameContainer,
    engine: engine,
    options: {
        width: 400,
        height: 600,
        wireframes: false,
        background: '#fff'
    }
});

// 경계 생성
const ground = Bodies.rectangle(200, 600, 400, 20, { isStatic: true, render: { visible: false } });
const leftWall = Bodies.rectangle(0, 300, 20, 600, { isStatic: true, render: { visible: false } });
const rightWall = Bodies.rectangle(400, 300, 20, 600, { isStatic: true, render: { visible: false } });
const topLine = Bodies.rectangle(200, 100, 400, 2, { isStatic: true, isSensor: true, render: { visible: true, strokeStyle: 'red' }, label: 'topLine' });

World.add(world, [ground, leftWall, rightWall, topLine]);

// 과일 종류 정의 (이미지 크기에 맞춰 반지름 조정 필요)
const FRUITS = [
    { level: 0, radius: 35, texture: './image/1.png' }, // 1.png
    { level: 1, radius: 45, texture: './image/2.png' }, // 2.png
    { level: 2, radius: 55, texture: './image/3.png' }, // 3.png
    { level: 3, radius: 65, texture: './image/4.png' }, // 4.png
    { level: 4, radius: 75, texture: './image/5.png' }, // 5.png
    { level: 5, radius: 85, texture: './image/6.png' }, // 6.png
    { level: 6, radius: 95, texture: './image/7.png' }, // 7.png
];

let nextFruit;
let disableAction = false;
let previewFruit;
let gameOverTimeout = null;
let isGameOver = false;

// 게임 종료 함수
function endGame() {
    if (isGameOver) return;
    isGameOver = true;
    Matter.Runner.stop(runner);
    finalScoreElement.textContent = 'Score: ' + currentScore;
    gameOverScreen.style.display = 'flex';
    disableAction = true;
    updateLeaderboardOnGameOver();
}

// 과일 순서 그리기
function drawFruitOrder() {
    fruitOrderCtx.clearRect(0, 0, fruitOrderCanvas.width, fruitOrderCanvas.height);
    const centerX = fruitOrderCanvas.width / 2;
    const centerY = fruitOrderCanvas.height / 2; // 캔버스 중앙 Y
    const circleRadius = 40; // 과일 배치 원의 반지름
    const fruitDisplayRadius = 15; // 표시될 과일의 고정 반지름

    fruitOrderCtx.font = '12px Gamja Flower';
    fruitOrderCtx.textAlign = 'center';
    fruitOrderCtx.textBaseline = 'middle';

    FRUITS.forEach((fruit, index) => {
        console.log(`Drawing fruit order: Level ${fruit.level}, Texture: ${fruit.texture}`);
        const angle = (index / FRUITS.length) * (2 * Math.PI) - (Math.PI / 2); // -PI/2로 시작하여 상단에서 시작
        const fruitX = centerX + circleRadius * Math.cos(angle);
        const fruitY = centerY + circleRadius * Math.sin(angle);

        const img = new Image();
        img.src = fruit.texture;
        img.onload = () => {
            fruitOrderCtx.drawImage(img, fruitX - fruitDisplayRadius, fruitY - fruitDisplayRadius, fruitDisplayRadius * 2, fruitDisplayRadius * 2);
            console.log(`Successfully loaded and drew: ${fruit.texture}`);
        };
        img.onerror = () => {
            console.error(`Failed to load image for fruit order: ${fruit.texture}`);
        };
    });
}

// 다음 과일 캔버스 업데이트
function updateNextFruitCanvas() {
    nextFruitCtx.clearRect(0, 0, 100, 100);
    if (nextFruit) {
        const img = new Image();
        img.src = nextFruit.texture;
        img.onload = () => {
            const fixedDrawSize = 80;
            const offsetX = (100 - fixedDrawSize) / 2;
            const offsetY = (100 - fixedDrawSize) / 2;
            nextFruitCtx.drawImage(img, offsetX, offsetY, fixedDrawSize, fixedDrawSize);
        };
        img.onerror = () => {
            console.error(`Failed to load next fruit image: ${nextFruit.texture}`);
        };
    }
}

// 다음 과일 준비
function prepareNextFruit() {
    nextFruit = FRUITS[Math.floor(Math.random() * 4)]; // 0~3 레벨 과일 중 랜덤 선택
    updateNextFruitCanvas();
    if (previewFruit) {
        World.remove(world, previewFruit);
    }
    previewFruit = Bodies.circle(200, 50, nextFruit.radius, {
        isStatic: true,
        isSensor: true,
        render: { sprite: { texture: nextFruit.texture, opacity: 0.5 } } // 이미지 렌더링
    });
    World.add(world, previewFruit);
}

// 과일 추가 함수
function addFruit(x) {
    if (disableAction || !nextFruit) return;

    const fruitToAdd = nextFruit;
    const fruit = Bodies.circle(x, 50, fruitToAdd.radius, {
        label: 'fruit_' + fruitToAdd.level,
        render: { sprite: { texture: fruitToAdd.texture } },
        restitution: 0.4,
        friction: 0.01
    });
    World.add(world, fruit);
    prepareNextFruit();
}

// 게임 재시작 함수
function restartGame() {
    if (currentScore > 0 && !isGameOver) {
        updateLeaderboardOnGameOver();
    }

    Composite.clear(world, false);
    World.add(world, [ground, leftWall, rightWall, topLine]);
    gameOverScreen.style.display = 'none';
    disableAction = false;
    isGameOver = false;
    if (gameOverTimeout) {
        clearTimeout(gameOverTimeout);
        gameOverTimeout = null;
    }
    currentScore = 0;
    currentScoreElement.textContent = currentScore;
    prepareNextFruit();
    Render.run(render);
    Matter.Runner.run(runner, engine);

    if (gameBGM && gameBGM.paused) {
        gameBGM.play().catch(error => {
            console.log('BGM autoplay prevented on restart:', error);
        });
    }
    displayLeaderboard();
}

// 마우스 이벤트
gameContainer.addEventListener('mousemove', (event) => {
    if (disableAction || !previewFruit) return;
    const rect = gameContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    Body.setPosition(previewFruit, { x: Math.max(nextFruit.radius, Math.min(x, 400 - nextFruit.radius)), y: 50 });
});

gameContainer.addEventListener('click', (event) => {
    if (disableAction) return;
    const rect = gameContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    addFruit(Math.max(nextFruit.radius, Math.min(x, 400 - nextFruit.radius)));
});

restartButton.addEventListener('click', restartGame);

// 충돌 이벤트
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label.startsWith('fruit_') && bodyA.label === bodyB.label) {
            const level = parseInt(bodyA.label.split('_')[1]);
            if (level < FRUITS.length - 1) {
                World.remove(world, [bodyA, bodyB]);
                const newLevel = level + 1;
                const newFruitInfo = FRUITS[newLevel];
                const newX = (bodyA.position.x + bodyB.position.x) / 2;
                const newY = (bodyA.position.y + bodyB.position.y) / 2;
                const newFruit = Bodies.circle(newX, newY, newFruitInfo.radius, {
                    label: 'fruit_' + newFruitInfo.level,
                    render: { sprite: { texture: newFruitInfo.texture } },
                    restitution: 0.6,
                    friction: 0.01
                });
                const combinedVelocity = { x: (bodyA.velocity.x + bodyB.velocity.x) / 2, y: (bodyA.velocity.y + bodyB.velocity.y) / 2 };
                Body.setVelocity(newFruit, combinedVelocity);
                Body.applyForce(newFruit, newFruit.position, { x: 0, y: -0.03 });
                World.add(world, newFruit);
                const scoreToAdd = newFruitInfo.radius * 10;
                updateScore(scoreToAdd);
            }
        }
    });
});

// 게임 오버 체크
Events.on(engine, 'beforeUpdate', () => {
    if (isGameOver) return;

    // FPS 측정
    const now = performance.now();
    const deltaTime = now - (lastFrameTime || now);
    lastFrameTime = now;
    const fps = 1000 / deltaTime;
    // console.log(`FPS: ${fps.toFixed(2)}`);

    const bodies = Composite.allBodies(world);
    let isOverLine = false;
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.label.startsWith('fruit_') && body.position.y < topLine.position.y) {
            isOverLine = true;
            break;
        }
    }
    if (isOverLine) {
        if (!gameOverTimeout) {
            gameOverTimeout = setTimeout(() => {
                endGame();
            }, 1500);
        }
    } else {
        if (gameOverTimeout) {
            clearTimeout(gameOverTimeout);
            gameOverTimeout = null;
        }
    }
});

let lastFrameTime = 0; // FPS 측정을 위한 변수 추가

function startGame() {
    currentPlayerName = playerNameInput.value.trim();
    if (currentPlayerName === '') {
        const randomNames = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'];
        currentPlayerName = randomNames[Math.floor(Math.random() * randomNames.length)];
    }

    introScreen.style.display = 'none';
    gameWrapper.style.display = 'flex';

    // BGM 재생
    if (gameBGM) {
        gameBGM.volume = bgmVolumeControl.value; // 설정된 볼륨 적용
        gameBGM.muted = bgmMuteCheckbox.checked; // 설정된 음소거 적용
        gameBGM.play().catch(error => {
            console.log('BGM autoplay prevented:', error);
        });
    }

    drawFruitOrder();
    prepareNextFruit();
    Render.run(render);
    Matter.Runner.run(runner, engine);
}

// 설정 모달 관련 이벤트 리스너
settingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'block';
});

closeButton.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target == settingsModal) {
        settingsModal.style.display = 'none';
    }
});

bgmVolumeControl.addEventListener('input', () => {
    if (gameBGM) {
        gameBGM.volume = bgmVolumeControl.value;
        bgmMuteCheckbox.checked = false; // 볼륨 조절 시 음소거 해제
    }
});

bgmVolumeControl.addEventListener('change', () => {
    if (gameBGM) {
        gameBGM.volume = bgmVolumeControl.value;
        bgmMuteCheckbox.checked = false; // 볼륨 조절 시 음소거 해제
    }
});

bgmMuteCheckbox.addEventListener('change', () => {
    if (gameBGM) {
        gameBGM.muted = bgmMuteCheckbox.checked;
    }
});

// 초기 실행
loadLeaderboard();
startGameButton.addEventListener('click', startGame);
