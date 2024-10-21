import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import SvgStar from './svg-star';
import styles from './HorseshoeModel.module.css';

const HorseshoeModel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const handleScrollRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('Initializing 3D scene');

    // Set up scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1A1917);  // Updated background color
    const camera = new THREE.PerspectiveCamera(75, 390 / 547, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(390, 547);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    console.log('Scene set up complete');

    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    console.log('Lighting set up complete');

    // Set up scroll-based rotation
    let lastScrollY = window.scrollY;
    handleScrollRef.current = () => {
      const scrollDirection = window.scrollY > lastScrollY ? 1 : -1;
      if (modelRef.current) {
        modelRef.current.rotation.y += 0.05 * scrollDirection;
      }
      lastScrollY = window.scrollY;
    };

    // Load the model
    const loader = new GLTFLoader();
    console.log('Attempting to load model from: /models/horseshoe/gltf/Steel_Horseshoe.gltf');
    loader.load(
      '/models/horseshoe/gltf/Steel_Horseshoe.gltf',
      (gltf) => {
        console.log('Model loaded successfully', gltf);
        modelRef.current = gltf.scene;
        scene.add(modelRef.current);
        
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(modelRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.8 / maxDim;  // Increased scale to make the model larger
        modelRef.current.scale.multiplyScalar(scale);
        
        modelRef.current.position.sub(center.multiplyScalar(scale));  // Center the model
        modelRef.current.position.y += 0.2;  // Adjust vertical position slightly
        
        // Position camera to view the entire model
        const distance = 2.3;  // Adjusted camera distance for the larger model
        camera.position.set(distance, distance, distance);
        camera.lookAt(0, 0, 0);

        console.log('Model added to scene and scaled');

        window.addEventListener('scroll', handleScrollRef.current);

        // Animation loop
        const animate = () => {
          requestAnimationFrame(animate);
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

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const width = 390;
      const height = 547;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      console.log('Cleaning up 3D scene');
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScrollRef.current);
    };
  }, []);

  return (
    <div className={`${styles.container} horseshoe-wrapper flex items-center justify-center mt-24`}>
      <div ref={containerRef} className="flex-grow" />
      <div className={`${styles.text} ${styles.textOne} font-default`}>INTERNET TRAILBLAZERS</div>
      <div className={`${styles.text} ${styles.textTwo} font-default`}>OBSESSED WITH</div>
      <div className={`${styles.text} ${styles.textThree} font-default`}>YOUR BRANDS MISSION</div>
      <div className={`${styles.text} ${styles.textFour} font-default`}>BUILT IN HOLLYWOOD</div>
      <div className={styles.star}>
        <SvgStar />
      </div>
    </div>
  );
};

export default HorseshoeModel;
