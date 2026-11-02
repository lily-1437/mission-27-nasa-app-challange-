/**
 * @file nasa.js
 * Data loader for NASA & NOAA scientific records with offline fallback.
 */

export class DataLoader {
  constructor() {
    this.cache = new Map();
    this.sourceStatus = 'BUNDLED (OFFLINE READY)';
  }

  async loadJSON(path) {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status} loading ${path}`);
      const data = await response.json();
      this.cache.set(path, data);
      return data;
    } catch (err) {
      console.warn(`Local fetch failed for ${path}, checking fallback:`, err);
      throw err;
    }
  }

  async loadArrayBuffer(path) {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status} loading ${path}`);
      const buf = await response.arrayBuffer();
      this.cache.set(path, buf);
      return buf;
    } catch (err) {
      console.warn(`Local buffer fetch failed for ${path}:`, err);
      throw err;
    }
  }

  async getStormRecord() {
    return this.loadJSON('assets/data/storm-record.json');
  }

  async getEpicData() {
    return this.loadJSON('assets/data/epic-2024-05-10.json');
  }

  async getTerrainMetadata() {
    return this.loadJSON('assets/data/moon-terrain.json');
  }

  async getHandbook() {
    return this.loadJSON('assets/data/handbook.json');
  }

  async getScenarios() {
    return this.loadJSON('assets/data/scenarios.json');
  }

  async getStory() {
    return this.loadJSON('assets/data/story.json');
  }

  async getLocalTerrainElevation() {
    return this.loadArrayBuffer('assets/textures/shackleton-local-h16.bin');
  }
}

export const dataLoader = new DataLoader();
