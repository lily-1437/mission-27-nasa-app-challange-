/**
 * @file main.js
 * Main entry point and bootstrap coordinator for MISSION27.
 */

import { state } from './state.js';
import { audio } from './audio.js';
import { dataLoader } from './nasa.js';
import { StorageManager } from './storage.js';
import { SimulationEconomy } from './economy.js';
import { MiniGameHub } from './minigames.js';
import { EmergencySystem } from './emergencies.js';
import { HandbookUI } from './handbook.js';
import { StoryPlayer } from './story.js';
import { UIManager } from './ui.js';
import { LunarWorld } from './world.js';
import { ProceduralAstronaut } from './astronaut.js';
import { PlayerController } from './player.js';

class Mission27App {
  constructor() {
    this.storage = new StorageManager('slot_1');
    this.economy = new SimulationEconomy(state, audio);
    this.minigames = new MiniGameHub(state);
    this.emergencies = new EmergencySystem(state, this.minigames);
    this.handbook = new HandbookUI(state, dataLoader);
    this.story = new StoryPlayer(state, dataLoader);
    this.ui = new UIManager(state, this.storage, dataLoader, this.minigames, this.emergencies);

    this.world = null;
    this.astronaut = null;
    this.player = null;
    this.lastTime = performance.now();
    this.animationFrameId = null;
  }

  async init() {
    console.log('MISSION27 // Initializing Lunar Outpost Simulation Engine...');

    // Setup custom event listeners
    window.addEventListener('mission27:mount-world', async () => {
      await this.initWorld();
    });

    window.addEventListener('mission27:mount-handbook', (e) => {
      this.handbook.init(e.detail.container);
    });

    state.onScreenChange((from, to) => {
      if (to === 'STORY') {
        const container = document.getElementById('app');
        this.story.play('intro', container);
      } else if (to === 'MOON') {
        this.economy.start();
      } else {
        this.economy.stop();
      }
    });

    // Autosave timer every 30 seconds
    setInterval(() => {
      if (state.screen === 'MOON') {
        this.storage.save(state);
      }
    }, 30000);

    // Initial screen
    state.go('HOME');

    // Start render loop
    this.loop();
  }

  async initWorld() {
    const container = document.getElementById('three-canvas-container');
    if (!container) return;

    if (!this.world) {
      this.world = new LunarWorld(container, dataLoader);
      await this.world.init();

      this.astronaut = new ProceduralAstronaut();
      this.world.scene.add(this.astronaut.group);

      this.player = new PlayerController(this.astronaut, this.world, state);
    }
  }

  loop() {
    this.animationFrameId = requestAnimationFrame(() => this.loop());

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (state.screen === 'MOON' && this.world && this.player) {
      this.player.update(dt);
      this.world.render();
    }
  }
}

// Bootstrap safely whether DOM is already loaded or still loading
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new Mission27App();
    app.init();
  });
} else {
  const app = new Mission27App();
  app.init();
}
