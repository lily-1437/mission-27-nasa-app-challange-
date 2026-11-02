/**
 * @file storage.js
 * Local persistence manager for MISSION27 save slots, telemetry, and progress.
 */

const STORAGE_KEY_PREFIX = 'MISSION27_SAVE_';
const CURRENT_VERSION = 1;

export class StorageManager {
  constructor(slotId = 'slot_1') {
    this.slotId = slotId;
  }

  getStorageKey() {
    return `${STORAGE_KEY_PREFIX}${this.slotId}`;
  }

  /**
   * Checks if a save exists for the current slot.
   * @returns {boolean}
   */
  hasSave() {
    try {
      return localStorage.getItem(this.getStorageKey()) !== null;
    } catch (e) {
      console.warn('Storage check failed:', e);
      return false;
    }
  }

  /**
   * Retrieves summary of the current save slot.
   * @returns {Object|null}
   */
  getSaveInfo() {
    try {
      const dataStr = localStorage.getItem(this.getStorageKey());
      if (!dataStr) return null;
      const data = JSON.parse(dataStr);
      return {
        timestamp: data.savedAt || Date.now(),
        missionHours: data.missionHours ?? 0,
        xp: data.xp ?? 0,
        completedTraining: data.trainingCompleted || [],
        crewMorale: data.crew ? Object.values(data.crew).map(c => c.morale) : [100, 100, 100, 100],
        version: data.version
      };
    } catch (e) {
      console.warn('Failed to parse save info:', e);
      return null;
    }
  }

  /**
   * Saves gameState object to localStorage.
   * @param {Object} state
   * @returns {boolean}
   */
  save(state) {
    try {
      const payload = {
        version: CURRENT_VERSION,
        savedAt: Date.now(),
        missionHours: state.missionHours,
        resources: state.resources,
        crew: state.crew,
        trainingCompleted: state.trainingCompleted,
        objectives: state.objectives,
        eventLog: state.eventLog,
        xp: state.xp,
        playerPos: state.playerPos,
        settings: state.settings
      };
      localStorage.setItem(this.getStorageKey(), JSON.stringify(payload));
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }

  /**
   * Loads saved state.
   * @returns {Object|null}
   */
  load() {
    try {
      const dataStr = localStorage.getItem(this.getStorageKey());
      if (!dataStr) return null;
      const data = JSON.parse(dataStr);
      if (data.version !== CURRENT_VERSION) {
        // migration logic if needed
        data.version = CURRENT_VERSION;
      }
      return data;
    } catch (e) {
      console.error('Load failed:', e);
      return null;
    }
  }

  /**
   * Deletes current save.
   * @returns {boolean}
   */
  reset() {
    try {
      localStorage.removeItem(this.getStorageKey());
      return true;
    } catch (e) {
      console.error('Reset failed:', e);
      return false;
    }
  }
}
