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
const miraiSound = document.getElementById('mirai-sound');
const ruviSound = document.getElementById('ruvi-sound');
const nemuSound = document.getElementById('nemu-sound');

const miraiSound2 = document.getElementById('mirai-sound-2');
const ruviSound2 = document.getElementById('ruvi-sound-2');
const nemuSound2 = document.getElementById('nemu-sound-2');
const miraiSound3 = document.getElementById('mirai-sound-3');
const ruviSound3 = document.getElementById('ruvi-sound-3');
const nemuSound3 = document.getElementById('nemu-sound-3');
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const closeButton = document.querySelector('.close-button');
const bgmVolumeControl = document.getElementById('bgm-volume');
const bgmMuteCheckbox = document.getElementById('bgm-mute');
const sfxVolumeControl = document.getElementById('sfx-volume');
const sfxMuteCheckbox = document.getElementById('sfx-mute');
const individualSfxControls = document.querySelectorAll('.sfx-volume-individual');
const previewButtons = document.querySelectorAll('.preview-button');
const themeRadios = document.querySelectorAll('input[name="background-theme"]');
const showCreditsButton = document.getElementById('show-credits-button');
const creditsContent = document.getElementById('credits-content');

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
        width: 550,
        height: 700,
        wireframes: false,
        background: '#fff'
    }
});

// 경계 생성
const ground = Bodies.rectangle(275, 690, 550, 20, { isStatic: true, render: { visible: false } });
const leftWall = Bodies.rectangle(0, 350, 20, 700, { isStatic: true, render: { visible: false } });
const rightWall = Bodies.rectangle(550, 350, 20, 700, { isStatic: true, render: { visible: false } });
const topLine = Bodies.rectangle(275, 100, 550, 2, { isStatic: true, isSensor: true, render: { visible: true, strokeStyle: 'red' }, label: 'topLine' });

World.add(world, [ground, leftWall, rightWall, topLine]);

// 과일 종류 정의 (이미지 크기에 맞춰 반지름 조정 필요)
const FRUITS = [
    { level: 0, radius: 31, texture: './image/0.png' }, // 0.png
    { level: 1, radius: 41, texture: './image/1.png' }, // 1.png
    { level: 2, radius: 51, texture: './image/2.png' }, // 2.png
    { level: 3, radius: 61, texture: './image/3.png' }, // 3.png
    { level: 4, radius: 71, texture: './image/4.png' }, // 4.png
    { level: 5, radius: 81, texture: './image/5.png' }, // 5.png
    { level: 6, radius: 91, texture: './image/6.png' }, // 6.png
    { level: 7, radius: 101, texture: './image/7.png' }, // 7.png
    { level: 8, radius: 111, texture: './image/8.png' }, // 8.png
    { level: 9, radius: 121, texture: './image/9.png' }, // 9.png
];

let nextFruit;
let nextNextFruit; // 다음에 나올 과일
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
        const angle = (index / FRUITS.length) * (2 * Math.PI) - (Math.PI / 2); // -PI/2로 시작하여 상단에서 시작
        const fruitX = centerX + circleRadius * Math.cos(angle);
        const fruitY = centerY + circleRadius * Math.sin(angle);

        const img = new Image();
        img.src = fruit.texture;
        img.onload = () => {
            fruitOrderCtx.drawImage(img, fruitX - fruitDisplayRadius, fruitY - fruitDisplayRadius, fruitDisplayRadius * 2, fruitDisplayRadius * 2);
        };
        img.onerror = () => {
        };
    });
}

// 다음 과일 캔버스 업데이트
function updateNextFruitCanvas() {
    nextFruitCtx.clearRect(0, 0, 100, 100);
    if (nextNextFruit) { // nextNextFruit를 표시
        const img = new Image();
        img.src = nextNextFruit.texture;
        img.onload = () => {
            const fixedDrawSize = 80;
            const offsetX = (100 - fixedDrawSize) / 2;
            const offsetY = (100 - fixedDrawSize) / 2;
            nextFruitCtx.drawImage(img, offsetX, offsetY, fixedDrawSize, fixedDrawSize);
        };
        img.onerror = () => {
        };
    }
}

// 과일 초기화 함수
function initializeFruits() {
    // 초기 두 개의 과일 설정
    nextFruit = FRUITS[Math.floor(Math.random() * Math.min(4, FRUITS.length))];
    nextNextFruit = FRUITS[Math.floor(Math.random() * Math.min(4, FRUITS.length))];
    
    // previewFruit 초기화
    if (previewFruit) {
        World.remove(world, previewFruit);
    }
    previewFruit = Bodies.circle(200, 50, nextFruit.radius, {
        isStatic: true,
        isSensor: true,
        render: { sprite: { texture: nextFruit.texture, opacity: 0.5 } }
    });
    World.add(world, previewFruit);

    updateNextFruitCanvas(); // 다음 과일 표시 업데이트
}

// 다음 과일 준비
function prepareNextFruit() {
    nextFruit = nextNextFruit;
    nextNextFruit = FRUITS[Math.floor(Math.random() * Math.min(4, FRUITS.length))];

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
        restitution: 0.2,
        friction: 0.5
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
    
    initializeFruits();

    Render.run(render);
    Matter.Runner.run(runner, engine);

    if (gameBGM && gameBGM.paused) {
        gameBGM.play().catch(error => {
        });
    }
    displayLeaderboard();
}

// 마우스 이벤트
gameContainer.addEventListener('mousemove', (event) => {
    if (disableAction || !previewFruit) return;
    const rect = gameContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    Body.setPosition(previewFruit, { x: Math.max(nextFruit.radius, Math.min(x, 550 - nextFruit.radius)), y: 50 });
});

gameContainer.addEventListener('click', (event) => {
    if (disableAction) return;
    const rect = gameContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    addFruit(Math.max(nextFruit.radius, Math.min(x, 550 - nextFruit.radius)));
});

restartButton.addEventListener('click', restartGame);

// 충돌 이벤트
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label.startsWith('fruit_') && bodyA.label === bodyB.label) {
            const level = parseInt(bodyA.label.split('_')[1]);
            if (level < FRUITS.length - 1) {
                // 과일 레벨에 따라 다른 효과음 재생
                let soundToPlay;
                const sounds = [miraiSound, ruviSound, nemuSound, miraiSound2, ruviSound2, nemuSound2, miraiSound3, ruviSound3, nemuSound3];
                soundToPlay = sounds[level % sounds.length];

                if (soundToPlay) {
                    soundToPlay.currentTime = 0; // 재생 위치를 처음으로 되돌림
                    soundToPlay.play();
                }

                World.remove(world, [bodyA, bodyB]);
                const newLevel = level + 1;
                const newFruitInfo = FRUITS[newLevel];
                const newX = (bodyA.position.x + bodyB.position.x) / 2;
                const newY = (bodyA.position.y + bodyB.position.y) / 2;
                const newFruit = Bodies.circle(newX, newY, newFruitInfo.radius, {
                    label: 'fruit_' + newFruitInfo.level,
                    render: { sprite: { texture: newFruitInfo.texture } },
                    restitution: 0.8,
                    friction: 0.8
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
        });
    }

    drawFruitOrder();
    initializeFruits();

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

// 효과음 볼륨 조절
sfxVolumeControl.addEventListener('input', () => {
    if (sfxMuteCheckbox.checked) {
        sfxMuteCheckbox.checked = false; // 볼륨 조절 시 음소거 해제
    }
    const globalVolume = sfxVolumeControl.value;
    individualSfxControls.forEach(control => {
        const soundId = control.dataset.soundId;
        const soundElement = document.getElementById(soundId);
        if (soundElement) {
            soundElement.volume = globalVolume * control.value;
            soundElement.muted = false; // 볼륨 조절 시 음소거 해제
        }
    });
});

sfxMuteCheckbox.addEventListener('change', () => {
    const allSoundElements = [miraiSound, ruviSound, nemuSound, miraiSound2, ruviSound2, nemuSound2, miraiSound3, ruviSound3, nemuSound3];
    allSoundElements.forEach(soundElement => {
        if (soundElement) {
            soundElement.muted = sfxMuteCheckbox.checked;
        }
    });
});

individualSfxControls.forEach(control => {
    control.addEventListener('input', () => {
        if (sfxMuteCheckbox.checked) {
            sfxMuteCheckbox.checked = false; // 볼륨 조절 시 음소거 해제
        }
        const soundId = control.dataset.soundId;
        const soundElement = document.getElementById(soundId);
        if (soundElement) {
            soundElement.volume = sfxVolumeControl.value * control.value;
            soundElement.muted = false; // 볼륨 조절 시 음소거 해제
        }
    });
});

// 미리듣기 버튼
previewButtons.forEach(button => {
    button.addEventListener('click', () => {
        const soundId = button.dataset.soundId;
        const soundElement = document.getElementById(soundId);
        const individualVolumeSlider = document.querySelector(`input[data-sound-id="${soundId}"]`);
        if (soundElement && individualVolumeSlider) {
            soundElement.volume = sfxVolumeControl.value * individualVolumeSlider.value;
            soundElement.currentTime = 0;
            soundElement.play();
        }
    });
});

const tablinks = document.querySelectorAll('.tablinks');
const tabcontents = document.querySelectorAll('.tabcontent');

// 크레딧 보기 버튼 이벤트 리스너
showCreditsButton.addEventListener('click', () => {
    if (creditsContent.style.display === 'none') {
        creditsContent.style.display = 'block';
    } else {
        creditsContent.style.display = 'none';
    }
});

// 탭 기능
tablinks.forEach(tablink => {
    tablink.addEventListener('click', () => {
        const tabName = tablink.dataset.tab;

        tabcontents.forEach(tabcontent => {
            tabcontent.style.display = 'none';
        });

        tablinks.forEach(tablink => {
            tablink.classList.remove('active');
        });

        document.getElementById(tabName).style.display = 'block';
        tablink.classList.add('active');
    });
});


// 초기 실행
loadLeaderboard();
startGameButton.addEventListener('click', startGame);
