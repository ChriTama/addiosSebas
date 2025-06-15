document.addEventListener('DOMContentLoaded', () => {
    // Elementi del DOM
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over');
    const startButton = document.getElementById('start-btn');
    const restartButton = document.getElementById('restart-btn');
    const jumpButton = document.getElementById('jump');
    const character = document.getElementById('character');
    const obstaclesContainer = document.getElementById('obstacles-container');
    const scoreElement = document.querySelector('#score span');
    const finalScoreElement = document.getElementById('final-score');
    const highScoreElement = document.getElementById('high-score');
    const heartsElement = document.getElementById('hearts');
    
    // Rileva se è un dispositivo mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Audio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function playSound(frequency, type, duration = 0.2) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    }
    
    // Variabili di gioco
    let isGameOver = false;
    let score = 0;
    let highScore = localStorage.getItem('highScore') || 0;
    let lives = 3;
    let gameSpeed = isMobile ? 2 : 1; // Molto più veloce su mobile
    let gameInterval;
    let obstacleInterval;
    let scoreInterval;
    let obstacles = [];
    
    // Immagini del gioco
    const images = {
        character: 'images/character.png',
        obstacle1: 'images/obstacle1.png',
        obstacle2: 'images/obstacle2.png',
        obstacle3: 'images/obstacle3.png',
        bride: 'images/bride.png'
    };
    
    // Mostra lo schermo iniziale
    showScreen('start');
    highScoreElement.textContent = highScore;
    
    // Funzione per mostrare le schermate
    function showScreen(screen) {
        startScreen.classList.add('hidden');
        gameScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        
        switch(screen) {
            case 'start':
                startScreen.classList.remove('hidden');
                break;
            case 'game':
                gameScreen.classList.remove('hidden');
                break;
            case 'gameOver':
                gameOverScreen.classList.remove('hidden');
                break;
        }
    }
    
    // Gestisci il salto
    let isJumping = false;
    const JUMP_HEIGHT = 80; // Altezza del salto
    const JUMP_DURATION = 400; // Durata del salto in ms
    
    function jump() {
        if (isJumping || isGameOver) return;
        
        isJumping = true;
        character.classList.add('jump');
        
        // Salita
        character.style.transition = `transform ${JUMP_DURATION}ms ease-out`;
        character.style.transform = `translateY(-${JUMP_HEIGHT}px)`;
        
        // Discesa
        setTimeout(() => {
            character.style.transition = `transform ${JUMP_DURATION * 0.8}ms ease-in`;
            character.style.transform = 'translateY(0)';
            
            // Ripristina lo stato dopo la discesa
            setTimeout(() => {
                isJumping = false;
                character.classList.remove('jump');
                character.style.transition = 'transform 0.1s';
            }, JUMP_DURATION * 0.8);
        }, JUMP_DURATION * 0.4); // Inizia a scendere prima di raggiungere l'apice
    }
    
    // Crea un nuovo ostacolo
    function createObstacle() {
        if (isGameOver) return;
        
        const obstacleTypes = [
            { type: 'obstacle', image: images.obstacle1, points: 0, width: 35, height: 35 },
            { type: 'obstacle', image: images.obstacle2, points: 0, width: 35, height: 45 },
            { type: 'bride', image: images.bride, points: 10, width: 45, height: 75 }
        ];
        
        // 25% di probabilità di generare una sposa (bonus)
        const isBride = Math.random() < 0.25;
        const obstacleType = isBride ? obstacleTypes[2] : obstacleTypes[Math.floor(Math.random() * 2)];
        
        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle';
        obstacle.style.width = `${obstacleType.width}px`;
        obstacle.style.height = `${obstacleType.height}px`;
        obstacle.style.bottom = `${obstacleType.type === 'bride' ? '65px' : '60px'}`;
        
        const img = document.createElement('img');
        img.src = obstacleType.image;
        img.alt = obstacleType.type;
        
        // Se l'immagine non viene caricata, mostra un fallback con emoji
        img.onerror = function() {
            img.style.display = 'none';
            obstacle.textContent = obstacleType.type === 'bride' ? '👰' : '🚫';
            obstacle.style.fontSize = '40px';
            obstacle.style.display = 'flex';
            obstacle.style.alignItems = 'center';
            obstacle.style.justifyContent = 'center';
        };
        
        obstacle.appendChild(img);
        obstaclesContainer.appendChild(obstacle);
        
        const obstacleData = {
            element: obstacle,
            type: obstacleType.type,
            points: obstacleType.points,
            passed: false
        };
        
        obstacles.push(obstacleData);
        
        // Animazione dell'ostacolo (molto più veloce su mobile)
        const baseDuration = isMobile ? 2.8 : 5; // Molto più veloce su mobile
        const animationDuration = baseDuration / gameSpeed;
        obstacle.style.animation = `moveObstacle ${animationDuration}s linear`;
        
        // Rimuovi l'ostacolo quando esce dallo schermo
        setTimeout(() => {
            if (obstacle.parentNode === obstaclesContainer) {
                obstaclesContainer.removeChild(obstacle);
                obstacles = obstacles.filter(o => o.element !== obstacle);
            }
        }, animationDuration * 1000);
    }
    
    // Controlla le collisioni con margine ridotto
    function checkCollisions() {
        if (isGameOver) return;
        
        const characterRect = character.getBoundingClientRect();
        const margin = 5; // Riduci il margine di collisione
        
        obstacles.forEach(obstacle => {
            const obstacleRect = obstacle.element.getBoundingClientRect();
            
            // Controlla se c'è una collisione con margine ridotto
            if (
                characterRect.right > obstacleRect.left + margin &&
                characterRect.left < obstacleRect.right - margin &&
                characterRect.bottom > obstacleRect.top + margin &&
                characterRect.top < obstacleRect.bottom - margin
            ) {
                if (obstacle.type === 'bride') {
                    // Suono di raccolta sposa
                    playSound(1000, 'sine', 0.3);
                    
                    // Raccogli la sposa (bonus punti)
                    score += obstacle.points;
                    scoreElement.textContent = score;
                    obstacle.element.style.animation = 'none';
                    obstacle.element.style.transform = 'scale(1.5) translateY(-20px)';
                    obstacle.element.style.opacity = '0';
                    setTimeout(() => {
                        if (obstacle.element.parentNode === obstaclesContainer) {
                            obstaclesContainer.removeChild(obstacle.element);
                        }
                    }, 300);
                    
                    // Aggiorna l'array degli ostacoli
                    obstacles = obstacles.filter(o => o !== obstacle);
                } else {
                    // Suono di collisione con ostacolo
                    playSound(150, 'sine', 0.3);
                    
                    // Colpito un ostacolo normale
                    lives--;
                    updateLives();
                    
                    if (lives <= 0) {
                        gameOver();
                    } else {
                        // Effetto di danno visivo
                        document.body.style.backgroundColor = '#ffebee';
                        setTimeout(() => {
                            document.body.style.backgroundColor = '';
                        }, 200);
                    }
                    
                    // Rimuovi l'ostacolo
                    if (obstacle.element.parentNode === obstaclesContainer) {
                        obstaclesContainer.removeChild(obstacle.element);
                    }
                    obstacles = obstacles.filter(o => o !== obstacle);
                }
            } else if (!obstacle.passed && obstacleRect.right < characterRect.left) {
                // Punti per aver superato l'ostacolo
                obstacle.passed = true;
                if (obstacle.type === 'obstacle') {
                    // Suono di successo per ostacolo evitato
                    playSound(800, 'sine', 0.1);
                    
                    score += 5; // 5 punti per ogni ostacolo evitato
                    scoreElement.textContent = score; // Aggiorna subito il punteggio
                }
            }
        });
    }
    
    // Aggiorna il contatore delle vite
    function updateLives() {
        heartsElement.textContent = '❤️'.repeat(lives) + '♡'.repeat(3 - lives);
    }
    
    // Aumenta la difficoltà in base al punteggio
    function updateDifficulty() {
        // Aumenta la velocità molto più lentamente
        gameSpeed = 1 + Math.floor(score / 20) * 0.1;
        // Velocità massima limitata a 2x invece di 3x
        gameSpeed = Math.min(gameSpeed, 2);
    }
    
    // Gestisci la fine del gioco
    function gameOver() {
        isGameOver = true;
        
        // Aggiorna il punteggio massimo
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
            highScoreElement.textContent = highScore;
        }
        
        // Mostra il punteggio finale
        finalScoreElement.textContent = score;
        
        // Ferma tutti gli intervalli
        clearInterval(gameInterval);
        clearInterval(obstacleInterval);
        clearInterval(scoreInterval);
        
        // Mostra la schermata di game over
        showScreen('gameOver');
    }
    
    // Resetta il gioco
    function resetGame() {
        // Resetta le variabili di gioco
        isGameOver = false;
        score = 0;
        lives = 3;
        gameSpeed = 1;
        
        // Resetta il punteggio e le vite
        scoreElement.textContent = '0';
        updateLives();
        
        // Rimuovi tutti gli ostacoli
        while (obstaclesContainer.firstChild) {
            obstaclesContainer.removeChild(obstaclesContainer.firstChild);
        }
        obstacles = [];
    }
    
    // Avvia il gioco
    function startGame() {
        resetGame();
        showScreen('game');
        
        // Avvia il loop di gioco
        gameInterval = setInterval(checkCollisions, 20);
        
        // Genera ostacoli a intervalli casuali
        function generateObstacle() {
            if (!isGameOver) {
                createObstacle();
                // Intervallo tra gli ostacoli (molto più breve su mobile)
                const minTime = isMobile ? 800 : 1500; // 0.8-1.8s su mobile, 1.5-3s su desktop
                const maxTime = isMobile ? 1800 : 3000;
                const randomTime = Math.random() * (maxTime - minTime) + minTime;
                // Riduci l'effetto della velocità
                const speedFactor = isMobile ? 0.9 : 0.7;
                obstacleInterval = setTimeout(generateObstacle, randomTime / (gameSpeed * speedFactor));
            }
        }
        
        // Avvia la generazione del primo ostacolo
        generateObstacle();
        
        // Aggiorna la difficoltà ogni secondo
        scoreInterval = setInterval(updateDifficulty, 1000);
    }
    
    // Event Listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    
    // Gestione del touch e del mouse
    jumpButton.addEventListener('mousedown', jump);
    jumpButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        jump();
    });
    
    // Aggiungi anche i controlli da tastiera per comodità
    document.addEventListener('keydown', (e) => {
        if ((e.code === 'Space' || e.code === 'ArrowUp') && !isGameOver) {
            e.preventDefault();
            jump();
        }
    });
    
    // Abilita il tap su tutto lo schermo su mobile
    if (isMobile) {
        document.addEventListener('touchstart', (e) => {
            if (!isGameOver && e.target.id !== 'start-btn' && e.target.id !== 'restart-btn') {
                e.preventDefault();
                jump();
            }
        });
    }
    
    // Controllo da tastiera
    document.addEventListener('keydown', (e) => {
        if ((e.code === 'Space' || e.key === 'ArrowUp') && !isGameOver) {
            e.preventDefault();
            jump();
        }
    });
    
    // Tocca lo schermo per saltare (mobile)
    document.addEventListener('touchstart', (e) => {
        if (!isGameOver && e.target.id !== 'start-btn' && e.target.id !== 'restart-btn') {
            e.preventDefault();
            jump();
        }
    }, { passive: false });
});
