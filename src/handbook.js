/**
 * @file handbook.js
 * Astronaut Handbook & Field Notes viewer module.
 */

import { audio } from './audio.js';

export class HandbookUI {
  constructor(state, dataLoader) {
    this.state = state;
    this.dataLoader = dataLoader;
    this.handbookData = null;
    this.activeCategory = 'physics';
  }

  async init(container) {
    if (!this.handbookData) {
      try {
        this.handbookData = await this.dataLoader.getHandbook();
      } catch (e) {
        console.error('Failed to load handbook data:', e);
      }
    }
    this.render(container);
  }

  render(container) {
    if (!this.handbookData) {
      container.innerHTML = '<div class="panel">Loading Handbook Codex...</div>';
      return;
    }

    const categories = this.handbookData.categories || [];
    const currentCat = categories.find(c => c.id === this.activeCategory) || categories[0];

    container.innerHTML = `
      <div class="panel handbook-container">
        <div class="panel-header">
          <div>
            <h2>ASTRONAUT HANDBOOK & FIELD NOTES</h2>
            <span class="badge badge-accent">NASA DATA & SIMULATION REFERENCE CODEX</span>
          </div>
          <button class="btn btn-outline" id="btn-handbook-close">BACK / CLOSE [ESC]</button>
        </div>

        <div class="handbook-body">
          <div class="handbook-sidebar">
            ${categories.map(cat => `
              <button class="handbook-nav-btn ${cat.id === this.activeCategory ? 'active' : ''}" data-cat="${cat.id}">
                ${cat.name}
              </button>
            `).join('')}
          </div>

          <div class="handbook-content">
            <h3 class="category-heading">${currentCat.name}</h3>
            <div class="articles-list">
              ${(currentCat.articles || []).map(art => `
                <div class="article-card panel">
                  <div class="article-header">
                    <h4>${art.title}</h4>
                    <span class="badge">${art.tag}</span>
                  </div>
                  <p class="article-text">${art.content}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="panel-footer mt-16">
          <small class="text-muted">Source: NASA Technical Reports Server (NTRS), Apollo Lunar Surface Journal, NOAA SWPC. Not an official NASA product.</small>
        </div>
      </div>
    `;

    container.querySelectorAll('.handbook-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        audio.playClick();
        this.activeCategory = e.currentTarget.dataset.cat;
        this.render(container);
      });
    });

    container.querySelector('#btn-handbook-close')?.addEventListener('click', () => {
      audio.playClick();
      this.state.goBack();
    });
  }
}
