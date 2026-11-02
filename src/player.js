/**
 * @file player.js
 * Astronaut locomotion, camera controller, rover driving physics, and interaction detection.
 */

import * as THREE from '../lib/three.module.js';
import { calculateSlopeDegrees, getMobilitySpeedMultiplier } from './compute/slope.js';
import { audio } from './audio.js';

export class PlayerController {
  constructor(astronaut, world, state) {
    this.astronaut = astronaut;
    this.world = world;
    this.state = state;

    this.position = new THREE.Vector3(0, 1.5, 12);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.keys = {};

    // Rover controls
    this.roverSteerAngle = 0;
    this.roverSpeed = 0;

    // Camera follow parameters
    this.cameraOffset = new THREE.Vector3(0, 2.5, 5.5);
    this.cameraLookTarget = new THREE.Vector3();

    // Interaction state
    this.currentInteractable = null;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Handle Enter for Rover mount/dismount
      if (e.code === 'Enter') {
        this.toggleRover();
      }

      // Handle E for interaction
      if (e.code === 'KeyE' && this.currentInteractable) {
        this.triggerInteraction(this.currentInteractable);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  toggleRover() {
    const roverPos = this.world.roverObject.position;
    const dist = this.position.distanceTo(roverPos);

    if (this.state.inRover) {
      // Dismount rover
      this.state.inRover = false;
      this.position.set(roverPos.x + 2.5, this.world.getElevationAt(roverPos.x + 2.5, roverPos.z) + 1.2, roverPos.z);
      this.astronaut.group.visible = true;
      audio.playClick();
      this.state.addEventLog('ROVER DISMOUNT', 'Astronaut dismounted Lunar Roving Vehicle.');
    } else if (dist < 4.5) {
      // Mount rover
      this.state.inRover = true;
      this.astronaut.group.visible = false;
      audio.playSuccess();
      this.state.addEventLog('ROVER MOUNT', 'Astronaut mounted Lunar Roving Vehicle. Ready for high-speed traverse.');
      this.state.completeObjective('rover_survey');
    }
  }

  triggerInteraction(target) {
    if (!target) return;
    audio.playClick();

    if (target.id === 'power_console') {
      this.state.opsConsoleOpen = true;
      this.state.opsConsoleTab = 'telemetry';
      this.state.completeObjective('power_check');
    } else if (target.id === 'airlock_hatch') {
      window.dispatchEvent(new CustomEvent('mission27:open-airlock'));
    } else if (target.id === 'greenhouse_hatch') {
      this.state.completeObjective('greenhouse_inspect');
      this.state.addEventLog('GREENHOUSE INSPECTION', 'Crop canopy healthy. Nutrient flow rate 1.4 L/min.');
    } else if (target.id === 'science_console') {
      window.dispatchEvent(new CustomEvent('mission27:open-epic'));
    } else if (target.id.startsWith('rock_')) {
      window.dispatchEvent(new CustomEvent('mission27:scan-rock', { detail: { rockId: target.id, rockName: target.label } }));
    } else if (target.id === 'lunar_rover') {
      this.toggleRover();
    } else if (target.id === 'shackleton_rim') {
      window.dispatchEvent(new CustomEvent('mission27:open-camera'));
    }
  }

  update(dt) {
    if (this.state.isPaused) return;

    if (this.state.inRover) {
      this.updateRover(dt);
    } else {
      this.updateWalking(dt);
    }

    this.checkInteractions();
    this.updateCamera(dt);

    // Sync to state
    this.state.playerPos = {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z
    };
  }

  updateWalking(dt) {
    const forward = (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) - (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
    const turn = (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) - (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);

    // Turn astronaut
    if (turn !== 0) {
      this.yaw -= turn * 2.2 * dt;
      this.astronaut.group.rotation.y = this.yaw;
    }

    // Evaluate terrain slope underfoot
    const sampleDist = 0.5;
    const currentElev = this.world.getElevationAt(this.position.x, this.position.z);
    const aheadX = this.position.x - Math.sin(this.yaw) * sampleDist;
    const aheadZ = this.position.z - Math.cos(this.yaw) * sampleDist;
    const aheadElev = this.world.getElevationAt(aheadX, aheadZ);
    const slopeDeg = calculateSlopeDegrees((aheadElev - currentElev) / sampleDist, 0);
    const speedMult = getMobilitySpeedMultiplier(slopeDeg);

    const isRunning = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const baseSpeed = isRunning ? 6.5 : 3.5;
    const moveSpeed = baseSpeed * speedMult;

    if (forward !== 0) {
      this.position.x -= Math.sin(this.yaw) * forward * moveSpeed * dt;
      this.position.z -= Math.cos(this.yaw) * forward * moveSpeed * dt;

      // Sound footsteps at cadence
      if (Math.random() < 0.08) audio.playFootstep();

      this.astronaut.setAnimation(isRunning ? 'run' : 'walk');
    } else {
      this.astronaut.setAnimation('idle');
    }

    // Clamp within terrain extent
    this.position.x = THREE.MathUtils.clamp(this.position.x, -160, 160);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -160, 160);

    // Follow terrain height
    const groundY = this.world.getElevationAt(this.position.x, this.position.z);
    this.position.y = groundY;

    this.astronaut.group.position.copy(this.position);
    this.astronaut.update(dt);
  }

  updateRover(dt) {
    const rover = this.world.roverObject;
    const forward = (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) - (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
    const steer = (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0) - (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0);

    // Acceleration & Braking
    if (forward > 0) {
      this.roverSpeed = Math.min(14.0, this.roverSpeed + 7.0 * dt);
    } else if (forward < 0) {
      this.roverSpeed = Math.max(-6.0, this.roverSpeed - 5.0 * dt);
    } else {
      this.roverSpeed *= 0.95; // regolith rolling resistance
    }

    // Steering
    if (steer !== 0 && Math.abs(this.roverSpeed) > 0.1) {
      const dir = this.roverSpeed >= 0 ? 1 : -1;
      rover.rotation.y += steer * 1.8 * dir * dt;
    }

    // Movement vector
    rover.translateZ(this.roverSpeed * dt);

    // Snap to terrain
    rover.position.x = THREE.MathUtils.clamp(rover.position.x, -160, 160);
    rover.position.z = THREE.MathUtils.clamp(rover.position.z, -160, 160);
    rover.position.y = this.world.getElevationAt(rover.position.x, rover.position.z);

    this.position.copy(rover.position);
    this.yaw = rover.rotation.y;

    // Update rover battery telemetry
    this.state.roverSpeed = Math.abs(this.roverSpeed);
    if (this.state.roverSpeed > 0.5) {
      this.state.roverBattery = Math.max(0, this.state.roverBattery - 0.01 * dt);
    }
  }

  checkInteractions() {
    let closest = null;
    let minDistance = Infinity;

    for (const item of this.world.interactables) {
      const dist = this.position.distanceTo(item.pos);
      if (dist < item.range && dist < minDistance) {
        minDistance = dist;
        closest = item;
      }
    }

    this.currentInteractable = closest;
    if (closest) {
      this.state.interactionPrompt = {
        label: closest.label,
        actionKey: 'E',
        actionText: closest.action
      };
    } else {
      this.state.interactionPrompt = null;
    }
  }

  updateCamera(dt) {
    const target = this.state.inRover ? this.world.roverObject.position : this.position;
    const rotY = this.state.inRover ? this.world.roverObject.rotation.y : this.yaw;

    const offsetRotated = this.cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const desiredCameraPos = target.clone().add(offsetRotated);

    // Smooth camera lag
    this.world.camera.position.lerp(desiredCameraPos, 0.1);

    this.cameraLookTarget.copy(target).add(new THREE.Vector3(0, 1.4, 0));
    this.world.camera.lookAt(this.cameraLookTarget);
  }
}
