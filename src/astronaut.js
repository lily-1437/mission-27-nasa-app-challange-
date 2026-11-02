/**
 * @file astronaut.js
 * Procedural 3D astronaut character with xEMU spacesuit, PLSS backpack, and animations.
 */

import * as THREE from '../lib/three.module.js';

export class ProceduralAstronaut {
  constructor() {
    this.group = new THREE.Group();
    this.currentAnim = 'idle';
    this.animTime = 0;

    this.head = null;
    this.visor = null;
    this.torso = null;
    this.leftArm = null;
    this.rightArm = null;
    this.leftLeg = null;
    this.rightLeg = null;
    this.plss = null; // Portable Life Support System backpack

    this.buildModel();
  }

  buildModel() {
    // Suit materials
    const suitWhite = new THREE.MeshStandardMaterial({
      color: 0xE8E8E6,
      roughness: 0.6,
      metalness: 0.1
    });

    const suitJoints = new THREE.MeshStandardMaterial({
      color: 0x333336,
      roughness: 0.8
    });

    const visorGold = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      roughness: 0.1,
      metalness: 0.95,
      envMapIntensity: 1.5
    });

    const accentCyan = new THREE.MeshStandardMaterial({
      color: 0x00BFCF,
      roughness: 0.3
    });

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.38);
    this.torso = new THREE.Mesh(torsoGeo, suitWhite);
    this.torso.position.y = 1.05;
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.group.add(this.torso);

    // Chest control unit (DCM - Display & Control Module)
    const dcmGeo = new THREE.BoxGeometry(0.28, 0.22, 0.08);
    const dcm = new THREE.Mesh(dcmGeo, accentCyan);
    dcm.position.set(0, 0.08, 0.22);
    this.torso.add(dcm);

    // 2. PLSS Backpack
    const plssGeo = new THREE.BoxGeometry(0.48, 0.65, 0.26);
    this.plss = new THREE.Mesh(plssGeo, suitWhite);
    this.plss.position.set(0, 0.05, -0.28);
    this.plss.castShadow = true;
    this.torso.add(this.plss);

    // O2 cylinders on top of PLSS
    const o2Geo = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 12);
    const o2Mat = new THREE.MeshStandardMaterial({ color: 0x8C8B88, metalness: 0.5, roughness: 0.4 });
    const o2L = new THREE.Mesh(o2Geo, o2Mat);
    o2L.position.set(-0.14, 0.3, 0);
    const o2R = new THREE.Mesh(o2Geo, o2Mat);
    o2R.position.set(0.14, 0.3, 0);
    this.plss.add(o2L);
    this.plss.add(o2R);

    // 3. Head & Visor
    this.head = new THREE.Group();
    this.head.position.set(0, 0.48, 0);

    const helmetGeo = new THREE.SphereGeometry(0.26, 16, 16);
    const helmet = new THREE.Mesh(helmetGeo, suitWhite);
    this.head.add(helmet);

    // Gold protective visor
    const visorGeo = new THREE.SphereGeometry(0.22, 16, 16, 0, Math.PI, 0, Math.PI * 0.7);
    this.visor = new THREE.Mesh(visorGeo, visorGold);
    this.visor.rotation.x = Math.PI * 0.15;
    this.visor.position.set(0, 0.02, 0.08);
    this.head.add(this.visor);
    this.torso.add(this.head);

    // 4. Arms
    const armGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.5, 12);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.35, 0.25, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, suitWhite);
    leftArmMesh.position.y = -0.25;
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);
    this.torso.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.35, 0.25, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, suitWhite);
    rightArmMesh.position.y = -0.25;
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);
    this.torso.add(this.rightArm);

    // 5. Legs
    const legGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.65, 12);

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, -0.35, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, suitWhite);
    leftLegMesh.position.y = -0.32;
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);

    // Boot
    const bootGeo = new THREE.BoxGeometry(0.16, 0.12, 0.28);
    const leftBoot = new THREE.Mesh(bootGeo, suitJoints);
    leftBoot.position.set(0, -0.65, 0.06);
    this.leftLeg.add(leftBoot);
    this.torso.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, -0.35, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, suitWhite);
    rightLegMesh.position.y = -0.32;
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);

    const rightBoot = new THREE.Mesh(bootGeo, suitJoints);
    rightBoot.position.set(0, -0.65, 0.06);
    this.rightLeg.add(rightBoot);
    this.torso.add(this.rightLeg);
  }

  setAnimation(animName) {
    if (this.currentAnim !== animName) {
      this.currentAnim = animName;
      this.animTime = 0;
    }
  }

  update(dt) {
    this.animTime += dt;

    if (this.currentAnim === 'idle') {
      // Gentle breathing & weight shift
      const bob = Math.sin(this.animTime * 1.5) * 0.02;
      this.torso.position.y = 1.05 + bob;
      this.leftArm.rotation.x = Math.sin(this.animTime * 1.5) * 0.05;
      this.rightArm.rotation.x = -Math.sin(this.animTime * 1.5) * 0.05;
      this.leftArm.rotation.z = -0.1;
      this.rightArm.rotation.z = 0.1;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    } else if (this.currentAnim === 'walk' || this.currentAnim === 'run') {
      // Floatier low-gravity lunar lope
      const speed = this.currentAnim === 'run' ? 6.5 : 4.0;
      const swing = Math.sin(this.animTime * speed);
      const bob = Math.abs(Math.cos(this.animTime * speed)) * 0.08;

      this.torso.position.y = 1.05 + bob;
      this.leftLeg.rotation.x = swing * 0.45;
      this.rightLeg.rotation.x = -swing * 0.45;
      this.leftArm.rotation.x = -swing * 0.4;
      this.rightArm.rotation.x = swing * 0.4;
    } else if (this.currentAnim === 'wave') {
      this.rightArm.rotation.z = 1.8 + Math.sin(this.animTime * 8) * 0.3;
      this.rightArm.rotation.x = 0.2;
    }
  }

  lookAt(targetX, targetY) {
    if (!this.head) return;
    this.head.rotation.y = THREE.MathUtils.clamp(targetX * 0.6, -0.8, 0.8);
    this.head.rotation.x = THREE.MathUtils.clamp(-targetY * 0.4, -0.4, 0.4);
  }
}
