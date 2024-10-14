import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SmokeEffectProps {
  duration: number;
}

class Smoke {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;
  smokeParticles: THREE.Mesh[];
  isActive: boolean;

  constructor(container: HTMLElement, duration: number) {
    console.log('Initializing Smoke effect', { duration });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.camera.position.z = 100;
    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.renderer.setSize(100, 100);
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.smokeParticles = [];
    this.isActive = true;

    this.init();
    this.animate();

    setTimeout(() => {
      console.log('Deactivating Smoke effect');
      this.isActive = false;
    }, duration);
  }

  init() {
    const light = new THREE.DirectionalLight(0xffffff, 0.75);
    light.position.set(-1, 0, 1);
    this.scene.add(light);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/images/smoke.png', 
      (texture: THREE.Texture) => {
        console.log('Smoke texture loaded successfully');
        const smokeMaterial = new THREE.MeshLambertMaterial({
          color: 0xffffff,  // Changed to white
          map: texture,
          transparent: true,
          opacity: 0.9  // Increased opacity for better visibility
        });
        const smokeGeometry = new THREE.PlaneGeometry(50, 50);

        for (let i = 0; i < 50; i++) {
          const particle = new THREE.Mesh(smokeGeometry, smokeMaterial.clone());
          particle.position.set(
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50
          );
          particle.rotation.z = Math.random() * Math.PI * 2;
          particle.scale.set(0.1 + Math.random() * 0.3, 0.1 + Math.random() * 0.3, 0.1);
          this.smokeParticles.push(particle);
          this.scene.add(particle);
        }
        console.log(`Created ${this.smokeParticles.length} smoke particles`);
      },
      undefined,
      (error) => {
        console.error('Error loading smoke texture:', error);
      }
    );
  }

  evolveSmoke(delta: number) {
    this.smokeParticles.forEach((particle) => {
      particle.rotation.z += delta * 0.2;
      const direction = new THREE.Vector3().copy(particle.position).normalize();
      particle.position.addScaledVector(direction, delta * 10);
      const material = particle.material as THREE.MeshLambertMaterial;
      material.opacity -= delta * 0.2;
      if (material.opacity < 0) material.opacity = 0;
      particle.scale.addScalar(delta * 0.5);
    });
  }

  animate() {
    if (!this.isActive) {
      console.log('Smoke effect animation stopped');
      return;
    }

    requestAnimationFrame(this.animate.bind(this));

    this.evolveSmoke(this.clock.getDelta());
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.isActive = false;
    this.renderer.dispose();
    this.smokeParticles.forEach(particle => {
      this.scene.remove(particle);
      (particle.material as THREE.Material).dispose();
      (particle.geometry as THREE.BufferGeometry).dispose();
    });
    this.smokeParticles = [];
    console.log('Smoke effect disposed');
  }
}

const SmokeEffect: React.FC<SmokeEffectProps> = ({ duration }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const smokeRef = useRef<Smoke | null>(null);

  useEffect(() => {
    console.log('SmokeEffect component mounted', { duration });
    if (containerRef.current && !smokeRef.current) {
      smokeRef.current = new Smoke(containerRef.current, duration);
    }

    return () => {
      if (smokeRef.current) {
        smokeRef.current.dispose();
        smokeRef.current = null;
      }
      console.log('SmokeEffect component unmounted');
    };
  }, [duration]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100px', 
        height: '100px',
        pointerEvents: 'none',
      }} 
    />
  );
};

export default React.memo(SmokeEffect);
