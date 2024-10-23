import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import SvgStar from './svg-star';
import styles from './HorseshoeModel.module.css';

const HorseshoeModel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const baseRotationSpeed = 0.001;
  const rotationSpeedRef = useRef<number>(baseRotationSpeed);
  const lastScrollYRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserInteractingRef = useRef<boolean>(false);
  const autoRotationAngleRef = useRef<number>(0);

  const getDimensions = () => {
    const isMobile = window.innerWidth <= 768;
    return {
      width: isMobile ? 191 : 390,
      height: isMobile ? 268 : 547
    };
  };

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('Initializing 3D scene');

    const dimensions = getDimensions();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1A1917);
    const camera = new THREE.PerspectiveCamera(75, dimensions.width / dimensions.height, 0.1, 1000);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(dimensions.width, dimensions.height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = false;
    controlsRef.current = controls;

    controls.addEventListener('start', () => { isUserInteractingRef.current = true; });
    controls.addEventListener('end', () => { 
      isUserInteractingRef.current = false;
      if (modelRef.current) {
        autoRotationAngleRef.current = modelRef.current.rotation.y;
      }
    });

    console.log('Scene set up complete');

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(1, 1, 1);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);

    console.log('Lighting set up complete');

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - lastScrollYRef.current);
      
      rotationSpeedRef.current = baseRotationSpeed + scrollDelta * 0.0005;
      
      lastScrollYRef.current = currentScrollY;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        rotationSpeedRef.current = baseRotationSpeed;
      }, 200);
    };

    window.addEventListener('scroll', handleScroll);

    const loader = new GLTFLoader();
    console.log('Attempting to load model from: /models/horseshoe/gltf/Steel_Horseshoe.gltf');
    loader.load(
      '/models/horseshoe/gltf/Steel_Horseshoe.gltf',
      (gltf) => {
        console.log('Model loaded successfully', gltf);
        modelRef.current = gltf.scene;
        scene.add(modelRef.current);
        
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.material) {
              child.material.needsUpdate = true;
            }
          }
        });

        const box = new THREE.Box3().setFromObject(modelRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const isMobile = window.innerWidth <= 768;
        const scale = (isMobile ? 2.0 : 2.5) / maxDim; // Smaller scale for mobile
        modelRef.current.scale.multiplyScalar(scale);
        
        modelRef.current.position.sub(center.multiplyScalar(scale));
        modelRef.current.position.y += 0.2;
        
        const distance = isMobile ? 1.5 : 2.0;
        camera.position.set(distance, distance, distance);
        camera.lookAt(0, 0, 0);

        console.log('Model added to scene and scaled');

        const animate = () => {
          requestAnimationFrame(animate);
          if (modelRef.current && !isUserInteractingRef.current) {
            autoRotationAngleRef.current += rotationSpeedRef.current;
            modelRef.current.rotation.y = autoRotationAngleRef.current;
          }
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        console.log('Animation loop started');
      },
      (progress) => {
        console.log(`Loading model... ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
      },
      (error) => {
        console.error('An error occurred loading the model:', error);
      }
    );

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const dimensions = getDimensions();
      cameraRef.current.aspect = dimensions.width / dimensions.height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(dimensions.width, dimensions.height);
      
      if (cameraRef.current && modelRef.current) {
        const isMobile = window.innerWidth <= 768;
        const distance = isMobile ? 1.5 : 2.0;
        cameraRef.current.position.set(distance, distance, distance);
        cameraRef.current.lookAt(0, 0, 0);
      }
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      console.log('Cleaning up 3D scene');
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      controls.removeEventListener('start', () => { isUserInteractingRef.current = true; });
      controls.removeEventListener('end', () => { isUserInteractingRef.current = false; });
      controls.dispose();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!modelRef.current) return;

    switch (e.key) {
      case 'ArrowLeft':
        autoRotationAngleRef.current += 0.1;
        break;
      case 'ArrowRight':
        autoRotationAngleRef.current -= 0.1;
        break;
      case 'ArrowUp':
        modelRef.current.rotation.x += 0.1;
        break;
      case 'ArrowDown':
        modelRef.current.rotation.x -= 0.1;
        break;
    }
  };

  return (
    <div 
      className={`${styles.container} horseshoe-wrapper flex items-center justify-center mt-24 no-bullet-holes light-section`} 
      ref={containerRef}
    >
      <button
        className="w-full h-full focus:outline-none"
        onKeyDown={handleKeyDown}
        aria-label="Interactive 3D horseshoe model. Click and drag to rotate. Use arrow keys for precise rotation."
      />
      <div className={styles.textContainer}>
        <div className={`${styles.text} ${styles.textOne} font-default`}>INTERNET TRAILBLAZERS</div>
        <div className={`${styles.text} ${styles.textTwo} font-default`}>OBSESSED WITH</div>
        <div className={`${styles.text} ${styles.textThree} font-default`}>YOUR BRANDS MISSION</div>
        <div className={`${styles.text} ${styles.textFour} font-default`}>BUILT IN HOLLYWOOD</div>
      </div>
      <div className={styles.star}>
        <SvgStar />
      </div>
    </div>
  );
};

export default HorseshoeModel;
