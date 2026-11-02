/**
 * @file ui.js
 * Heads-Up Display (HUD), Cinematic Pixel-Retro Space Homepage,
 * Floating Astronaut Physics, Seamless Video Crossfader, and Routed Pages.
 */

import { audio } from './audio.js';

export class UIManager {
  constructor(state, storageManager, dataLoader, minigameHub, emergencySystem) {
    this.state = state;
    this.storage = storageManager;
    this.dataLoader = dataLoader;
    this.minigames = minigameHub;
    this.emergencies = emergencySystem;

    this.root = document.getElementById('app');
    this.activeModal = null;

    // Homepage State & Animation timers
    this.starsCanvas = null;
    this.starsAnimationId = null;
    this.astronautAnimId = null;
    this.videoCrossfadeTimer = null;
    this.astronautPoseTimer = null;
    this.mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.isMuted = false;

    // Floating Astronaut State
    this.astroState = {
      x: -250,
      y: 100,
      vx: 60,
      vy: 10,
      baseY: 100,
      bobTimer: 0,
      currentPoseIndex: 0,
      isPaused: false,
      pauseTimer: 0,
      hasEntered: false,
      respawnTimer: 0
    };

    this.astroPoses = [
      'front.webp',
      'tq-left.webp',
      'tq-right.webp',
      'side.webp',
      'back.webp',
      'tumble.webp',
      'drift.webp',
      'wave.webp'
    ];

    this.setupListeners();
    this.setupCustomCursor();
    this.setupGlobalParallax();
  }

  getRoot() {
    if (!this.root || !document.body.contains(this.root)) {
      this.root = document.getElementById('app') || document.body;
    }
    return this.root;
  }

  setupListeners() {
    this.state.onScreenChange((from, to) => this.renderScreen(to));
    this.state.onTelemetryUpdate(() => this.updateHUD());

    // Window event listeners for custom triggers
    window.addEventListener('mission27:open-airlock', () => this.showAirlockModal());
    window.addEventListener('mission27:open-epic', () => this.showEpicConsoleModal());
    window.addEventListener('mission27:scan-rock', (e) => this.showRockScanModal(e.detail));
    window.addEventListener('mission27:open-camera', () => this.showCameraModal());

    // Handle Tab & Escape
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' && this.state.screen === 'MOON') {
        e.preventDefault();
        this.toggleOpsConsole();
      } else if (e.code === 'Escape') {
        if (this.activeModal) {
          this.closeModal();
        } else if (this.state.opsConsoleOpen) {
          this.toggleOpsConsole(false);
        } else if (this.state.screen && this.state.screen !== 'HOME') {
          this.state.go('HOME');
        }
      }
    });

    // Handle tab visibility to pause galaxy video
    document.addEventListener('visibilitychange', () => {
      const v1 = document.getElementById('galaxy-video-1');
      const v2 = document.getElementById('galaxy-video-2');
      if (document.hidden) {
        v1?.pause();
        v2?.pause();
      } else {
        v1?.play().catch(() => {});
        v2?.play().catch(() => {});
      }
    });
  }

  setupCustomCursor() {
    let dot = document.querySelector('.custom-cursor-dot');
    let ring = document.querySelector('.custom-cursor-ring');
    if (!dot) {
      dot = document.createElement('div');
      dot.className = 'custom-cursor-dot';
      document.body.appendChild(dot);
    }
    if (!ring) {
      ring = document.createElement('div');
      ring.className = 'custom-cursor-ring';
      document.body.appendChild(ring);
    }

    let ringX = window.innerWidth / 2;
    let ringY = window.innerHeight / 2;
    let firstMove = false;

    window.addEventListener('mousemove', (e) => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;

      if (!firstMove) {
        firstMove = true;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }

      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
    });

    const updateRing = () => {
      if (firstMove) {
        ringX += (this.mousePos.x - ringX) * 0.18;
        ringY += (this.mousePos.y - ringY) * 0.18;
        ring.style.left = `${ringX}px`;
        ring.style.top = `${ringY}px`;
      }
      requestAnimationFrame(updateRing);
    };
    requestAnimationFrame(updateRing);

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('button, a, .home-btn, .next-dest-card, .floating-astronaut-container')) {
        ring.classList.add('cursor-hover');
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('button, a, .home-btn, .next-dest-card, .floating-astronaut-container')) {
        ring.classList.remove('cursor-hover');
      }
    });
  }

  setupGlobalParallax() {
    window.addEventListener('mousemove', (e) => {
      if (window.innerWidth <= 1024 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const normX = (e.clientX / window.innerWidth) - 0.5;
      const normY = (e.clientY / window.innerHeight) - 0.5;

      // Next destination card moves 12px with cursor, planet tilts up to 8° in 3D
      const destCard = document.querySelector('.next-dest-card');
      const marsImg = document.querySelector('.dest-mars-img');
      if (destCard && marsImg) {
        const cardX = normX * 24;
        const cardY = normY * 24;
        destCard.style.transform = `translate(${cardX}px, ${cardY}px)`;
        marsImg.style.transform = `rotateX(${-normY * 16}deg) rotateY(${normX * 16}deg)`;
      }
    });
  }

  renderScreen(screen) {
    // Clear any animation timers from homepage
    this.cleanupHomeAnimations();

    if (screen === 'HOME') {
      this.renderHome();
    } else if (screen === 'TRAINING') {
      this.renderTrainingHub();
    } else if (screen === 'MOON') {
      this.renderMoonHUD();
    } else if (screen === 'REPORT') {
      this.renderReport();
    } else if (['MISSION', 'CONTINUE', 'RESET', 'SETTINGS', 'MARS'].includes(screen)) {
      this.renderBlankRoute(screen);
    }
  }

  cleanupHomeAnimations() {
    if (this.starsAnimationId) cancelAnimationFrame(this.starsAnimationId);
    if (this.astronautAnimId) cancelAnimationFrame(this.astronautAnimId);
    if (this.videoCrossfadeTimer) clearInterval(this.videoCrossfadeTimer);
    if (this.astronautPoseTimer) clearInterval(this.astronautPoseTimer);
  }

  // ================= 1. NO-SCROLL CINEMATIC RETRO HOMEPAGE =================
  renderHome() {
    const hasSave = this.storage.hasSave();
    const saveInfo = this.storage.getSaveInfo();
    const saveTimeDisplay = hasSave
      ? `H${Math.floor(saveInfo.missionHours).toString().padStart(2, '0')}:${Math.floor((saveInfo.missionHours % 1) * 60).toString().padStart(2, '0')}`
      : 'H02:22';

    this.getRoot().innerHTML = `
      <div class="screen screen-home" id="screen-home">
        <!-- Galaxy Seamless Video Crossfade Layer -->
        <div class="galaxy-video-container">
          <video id="galaxy-video-1" class="galaxy-video-elem" autoplay muted loop playsinline poster="assets/textures/moon-regolith-color.jpg">
            <source src="assets/video/galaxy.mp4" type="video/mp4">
          </video>
          <video id="galaxy-video-2" class="galaxy-video-elem" muted loop playsinline style="opacity: 0;">
            <source src="assets/video/galaxy.mp4" type="video/mp4">
          </video>
          <div class="galaxy-void-overlay"></div>
        </div>

        <!-- Twinkling Star Field Canvas -->
        <canvas id="stars-canvas" class="stars-canvas"></canvas>

        <!-- Floating Astronaut Object -->
        <div id="floating-astronaut" class="floating-astronaut-container" aria-label="Floating astronaut" role="button" tabindex="0">
          <div class="astronaut-sprite-wrapper">
            <img id="astronaut-img-current" class="astronaut-pose-img" src="assets/props/front.webp" alt="Astronaut posing">
            <img id="astronaut-img-next" class="astronaut-pose-img" src="assets/props/drift.webp" alt="Astronaut posing" style="opacity: 0;">
          </div>
          <div id="astronaut-speech" class="astronaut-speech-bubble" style="display: none;">Ready to play?</div>
        </div>

        <!-- Top Right Controls (Mute & Settings) -->
        <div class="home-top-right">
          <button class="top-control-btn" id="btn-audio-mute" aria-label="Toggle mute" title="Toggle audio mute">
            <svg id="icon-sound-on" viewBox="0 0 24 24" style="display: ${this.isMuted ? 'none' : 'block'};">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <svg id="icon-sound-off" viewBox="0 0 24 24" style="display: ${this.isMuted ? 'block' : 'none'};">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          </button>

          <button class="top-control-btn" id="btn-open-settings" aria-label="Open settings" title="Open settings">
            <svg viewBox="0 0 24 24">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        </div>

        <!-- Centered Stack (No container panel) -->
        <main class="home-center-stack">
          <div class="home-eyebrow text-shadow-void" id="elem-eyebrow">· A LUNAR OUTPOST / SIMULATOR ·</div>
          <h1 class="home-wordmark text-shadow-void" id="elem-wordmark">MISSION<span class="accent-27">27</span></h1>
          <p class="home-tagline text-shadow-void" id="elem-tagline">Train on Earth. Survive the Moon.</p>

          <nav class="home-menu-buttons" id="elem-menu-buttons">
            <button class="home-btn home-btn-start" id="btn-nav-start" aria-label="Start mission">
              <span class="home-btn-arrow">▶</span>
              <span class="btn-text">START MISSION</span>
            </button>

            <button class="home-btn home-btn-glass" id="btn-nav-training" aria-label="Earth training center">
              <span class="home-btn-arrow">▶</span>
              <span class="btn-text">TRAINING</span>
            </button>

            <button class="home-btn home-btn-glass" id="btn-nav-handbook" aria-label="Astronaut handbook and field notes">
              <span class="home-btn-arrow">▶</span>
              <span class="btn-text">HANDBOOK</span>
            </button>

            <button class="home-btn home-btn-glass home-btn-continue" id="btn-nav-continue" aria-label="Continue saved mission">
              <span class="home-btn-arrow">▶</span>
              <span class="btn-text-left">CONTINUE SAVED MISSION</span>
              <span class="home-btn-timestamp mono">${saveTimeDisplay}</span>
            </button>

            <button class="home-btn home-btn-glass" id="btn-nav-reset" aria-label="Reset save state">
              <span class="home-btn-arrow">▶</span>
              <span class="btn-text">RESET SAVE</span>
            </button>
          </nav>
        </main>

        <!-- Bottom Right: Next Destination Mars Card -->
        <a class="next-dest-card" id="card-next-mars" href="#mars" aria-label="Next destination: Mars (Coming soon)">
          <img class="seated-astronaut-img" src="assets/props/seated-astronaut.png" alt="Seated Astronaut">
          <span class="dest-eyebrow">NEXT DESTINATION</span>
          <div class="dest-planet-wrapper">
            <img class="dest-mars-img" src="assets/props/mars.png" alt="Mars Planet">
          </div>
          <span class="dest-title">MARS</span>
          <span class="dest-subtitle">Coming soon</span>
        </a>
      </div>
    `;

    // 1. Trigger Screen Fade-in over 300ms
    requestAnimationFrame(() => {
      document.getElementById('screen-home')?.classList.add('loaded');
    });

    // 2. Sequential element animations (Eyebrow -> Wordmark -> Tagline -> Buttons -> Astronaut)
    setTimeout(() => document.getElementById('elem-eyebrow')?.classList.add('animate-in'), 80);
    setTimeout(() => document.getElementById('elem-wordmark')?.classList.add('animate-in'), 160);
    setTimeout(() => document.getElementById('elem-tagline')?.classList.add('animate-in'), 240);
    setTimeout(() => document.getElementById('elem-menu-buttons')?.classList.add('animate-in'), 320);
    setTimeout(() => {
      const astro = document.getElementById('floating-astronaut');
      if (astro) astro.classList.add('visible');
    }, 700);

    // 3. Start Starfield Canvas
    this.initStars();

    // 4. Start Floating Astronaut Physics & Poses
    this.initFloatingAstronaut();

    // 5. Start Seamless Video Crossfader
    this.initVideoCrossfader();

    // 6. Bind Menu Button Interactions
    this.bindHomeEvents();

    // 7. Ambient sound setup: start on first user interaction to comply with browser autoplay policy
    const startAudioOnGesture = () => {
      audio.startAmbientHum();
      window.removeEventListener('pointerdown', startAudioOnGesture);
      window.removeEventListener('keydown', startAudioOnGesture);
    };
    window.addEventListener('pointerdown', startAudioOnGesture, { once: true });
    window.addEventListener('keydown', startAudioOnGesture, { once: true });
  }

  initStars() {
    this.starsCanvas = document.getElementById('stars-canvas');
    if (!this.starsCanvas) return;
    const ctx = this.starsCanvas.getContext('2d');
    const width = (this.starsCanvas.width = window.innerWidth);
    const height = (this.starsCanvas.height = window.innerHeight);

    const starCount = 85;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random(),
        speed: Math.random() * 0.02 + 0.008
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        star.alpha += star.speed;
        const brightness = Math.abs(Math.sin(star.alpha));
        ctx.fillStyle = `rgba(207, 224, 255, ${brightness * 0.85})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      this.starsAnimationId = requestAnimationFrame(render);
    };
    render();
  }

  initVideoCrossfader() {
    const v1 = document.getElementById('galaxy-video-1');
    const v2 = document.getElementById('galaxy-video-2');
    if (!v1 || !v2) return;

    v1.play().catch(() => {});
    v2.currentTime = 0;

    let activeVideo = 1;
    // Crossfade every 12 seconds over 0.8s
    this.videoCrossfadeTimer = setInterval(() => {
      if (activeVideo === 1) {
        v2.play().catch(() => {});
        v2.style.opacity = '1';
        v1.style.opacity = '0';
        activeVideo = 2;
      } else {
        v1.play().catch(() => {});
        v1.style.opacity = '1';
        v2.style.opacity = '0';
        activeVideo = 1;
      }
    }, 12000);
  }

  initFloatingAstronaut() {
    const astroEl = document.getElementById('floating-astronaut');
    const imgCurrent = document.getElementById('astronaut-img-current');
    const imgNext = document.getElementById('astronaut-img-next');
    if (!astroEl || !imgCurrent || !imgNext) return;

    // Ordered frames for smooth left-to-right floating sequence (excluding wave, which triggers on click)
    const floatPoses = [
      'drift.webp',
      'tq-right.webp',
      'front.webp',
      'side.webp',
      'tumble.webp',
      'back.webp',
      'tq-left.webp'
    ];

    // Spawn at left middle part of screen
    const spawnFromLeftMiddle = () => {
      const h = window.innerHeight;
      this.astroState.x = -190;
      // Vertically in the middle region (42% to 52% of viewport height)
      this.astroState.baseY = h * 0.46 + (Math.random() - 0.5) * 50;
      this.astroState.y = this.astroState.baseY;
      this.astroState.vx = Math.random() * 15 + 60; // 60-75 px/s smooth float
      this.astroState.vy = (Math.random() - 0.5) * 8; // very gentle vertical drift
      this.astroState.bobTimer = Math.random() * 4;
      this.astroState.isPaused = false;
      this.astroState.respawnTimer = 0;
    };

    spawnFromLeftMiddle();

    // Loop continuously between floating frames every 1.8 seconds (250ms crossfade)
    if (this.astronautPoseTimer) clearInterval(this.astronautPoseTimer);
    this.astronautPoseTimer = setInterval(() => {
      if (this.astroState.isPaused) return;

      this.astroState.currentPoseIndex = (this.astroState.currentPoseIndex + 1) % floatPoses.length;
      const poseName = floatPoses[this.astroState.currentPoseIndex];

      imgNext.src = `assets/props/${poseName}`;
      imgNext.style.opacity = '1';
      imgCurrent.style.opacity = '0';

      setTimeout(() => {
        if (!this.astroState.isPaused) {
          imgCurrent.src = `assets/props/${poseName}`;
          imgCurrent.style.opacity = '1';
          imgNext.style.opacity = '0';
        }
      }, 250);
    }, 1800);

    // When clicked: stop floating, switch immediately to wave pose, play sound & speech bubble
    astroEl.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.playWhoosh();

      this.astroState.isPaused = true;
      imgCurrent.src = 'assets/props/wave.webp';
      imgCurrent.style.opacity = '1';
      imgNext.style.opacity = '0';

      const speech = document.getElementById('astronaut-speech');
      if (speech) speech.style.display = 'block';

      // Wave for 2.5 seconds, then resume floating and looping between frames
      setTimeout(() => {
        if (speech) speech.style.display = 'none';
        this.astroState.isPaused = false;
        
        // Resume with next floating frame
        const nextPose = floatPoses[this.astroState.currentPoseIndex];
        imgCurrent.src = `assets/props/${nextPose}`;
        imgCurrent.style.opacity = '1';
      }, 2500);
    });

    // Spacebar / Enter on astronaut for accessibility
    astroEl.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        astroEl.click();
      }
    });

    let lastT = performance.now();
    const updateAstronaut = (now) => {
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return; // Reduced motion parks astronaut on the right
      }

      if (!this.astroState.isPaused) {
        // Float smoothly from left to right
        this.astroState.x += this.astroState.vx * dt;
        this.astroState.baseY += this.astroState.vy * dt;
        this.astroState.bobTimer += dt;

        // Bob up and down 16px every 3.5s and rock +-7 degrees
        const bobOffset = Math.sin((this.astroState.bobTimer / 3.5) * Math.PI * 2) * 16;
        const rockAngle = Math.sin((this.astroState.bobTimer / 4.0) * Math.PI * 2) * 7;
        const currentY = this.astroState.baseY + bobOffset;

        astroEl.style.transform = `translate(${this.astroState.x}px, ${currentY}px) rotate(${rockAngle}deg)`;

        // When astronaut floats off the right part of the screen, loop back to the left middle
        const screenWidth = window.innerWidth;
        if (this.astroState.x > screenWidth + 190) {
          spawnFromLeftMiddle();
        }
      } else {
        // While paused waving, still allow gentle zero-g floating bob
        this.astroState.bobTimer += dt;
        const bobOffset = Math.sin((this.astroState.bobTimer / 3.5) * Math.PI * 2) * 10;
        const rockAngle = Math.sin((this.astroState.bobTimer / 4.0) * Math.PI * 2) * 4;
        const currentY = this.astroState.baseY + bobOffset;
        astroEl.style.transform = `translate(${this.astroState.x}px, ${currentY}px) rotate(${rockAngle}deg)`;
      }

      this.astronautAnimId = requestAnimationFrame(updateAstronaut);
    };
    this.astronautAnimId = requestAnimationFrame(updateAstronaut);
  }

  bindHomeEvents() {
    // Soft blip on hover for buttons
    document.querySelectorAll('.home-btn, .top-control-btn, .next-dest-card').forEach((btn) => {
      btn.addEventListener('mouseenter', () => audio.playBlip());
    });

    // START MISSION
    document.getElementById('btn-nav-start')?.addEventListener('click', () => {
      audio.playSuccess();
      this.state.missionHoursElapsed = 0;
      this.state.missionTimerActive = true;
      this.state.go('STORY');
    });

    // TRAINING
    document.getElementById('btn-nav-training')?.addEventListener('click', () => {
      audio.playClick();
      this.state.go('TRAINING');
    });

    // HANDBOOK
    document.getElementById('btn-nav-handbook')?.addEventListener('click', () => {
      audio.playClick();
      this.showHandbookModal();
    });

    // CONTINUE SAVED MISSION
    document.getElementById('btn-nav-continue')?.addEventListener('click', () => {
      audio.playClick();
      const saved = this.storage.load();
      if (saved) {
        Object.assign(this.state.resources, saved.resources || {});
        this.state.missionHoursElapsed = saved.missionHours || 0;
        this.state.xp = saved.xp || 0;
        this.state.trainingCompleted = saved.trainingCompleted || this.state.trainingCompleted;
        this.state.missionTimerActive = true;
        this.state.go('MOON');
      } else {
        // Fallback demo launch
        this.state.missionHoursElapsed = 2.37;
        this.state.missionTimerActive = true;
        this.state.go('MOON');
      }
    });

    // RESET SAVE
    document.getElementById('btn-nav-reset')?.addEventListener('click', () => {
      audio.playClick();
      this.showResetConfirmationModal();
    });

    // Next Destination Mars Card
    document.getElementById('card-next-mars')?.addEventListener('click', (e) => {
      e.preventDefault();
      audio.playClick();
      this.state.go('MARS');
    });

    // Mute Toggle Button
    const btnMute = document.getElementById('btn-audio-mute');
    btnMute?.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      audio.setMute(this.isMuted);
      const iconOn = document.getElementById('icon-sound-on');
      const iconOff = document.getElementById('icon-sound-off');
      if (iconOn && iconOff) {
        iconOn.style.display = this.isMuted ? 'none' : 'block';
        iconOff.style.display = this.isMuted ? 'block' : 'none';
      }
    });

    // Settings Button
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      audio.playClick();
      this.state.go('SETTINGS');
    });
  }

  showResetConfirmationModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'reset-modal-backdrop';
    backdrop.innerHTML = `
      <div class="reset-modal-card">
        <h3>RESET SAVE STATE</h3>
        <p>Are you sure you want to completely erase your saved mission progress? This action cannot be undone.</p>
        <div class="reset-modal-actions">
          <button class="home-btn home-btn-glass" id="btn-cancel-reset" style="max-width: 140px;">CANCEL</button>
          <button class="home-btn home-btn-start" id="btn-confirm-reset" style="max-width: 160px; background-color: var(--alert-red); border-color: var(--alert-red);">CONFIRM</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    backdrop.querySelector('#btn-cancel-reset')?.addEventListener('click', () => {
      audio.playClick();
      backdrop.remove();
    });

    backdrop.querySelector('#btn-confirm-reset')?.addEventListener('click', () => {
      audio.playWhoosh();
      this.storage.reset();
      backdrop.remove();
      this.renderHome();
    });
  }

  // ================= BLANK ROUTED PAGES (/mission, /training, /mars, etc) =================
  renderBlankRoute(routeKey) {
    const titleMap = {
      MISSION: 'MISSION LAUNCH',
      TRAINING: 'EARTH TRAINING',
      HANDBOOK: 'ASTRONAUT HANDBOOK',
      CONTINUE: 'CONTINUE MISSION',
      RESET: 'RESET SAVE',
      SETTINGS: 'SIMULATION SETTINGS',
      MARS: 'DESTINATION: MARS'
    };

    const subtitleMap = {
      SETTINGS: 'Audio levels, display resolution, and accessibility overrides.',
      MARS: 'Red planet atmospheric and habitat sim coming in Phase II.',
      MISSION: 'Pre-flight checks and launch countdown initialization.'
    };

    const title = titleMap[routeKey] || routeKey;
    const subtitle = subtitleMap[routeKey] || 'Simulation sub-module initialized.';

    this.getRoot().innerHTML = `
      <div class="screen screen-blank-route">
        <!-- Galaxy Video Backdrop -->
        <div class="galaxy-video-container" style="opacity: 0.5;">
          <video class="galaxy-video-elem" autoplay muted loop playsinline>
            <source src="assets/video/galaxy.mp4" type="video/mp4">
          </video>
          <div class="galaxy-void-overlay"></div>
        </div>

        <button class="route-back-link" id="btn-route-back" aria-label="Return to previous screen">
          <span>← Back</span>
        </button>

        <h2 class="route-page-title">${title}</h2>
        <p class="route-page-subtitle">${subtitle}</p>
      </div>
    `;

    document.getElementById('btn-route-back')?.addEventListener('click', () => {
      audio.playClick();
      this.state.go('HOME');
    });
  }

  // ================= 2. EARTH TRAINING CENTER =================
  renderTrainingHub() {
    const cert = this.state.trainingCompleted;
    const completedCount = Object.values(cert).filter(Boolean).length;

    this.getRoot().innerHTML = `
      <div class="screen screen-training">
        <header class="training-header panel">
          <div>
            <h2>EARTH TRAINING CENTER // SIMULATION LABS</h2>
            <span class="mono text-muted">JOHNSON SPACE CENTER LUNAR ANALOG FACILITY</span>
          </div>
          <div class="header-right">
            <span class="badge ${completedCount === 5 ? 'badge-ok' : 'badge-accent'}">CERTIFIED: ${completedCount} / 5 STATIONS</span>
            <button class="btn btn-outline" id="btn-back-home">RETURN TO HOME [ESC]</button>
          </div>
        </header>

        <div class="training-hub-layout mt-16">
          <div class="stations-grid" id="training-stations-grid">
            <div class="station-card panel" data-station="find_leak">
              <div class="station-icon">💨</div>
              <div class="station-meta">
                <h4>LIFE SUPPORT LAB</h4>
                <p class="mono">"Find the Leak" - Analog pressure gauge cluster & rapid isolation.</p>
              </div>
              <span class="badge ${cert.find_leak ? 'badge-ok' : ''}">${cert.find_leak ? 'CERTIFIED' : 'START LAB'}</span>
            </div>

            <div class="station-card panel" data-station="route_power">
              <div class="station-icon">⚡</div>
              <div class="station-meta">
                <h4>POWER GRID LAB</h4>
                <p class="mono">"Route the Power" - Solar budget allocation (≥4.0 kW Life Support).</p>
              </div>
              <span class="badge ${cert.route_power ? 'badge-ok' : ''}">${cert.route_power ? 'CERTIFIED' : 'START LAB'}</span>
            </div>

            <div class="station-card panel" data-station="radiation_shelter">
              <div class="station-icon">☢️</div>
              <div class="station-meta">
                <h4>RADIATION SAFETY ROOM</h4>
                <p class="mono">"Radiation Shelter" - Rapid storm core evacuation drill.</p>
              </div>
              <span class="badge ${cert.radiation_shelter ? 'badge-ok' : ''}">${cert.radiation_shelter ? 'CERTIFIED' : 'START LAB'}</span>
            </div>

            <div class="station-card panel" data-station="repair_wiring">
              <div class="station-icon">🔌</div>
              <div class="station-meta">
                <h4>REPAIR BENCH</h4>
                <p class="mono">"Repair the Wiring" - Avionics harness impedance port matching.</p>
              </div>
              <span class="badge ${cert.repair_wiring ? 'badge-ok' : ''}">${cert.repair_wiring ? 'CERTIFIED' : 'START LAB'}</span>
            </div>

            <div class="station-card panel" data-station="command_triage">
              <div class="station-icon">⚖️</div>
              <div class="station-meta">
                <h4>COMMAND ROOM</h4>
                <p class="mono">"Command Triage" - Urgency prioritization & crew CRM dilemma.</p>
              </div>
              <span class="badge ${cert.command_triage ? 'badge-ok' : ''}">${cert.command_triage ? 'CERTIFIED' : 'START LAB'}</span>
            </div>
          </div>

          <div class="minigame-mount-point" id="minigame-container">
            <div class="panel placeholder-card">
              <h3>SELECT A TRAINING STATION</h3>
              <p>Master habitat systems, power distribution, and survival protocols before launch.</p>
              ${completedCount === 5 ? `
                <div class="alert alert-success mt-16">
                  <strong>ALL ASTRONAUT CERTIFICATIONS COMPLETE!</strong> Ready for Lunar Outpost deployment.
                  <button class="btn btn-primary mt-16" id="btn-launch-moon">PROCEED TO LUNAR OUTPOST</button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-back-home')?.addEventListener('click', () => {
      audio.playClick();
      this.state.go('HOME');
    });

    document.getElementById('btn-launch-moon')?.addEventListener('click', () => {
      audio.playSuccess();
      this.state.missionHoursElapsed = 0;
      this.state.missionTimerActive = true;
      this.state.go('MOON');
    });

    const container = document.getElementById('minigame-container');
    document.querySelectorAll('.station-card').forEach(card => {
      card.addEventListener('click', () => {
        audio.playClick();
        const station = card.dataset.station;
        if (station === 'find_leak') {
          this.minigames.startFindLeak(container, () => this.renderTrainingHub());
        } else if (station === 'route_power') {
          this.minigames.startRoutePower(container, () => this.renderTrainingHub());
        } else if (station === 'radiation_shelter') {
          this.minigames.startRadiationShelter(container, () => this.renderTrainingHub());
        } else if (station === 'repair_wiring') {
          this.minigames.startRepairWiring(container, () => this.renderTrainingHub());
        } else if (station === 'command_triage') {
          this.minigames.startCommandTriage(container, () => this.renderTrainingHub());
        }
      });
    });
  }

  // ================= 3. IN-GAME 3D OUTPOST HUD =================
  renderMoonHUD() {
    this.getRoot().innerHTML = `
      <div class="screen screen-moon">
        <div id="three-canvas-container" class="canvas-viewport"></div>

        <!-- Emergency Banner Alert -->
        <div id="emergency-banner" class="emergency-banner" style="display: none;">
          <div class="emergency-content">
            <span class="emergency-icon">⚠️</span>
            <span class="emergency-text" id="emergency-text">RAPID DEPRESSURIZATION DETECTED</span>
            <span class="emergency-timer mono" id="emergency-timer">00:35</span>
            <button class="btn btn-primary btn-sm ml-16" id="btn-resolve-emergency">CONTAIN CRISIS</button>
          </div>
        </div>

        <!-- Top Telemetry Bar -->
        <header class="hud-top-bar">
          <div class="hud-clock panel">
            <span class="label">MISSION CLOCK</span>
            <span class="val-mono" id="hud-clock-val">H00:00 / 27:00</span>
          </div>

          <div class="hud-resources panel">
            <!-- 1. Life Support -->
            <div class="resource-block">
              <div class="resource-meta">
                <span class="res-title">LIFE SUPPORT</span>
                <span class="res-val mono" id="val-lifesupport">101.3 kPa | 96% O2</span>
              </div>
              <div class="bar-track"><div class="bar-fill fill-cyan" id="bar-lifesupport" style="width: 96%"></div></div>
            </div>

            <!-- 2. Electrical Power -->
            <div class="resource-block">
              <div class="resource-meta">
                <span class="res-title">ELECTRICAL POWER</span>
                <span class="res-val mono" id="val-power">14.2 kW / 105 kWh</span>
              </div>
              <div class="bar-track"><div class="bar-fill fill-yellow" id="bar-power" style="width: 88%"></div></div>
            </div>

            <!-- 3. Radiation Safety -->
            <div class="resource-block">
              <div class="resource-meta">
                <span class="res-title">RADIATION SAFETY</span>
                <span class="res-val mono" id="val-radiation">0.03 mSv/h | S0</span>
              </div>
              <div class="bar-track"><div class="bar-fill fill-green" id="bar-radiation" style="width: 15%"></div></div>
            </div>

            <!-- 4. Food & Greenhouse -->
            <div class="resource-block">
              <div class="resource-meta">
                <span class="res-title">GREENHOUSE & FOOD</span>
                <span class="res-val mono" id="val-food">95% CROPS | 27 SOLS</span>
              </div>
              <div class="bar-track"><div class="bar-fill fill-green" id="bar-food" style="width: 95%"></div></div>
            </div>

            <!-- 5. Water Recovery -->
            <div class="resource-block">
              <div class="resource-meta">
                <span class="res-title">WATER RECOVERY</span>
                <span class="res-val mono" id="val-water">98.4% LOOP | 450 L</span>
              </div>
              <div class="bar-track"><div class="bar-fill fill-cyan" id="bar-water" style="width: 98%"></div></div>
            </div>
          </div>

          <div class="hud-controls">
            <button class="btn btn-outline btn-sm" id="btn-open-ops">OPS CONSOLE [TAB]</button>
            <button class="btn btn-outline btn-sm" id="btn-pause-menu">MENU [ESC]</button>
          </div>
        </header>

        <!-- Left Objectives Checklist -->
        <aside class="hud-objectives panel">
          <div class="objectives-header">
            <h4>MISSION OBJECTIVES</h4>
            <span class="mono text-muted" id="hud-xp-val">${this.state.xp} XP</span>
          </div>
          <ul class="objectives-list" id="hud-objectives-list">
            ${this.state.objectives.map(obj => `
              <li class="objective-item ${obj.completed ? 'completed' : ''}">
                <span class="chk">${obj.completed ? '✓' : '○'}</span>
                <span class="obj-text">${obj.label}</span>
              </li>
            `).join('')}
          </ul>
        </aside>

        <!-- Proximity Action Prompt -->
        <div id="proximity-prompt" class="proximity-prompt" style="display: none;">
          <div class="prompt-key mono">[E]</div>
          <div class="prompt-text">
            <span class="prompt-label" id="prompt-label">TERMINAL</span>
            <span class="prompt-action" id="prompt-action">USE CONSOLE</span>
          </div>
        </div>

        <!-- Rover Speedometer HUD -->
        <div id="rover-hud" class="rover-hud panel" style="display: none;">
          <div class="rover-title mono">LUNAR ROVING VEHICLE TELEMETRY</div>
          <div class="rover-speed-gauge">
            <span class="speed-val mono" id="rover-speed-val">0.0</span>
            <span class="speed-unit">m/s (W/S)</span>
          </div>
          <div class="rover-battery">BATTERY: <span id="rover-battery-val">98%</span></div>
          <small class="mono text-muted">[ENTER] TO DISMOUNT</small>
        </div>

        <!-- Advanced Operations Console Modal Mount -->
        <div id="ops-console-container" style="display: none;"></div>

        <!-- General Modal Mount -->
        <div id="general-modal-container" style="display: none;"></div>
      </div>
    `;

    document.getElementById('btn-open-ops')?.addEventListener('click', () => this.toggleOpsConsole());
    document.getElementById('btn-pause-menu')?.addEventListener('click', () => this.showPauseMenuModal());
    document.getElementById('btn-resolve-emergency')?.addEventListener('click', () => {
      this.resolveActiveCrisis();
    });

    window.dispatchEvent(new CustomEvent('mission27:mount-world'));
  }

  updateHUD() {
    if (this.state.screen !== 'MOON') return;

    // Clock
    const clockEl = document.getElementById('hud-clock-val');
    if (clockEl) {
      const h = Math.floor(this.state.missionHoursElapsed);
      const m = Math.floor((this.state.missionHoursElapsed % 1) * 60);
      clockEl.textContent = `H${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} / 27:00`;
    }

    // Telemetry bars
    const res = this.state.resources;
    const valLife = document.getElementById('val-lifesupport');
    const barLife = document.getElementById('bar-lifesupport');
    if (valLife && barLife) {
      valLife.textContent = `${res.pressureKpa.toFixed(1)} kPa | ${res.oxygenPct.toFixed(0)}% O2`;
      barLife.style.width = `${Math.min(100, res.oxygenPct)}%`;
      if (res.pressureKpa < 85) barLife.className = 'bar-fill fill-red';
      else barLife.className = 'bar-fill fill-cyan';
    }

    const valPower = document.getElementById('val-power');
    const barPower = document.getElementById('bar-power');
    if (valPower && barPower) {
      valPower.textContent = `${res.powerConsumptionKw.toFixed(1)} kW / ${res.batteryKwh.toFixed(0)} kWh`;
      barPower.style.width = `${(res.batteryKwh / 120) * 100}%`;
    }

    const valRad = document.getElementById('val-radiation');
    const barRad = document.getElementById('bar-radiation');
    if (valRad && barRad) {
      valRad.textContent = `${res.radiationDoseMsvHr.toFixed(2)} mSv/h | ${res.stormThreatScale}`;
      barRad.style.width = `${Math.min(100, res.radiationDoseMsvHr * 25)}%`;
    }

    const valFood = document.getElementById('val-food');
    const barFood = document.getElementById('bar-food');
    if (valFood && barFood) {
      valFood.textContent = `${res.cropHealthPct.toFixed(0)}% CROPS | ${res.foodRationsSols.toFixed(0)} SOLS`;
      barFood.style.width = `${res.cropHealthPct}%`;
    }

    const valWater = document.getElementById('val-water');
    const barWater = document.getElementById('bar-water');
    if (valWater && barWater) {
      valWater.textContent = `${res.waterRecyclingPct.toFixed(1)}% LOOP | ${res.waterReservesLiters.toFixed(0)} L`;
      barWater.style.width = `${res.waterRecyclingPct}%`;
    }

    // Emergency banner
    const bannerEl = document.getElementById('emergency-banner');
    if (bannerEl) {
      if (this.state.activeEmergency) {
        bannerEl.style.display = 'flex';
        document.getElementById('emergency-text').textContent = this.state.activeEmergency.banner;
        document.getElementById('emergency-timer').textContent = `00:${this.state.activeEmergency.timeRemaining.toString().padStart(2, '0')}`;
      } else {
        bannerEl.style.display = 'none';
      }
    }

    // Proximity prompt
    const promptEl = document.getElementById('proximity-prompt');
    if (promptEl) {
      if (this.state.interactionPrompt) {
        promptEl.style.display = 'flex';
        document.getElementById('prompt-label').textContent = this.state.interactionPrompt.label;
        document.getElementById('prompt-action').textContent = this.state.interactionPrompt.actionText;
      } else {
        promptEl.style.display = 'none';
      }
    }

    // Rover HUD
    const roverHudEl = document.getElementById('rover-hud');
    if (roverHudEl) {
      if (this.state.inRover) {
        roverHudEl.style.display = 'block';
        document.getElementById('rover-speed-val').textContent = this.state.roverSpeed.toFixed(1);
        document.getElementById('rover-battery-val').textContent = `${Math.round(this.state.roverBattery)}%`;
      } else {
        roverHudEl.style.display = 'none';
      }
    }

    // Objectives list update
    const objListEl = document.getElementById('hud-objectives-list');
    if (objListEl) {
      objListEl.innerHTML = this.state.objectives.map(obj => `
        <li class="objective-item ${obj.completed ? 'completed' : ''}">
          <span class="chk">${obj.completed ? '✓' : '○'}</span>
          <span class="obj-text">${obj.label}</span>
        </li>
      `).join('');
    }
  }

  // ================= 4. ADVANCED OPERATIONS CONSOLE =================
  toggleOpsConsole(forceState = null) {
    this.state.opsConsoleOpen = forceState !== null ? forceState : !this.state.opsConsoleOpen;
    const container = document.getElementById('ops-console-container');
    if (!container) return;

    if (this.state.opsConsoleOpen) {
      audio.playClick();
      container.style.display = 'block';
      this.renderOpsConsole(container);
    } else {
      container.style.display = 'none';
    }
  }

  renderOpsConsole(container) {
    const tab = this.state.opsConsoleTab;
    container.innerHTML = `
      <div class="modal-backdrop">
        <div class="panel ops-console-window">
          <div class="panel-header">
            <div>
              <h3>ADVANCED OPERATIONS CONSOLE // OUTPOST MAIN BUS</h3>
              <span class="badge badge-accent">TELEMETRY & COMMAND STATION</span>
            </div>
            <button class="btn btn-outline" id="btn-close-ops">CLOSE [ESC / TAB]</button>
          </div>

          <div class="ops-tabs-nav mt-16">
            <button class="ops-tab-btn ${tab === 'telemetry' ? 'active' : ''}" data-tab="telemetry">RESOURCE TELEMETRY</button>
            <button class="ops-tab-btn ${tab === 'protocols' ? 'active' : ''}" data-tab="protocols">RESPONSE PROTOCOLS</button>
            <button class="ops-tab-btn ${tab === 'crew' ? 'active' : ''}" data-tab="crew">CREW STABILITY & ROSTER</button>
            <button class="ops-tab-btn ${tab === 'events' ? 'active' : ''}" data-tab="events">EMERGENCY INDEX & EVENT LOG</button>
          </div>

          <div class="ops-tab-body mt-16" id="ops-body"></div>
        </div>
      </div>
    `;

    container.querySelector('#btn-close-ops')?.addEventListener('click', () => this.toggleOpsConsole(false));
    container.querySelectorAll('.ops-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        audio.playClick();
        this.state.opsConsoleTab = e.target.dataset.tab;
        this.renderOpsConsole(container);
      });
    });

    const bodyEl = container.querySelector('#ops-body');
    if (tab === 'telemetry') this.renderOpsTelemetry(bodyEl);
    else if (tab === 'protocols') this.renderOpsProtocols(bodyEl);
    else if (tab === 'crew') this.renderOpsCrew(bodyEl);
    else if (tab === 'events') this.renderOpsEvents(bodyEl);
  }

  renderOpsTelemetry(el) {
    const res = this.state.resources;
    const alloc = this.state.powerAllocation;

    el.innerHTML = `
      <div class="telemetry-diagnostics-grid">
        <div class="diag-card panel">
          <h4>ATMOSPHERIC MARGINS</h4>
          <div class="row"><span class="label">HABITAT TOTAL PRESSURE</span><span class="val-mono">${res.pressureKpa.toFixed(2)} kPa</span></div>
          <div class="row"><span class="label">O2 FRACTION</span><span class="val-mono">${res.oxygenPct.toFixed(1)}%</span></div>
          <div class="row"><span class="label">CO2 SCRUBBER EFFICIENCY</span><span class="val-mono">${res.co2ScrubberPct.toFixed(1)}%</span></div>
          <div class="row"><span class="label">SABATIER CH4 RECOVERY</span><span class="val-mono">94.2%</span></div>
        </div>

        <div class="diag-card panel">
          <h4>POWER BUS ALLOCATIONS</h4>
          <div class="row"><span class="label">SOLAR GENERATION</span><span class="val-mono">${res.solarGenerationKw.toFixed(1)} kW</span></div>
          <div class="row"><span class="label">TOTAL LOAD DRAW</span><span class="val-mono">${res.powerConsumptionKw.toFixed(1)} kW</span></div>
          <div class="row"><span class="label">ECLSS FLOOR REQUIREMENT</span><span class="val-mono text-cyan">≥ 4.0 kW (Active: ${alloc.lifeSupport.toFixed(1)} kW)</span></div>
          <div class="row"><span class="label">BATTERY STORAGE</span><span class="val-mono">${res.batteryKwh.toFixed(1)} / 120 kWh</span></div>
        </div>

        <div class="diag-card panel">
          <h4>RADIATION & ENVIRONMENT</h4>
          <div class="row"><span class="label">CURRENT DOSE RATE</span><span class="val-mono">${res.radiationDoseMsvHr.toFixed(3)} mSv/h</span></div>
          <div class="row"><span class="label">ACCUMULATED MISSION DOSE</span><span class="val-mono">${res.accumulatedDoseMsv.toFixed(4)} mSv</span></div>
          <div class="row"><span class="label">NOAA STORM SCALE</span><span class="val-mono">${res.stormThreatScale}</span></div>
          <div class="row"><span class="label">EXTERNAL AMBIENT TEMP</span><span class="val-mono">-130°C</span></div>
        </div>

        <div class="diag-card panel">
          <h4>BIOMASS & CLOSED LOOP</h4>
          <div class="row"><span class="label">GREENHOUSE CROP VIGOR</span><span class="val-mono">${res.cropHealthPct.toFixed(1)}%</span></div>
          <div class="row"><span class="label">WATER RECOVERY RATE</span><span class="val-mono">${res.waterRecyclingPct.toFixed(1)}%</span></div>
          <div class="row"><span class="label">POTABLE WATER RESERVES</span><span class="val-mono">${res.waterReservesLiters.toFixed(1)} L</span></div>
          <div class="row"><span class="label">FOOD RATIONS BUFFER</span><span class="val-mono">${res.foodRationsSols.toFixed(0)} Sols</span></div>
        </div>
      </div>
    `;
  }

  renderOpsProtocols(el) {
    el.innerHTML = `
      <div class="protocols-list">
        <div class="protocol-card panel">
          <h4>CRISIS 01: RAPID CABIN DEPRESSURIZATION</h4>
          <p>1. Identify leaking compartment on telemetry gauge cluster.<br>2. Manually isolate module via Emergency Hatch Dogging.<br>3. Verify secondary bulkhead hold at nominal 101.3 kPa.</p>
          <button class="btn btn-outline btn-sm mt-8 btn-trigger-crisis" data-crisis="depressurization">SIMULATE CRISIS</button>
        </div>

        <div class="protocol-card panel">
          <h4>CRISIS 02: SOLAR PARTICLE EVENT (SPE)</h4>
          <p>1. Confirm NOAA SWPC >10 pfu proton event notification.<br>2. Sound base-wide klaxon and sound radiation muster.<br>3. Relocate all personnel to central water-jacketed storm core.</p>
          <button class="btn btn-outline btn-sm mt-8 btn-trigger-crisis" data-crisis="radiation">SIMULATE CRISIS</button>
        </div>

        <div class="protocol-card panel">
          <h4>CRISIS 03: POWER GRID DEFICIT & LOAD SHEDDING</h4>
          <p>1. Shed non-essential horticultural LEDs and comfort heaters.<br>2. Maintain ECLSS blowers and O2 injectors above 4.0 kW absolute floor.<br>3. Connect backup regenerative fuel cell sub-bus.</p>
          <button class="btn btn-outline btn-sm mt-8 btn-trigger-crisis" data-crisis="power">SIMULATE CRISIS</button>
        </div>
      </div>
    `;

    el.querySelectorAll('.btn-trigger-crisis').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const crisis = e.target.dataset.crisis;
        this.toggleOpsConsole(false);
        this.emergencies.triggerEmergency(crisis);
      });
    });
  }

  renderOpsCrew(el) {
    const crew = this.state.crew;
    el.innerHTML = `
      <div class="crew-roster-grid">
        ${Object.values(crew).map(c => `
          <div class="crew-roster-card panel">
            <div class="roster-header">
              <h4>${c.name}</h4>
              <span class="badge badge-accent">${c.role}</span>
            </div>
            <p class="bio-text">${c.bio}</p>
            <div class="roster-vitals mt-8">
              <div class="row"><span class="label">ASSIGNMENT</span><span class="val-mono">${c.assignedModule}</span></div>
              <div class="row"><span class="label">MORALE</span><span class="val-mono">${c.morale}%</span></div>
              <div class="row"><span class="label">HEART RATE</span><span class="val-mono">${c.heartRate} BPM</span></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderOpsEvents(el) {
    const logs = this.state.eventLog;
    el.innerHTML = `
      <div class="event-log-container">
        <table class="event-table">
          <thead>
            <tr>
              <th>TIME</th>
              <th>EVENT</th>
              <th>DETAILS</th>
              <th>SOURCE</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(log => `
              <tr>
                <td class="mono">${log.time}</td>
                <td><strong>${log.event}</strong></td>
                <td>${log.details}</td>
                <td class="mono"><span class="badge">${log.source}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ================= 5. MODALS & INTERFACES =================
  showModal(contentHtml) {
    const container = document.getElementById('general-modal-container') || document.body;
    container.style.display = 'block';
    container.innerHTML = `
      <div class="modal-backdrop">
        <div class="panel modal-window">
          ${contentHtml}
        </div>
      </div>
    `;
    this.activeModal = container;
  }

  closeModal() {
    if (this.activeModal) {
      this.activeModal.style.display = 'none';
      this.activeModal.innerHTML = '';
      this.activeModal = null;
    }
  }

  showAirlockModal() {
    audio.playClick();
    this.showModal(`
      <div class="panel-header">
        <h3>AIRLOCK SUIT VERIFICATION // PRE-EVA CHECKLIST</h3>
        <button class="btn btn-outline" id="btn-close-modal">CANCEL [ESC]</button>
      </div>
      <p class="mt-8">Perform prebreathe verification and PLSS diagnostic check before depressurizing airlock chamber.</p>

      <div class="checklist-box mt-16">
        <label class="chk-label"><input type="checkbox" id="chk-o2" checked> Primary Oxygen Tank Pressure (29.6 kPa / 4.3 psi)</label>
        <label class="chk-label"><input type="checkbox" id="chk-bat" checked> Suit Battery Storage (≥ 90% charge)</label>
        <label class="chk-label"><input type="checkbox" id="chk-cool" checked> Sublimator Water Cooling Loop (Nominal)</label>
        <label class="chk-label"><input type="checkbox" id="chk-co2" checked> Secondary LiOH CO2 Canister & Seal</label>
      </div>

      <div class="modal-actions mt-16">
        <button class="btn btn-primary" id="btn-cycle-airlock">INITIATE AIRLOCK DEPRESSURIZATION</button>
      </div>
    `);

    document.getElementById('btn-close-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-cycle-airlock')?.addEventListener('click', () => {
      audio.playHiss(2.0);
      this.state.completeObjective('airlock_cycle');
      this.state.addEventLog('AIRLOCK CYCLE', 'Chamber depressurized. Outer egress hatch open for lunar EVA.');
      this.closeModal();
    });
  }

  showEpicConsoleModal() {
    audio.playClick();
    this.showModal(`
      <div class="panel-header">
        <div>
          <h3>DSCOVR SATELLITE EARTH OBSERVATION (NASA EPIC)</h3>
          <span class="badge">NASA DATA // 2024-05-10 REAL TELEMETRY</span>
        </div>
        <button class="btn btn-outline" id="btn-close-modal">CLOSE [ESC]</button>
      </div>
      <p class="mt-8">Mission Control asks: "A major flood occurred in Bangladesh (~90°E longitude). Select the EPIC frame where the Indian Ocean region faces the satellite camera."</p>

      <div class="epic-frames-grid mt-16">
        <div class="epic-card panel" data-image="epic_1b_20240510002712">
          <img src="assets/epic/epic_1b_20240510002712.jpg" class="epic-thumb" alt="EPIC frame">
          <div class="epic-meta mono">00:22 UTC | Lon 164.4°E</div>
          <button class="btn btn-outline btn-sm btn-select-epic">SELECT FRAME</button>
        </div>

        <div class="epic-card panel" data-image="epic_1b_20240510040317">
          <img src="assets/epic/epic_1b_20240510040317.jpg" class="epic-thumb" alt="EPIC frame">
          <div class="epic-meta mono">03:58 UTC | Lon 110.3°E</div>
          <button class="btn btn-outline btn-sm btn-select-epic">SELECT FRAME</button>
        </div>

        <div class="epic-card panel" data-image="epic_1b_20240510055119">
          <img src="assets/epic/epic_1b_20240510055119.jpg" class="epic-thumb" alt="EPIC frame">
          <div class="epic-meta mono">05:46 UTC | Lon 83.3°E</div>
          <button class="btn btn-outline btn-sm btn-select-epic">SELECT FRAME</button>
        </div>

        <div class="epic-card panel" data-image="epic_1b_20240510073921">
          <img src="assets/epic/epic_1b_20240510073921.jpg" class="epic-thumb" alt="EPIC frame">
          <div class="epic-meta mono">07:34 UTC | Lon 56.3°E</div>
          <button class="btn btn-outline btn-sm btn-select-epic">SELECT FRAME</button>
        </div>
      </div>

      <div id="epic-feedback" class="game-feedback mt-16"></div>
    `);

    document.getElementById('btn-close-modal')?.addEventListener('click', () => this.closeModal());
    document.querySelectorAll('.btn-select-epic').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.epic-card');
        const imgName = card.dataset.image;
        const fb = document.getElementById('epic-feedback');

        if (imgName === 'epic_1b_20240510055119') {
          audio.playSuccess();
          this.state.xp += 150;
          this.state.addEventLog('EPIC MATCH CONFIRMED', 'Frame epic_1b_20240510055119 matched target longitude (83.3°E vs 90°E).', 'NASA DATA');
          fb.innerHTML = `
            <div class="alert alert-success">
              <strong>EXACT MATCH!</strong> Frame centered at Lon 83.3°E captures the Bay of Bengal & South Asia perfectly.<br>
              <small>NASA DATA: DSCOVR orbits at Lagrange Point L1 (~1.5 million km sunward), transmitting constant full-disc views of Earth.</small>
            </div>
          `;
        } else {
          audio.playAlarm();
          fb.innerHTML = `<div class="alert alert-error">INCORRECT FRAME: This capture is centered over a different meridian. Check the longitude coordinates.</div>`;
        }
      });
    });
  }

  showRockScanModal(detail) {
    audio.playScan();
    let mineralInfo = '';
    if (detail.rockId === 'rock_anorthosite') {
      mineralInfo = 'Mineral: 90% Calc-Plagioclase Feldspar (CaAl2Si2O8). Represents primary lunar crust formed during magma ocean cooling ~4.4 Ga.';
    } else if (detail.rockId === 'rock_basalt') {
      mineralInfo = 'Mineral: Pyroxene, Plagioclase, and Ilmenite (FeTiO3). Volcanic mare flood origin from deep mantle melting.';
    } else {
      mineralInfo = 'Mineral: Polymict impact breccia composed of shock-melted rock and glass beads welded by asteroid impact.';
    }

    this.showModal(`
      <div class="panel-header">
        <div>
          <h3>FIELD GEOLOGY SPECTROMETER // SAMPLE SCAN</h3>
          <span class="badge badge-accent">${detail.rockName}</span>
        </div>
        <button class="btn btn-outline" id="btn-close-modal">CLOSE [ESC]</button>
      </div>

      <div class="scan-visual-box panel mt-16">
        <div class="scan-beam"></div>
        <p class="scan-spec">${mineralInfo}</p>
      </div>

      <div class="modal-actions mt-16">
        <button class="btn btn-primary" id="btn-collect-sample">TRANSFER TO ROVER SAMPLE BIN</button>
      </div>
    `);

    document.getElementById('btn-close-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-collect-sample')?.addEventListener('click', () => {
      audio.playSuccess();
      if (!this.state.collectedSamples.includes(detail.rockId)) {
        this.state.collectedSamples.push(detail.rockId);
        this.state.xp += 100;
        this.state.addEventLog('SAMPLE COLLECTED', `Geological specimen ${detail.rockName} cataloged for laboratory return.`);
        if (this.state.collectedSamples.length >= 3) {
          this.state.completeObjective('rock_samples');
        }
      }
      this.closeModal();
    });
  }

  showCameraModal() {
    audio.playClick();
    this.showModal(`
      <div class="panel-header">
        <h3>EARTHRISE VIEWFINDER CAMERA</h3>
        <button class="btn btn-outline" id="btn-close-modal">EXIT VIEWFINDER [ESC]</button>
      </div>

      <div class="viewfinder-frame mt-16">
        <div class="viewfinder-crosshairs"></div>
        <img src="assets/epic/epic_1b_20240510055119.jpg" class="viewfinder-earth" alt="Earth in viewfinder">
        <div class="viewfinder-readout mono">EXPOSURE: 1/500s | ISO 100 | FOV 42°</div>
      </div>

      <div class="modal-actions mt-16">
        <button class="btn btn-primary" id="btn-snap-photo">SHUTTER SNAPSHOT [SPACE]</button>
      </div>
    `);

    document.getElementById('btn-close-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-snap-photo')?.addEventListener('click', () => {
      audio.playSuccess();
      this.state.capturedPhotos.push('assets/epic/epic_1b_20240510055119.jpg');
      this.state.completeObjective('earth_photo');
      this.state.addEventLog('PHOTOGRAPH CAPTURED', 'Earthrise snapshot archived to mission dossier.');
      this.closeModal();
    });
  }

  showPauseMenuModal() {
    audio.playClick();
    this.showModal(`
      <div class="panel-header">
        <h3>MISSION CONTROL PAUSE MENU</h3>
        <button class="btn btn-outline" id="btn-close-modal">RESUME [ESC]</button>
      </div>

      <div class="menu-actions mt-16">
        <button class="btn btn-primary btn-block" id="btn-pause-resume">RESUME SIMULATION</button>
        <button class="btn btn-outline btn-block" id="btn-pause-handbook">ASTRONAUT HANDBOOK</button>
        <button class="btn btn-outline btn-block" id="btn-pause-save">SAVE MISSION</button>
        <button class="btn btn-outline btn-block text-alert" id="btn-pause-quit">LEAVE TO TITLE SCREEN</button>
      </div>
    `);

    document.getElementById('btn-close-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-pause-resume')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-pause-handbook')?.addEventListener('click', () => {
      this.closeModal();
      this.showHandbookModal();
    });
    document.getElementById('btn-pause-save')?.addEventListener('click', () => {
      audio.playSuccess();
      this.storage.save(this.state);
      this.closeModal();
    });
    document.getElementById('btn-pause-quit')?.addEventListener('click', () => {
      this.storage.save(this.state);
      this.closeModal();
      this.state.go('HOME');
    });
  }

  showHandbookModal() {
    this.showModal(`
      <div id="handbook-mount-point"></div>
    `);
    document.getElementById('btn-close-modal')?.addEventListener('click', () => this.closeModal());
    const mount = document.getElementById('handbook-mount-point');
    window.dispatchEvent(new CustomEvent('mission27:mount-handbook', { detail: { container: mount } }));
  }

  resolveActiveCrisis() {
    if (!this.state.activeEmergency) return;
    const type = this.state.activeEmergency.type;

    this.showModal(`<div id="emergency-containment-mount"></div>`);
    const container = document.getElementById('emergency-containment-mount');

    if (type === 'depressurization') {
      this.minigames.startFindLeak(container, (success) => {
        if (success) this.emergencies.resolveEmergency();
        this.closeModal();
      });
    } else if (type === 'radiation') {
      this.minigames.startRadiationShelter(container, (success) => {
        if (success) this.emergencies.resolveEmergency();
        this.closeModal();
      });
    } else if (type === 'power') {
      this.minigames.startRoutePower(container, (success) => {
        if (success) this.emergencies.resolveEmergency();
        this.closeModal();
      });
    } else {
      this.emergencies.resolveEmergency();
      this.closeModal();
    }
  }

  renderReport() {
    this.getRoot().innerHTML = `
      <div class="screen screen-report">
        <div class="panel report-window">
          <div class="panel-header">
            <h2>MISSION27 // FINAL POST-SIMULATION DEBRIEF</h2>
            <span class="badge badge-ok">SIMULATION CONCLUDED</span>
          </div>

          <div class="report-stats-grid mt-16">
            <div class="stat-card panel">
              <span class="label">MISSION RANK</span>
              <span class="val-mono text-cyan">${this.state.rank}</span>
            </div>
            <div class="stat-card panel">
              <span class="label">TOTAL XP GAINED</span>
              <span class="val-mono">${this.state.xp} XP</span>
            </div>
            <div class="stat-card panel">
              <span class="label">CREW SURVIVAL STATUS</span>
              <span class="val-mono text-ok">100% NOMINAL</span>
            </div>
            <div class="stat-card panel">
              <span class="label">SAMPLES ARCHIVED</span>
              <span class="val-mono">${this.state.collectedSamples.length} / 3 SPECIMENS</span>
            </div>
          </div>

          <div class="panel mt-16">
            <h4>EXECUTIVE SUMMARY</h4>
            <p>The 27-hour Shackleton Rim outpost evaluation demonstrated full life support autonomy, zero critical atmospheric decompression casualties, and successful closed-loop ECLSS recycling. Geological field science yielded vital basalts and anorthosites for lunar origins research.</p>
          </div>

          <div class="actions-row mt-16">
            <button class="btn btn-primary" id="btn-finish-report">RETURN TO TITLE SCREEN</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-finish-report')?.addEventListener('click', () => {
      audio.playClick();
      this.state.go('HOME');
    });
  }
}
