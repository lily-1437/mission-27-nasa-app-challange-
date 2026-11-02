/**
 * @file clock.js
 * Mission Clock controller for MISSION27.
 * Default speed: 1 real second = 4 mission minutes (CONFIG.MISSION_SPEED = 4).
 * Ends at H27:00. Pauses on menus, modals, decisions and training.
 */

export class MissionClock {
  constructor(state) {
    this.state = state;
    this.speed = 4.0; // 1 real second = 4 sim minutes
    this.lastRealTime = performance.now();
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    this.lastRealTime = performance.now();
  }

  pause() {
    this.isRunning = false;
  }

  resume() {
    this.isRunning = true;
    this.lastRealTime = performance.now();
  }

  update(now = performance.now()) {
    if (!this.isRunning || this.state.isPaused || !this.state.missionTimerActive) {
      this.lastRealTime = now;
      return 0;
    }

    const dtRealSec = Math.min((now - this.lastRealTime) / 1000, 0.5);
    this.lastRealTime = now;

    // dt in sim minutes
    const dtSimMinutes = dtRealSec * this.speed;
    const dtSimHours = dtSimMinutes / 60.0;

    this.state.missionHoursElapsed += dtSimHours;

    if (this.state.missionHoursElapsed >= 27.0) {
      this.state.missionHoursElapsed = 27.0;
      this.state.missionTimerActive = false;
      this.pause();
      this.state.addEventLog('MISSION COMPLETE', '27-hour lunar simulation successfully concluded.');
      this.state.go('REPORT');
    }

    return dtSimMinutes;
  }

  getFormattedTime() {
    const totalHours = this.state.missionHoursElapsed || 0;
    const h = Math.floor(totalHours);
    const m = Math.floor((totalHours % 1) * 60);
    return `H${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
