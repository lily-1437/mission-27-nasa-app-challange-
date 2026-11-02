/**
 * @file story.js
 * Cutscene player and narrative sequence engine for MISSION27.
 */

import { audio } from './audio.js';

export class StoryPlayer {
  constructor(state, dataLoader) {
    this.state = state;
    this.dataLoader = dataLoader;
    this.scenes = [];
    this.currentScene = null;
    this.lineIndex = 0;
    this.container = null;
  }

  async play(sceneId, container) {
    this.container = container;
    this.lineIndex = 0;
    const storyData = await this.dataLoader.getStory();
    this.scenes = storyData.scenes || [];
    this.currentScene = this.scenes.find(s => s.id === sceneId) || this.scenes[0];
    this.render();
  }

  render() {
    if (!this.currentScene) return;
    const line = this.currentScene.lines[this.lineIndex];

    this.container.innerHTML = `
      <div class="panel story-panel">
        <div class="panel-header">
          <h3>${this.currentScene.title}</h3>
          <span class="badge">TRANSMISSION // STEP ${this.lineIndex + 1} OF ${this.currentScene.lines.length}</span>
        </div>

        <div class="speaker-dossier panel mt-16">
          <div class="speaker-avatar">👨‍🚀</div>
          <div class="speaker-meta">
            <span class="speaker-name">${line.speaker}</span>
            <span class="speaker-role mono">${line.role}</span>
          </div>
        </div>

        <div class="dialogue-content mt-16">
          <p class="dialogue-text">${line.text}</p>
          <small class="caption-text text-muted">${line.caption}</small>
        </div>

        <div class="story-actions mt-16">
          <button class="btn btn-outline" id="btn-skip-story">SKIP TRANSMISSION [ESC]</button>
          <button class="btn btn-primary" id="btn-next-story">
            ${this.lineIndex < this.currentScene.lines.length - 1 ? 'NEXT DIALOGUE [SPACE]' : 'PROCEED TO LAUNCH'}
          </button>
        </div>
      </div>
    `;

    audio.playClick();

    this.container.querySelector('#btn-next-story')?.addEventListener('click', () => this.advance());
    this.container.querySelector('#btn-skip-story')?.addEventListener('click', () => this.finish());
  }

  advance() {
    if (this.lineIndex < this.currentScene.lines.length - 1) {
      this.lineIndex++;
      this.render();
    } else {
      this.finish();
    }
  }

  finish() {
    audio.playSuccess();
    const next = this.currentScene?.nextScreen || 'MOON';
    this.state.go(next);
  }
}
