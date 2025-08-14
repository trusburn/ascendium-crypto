import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const Bitcoin3D = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 400 / 400, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(400, 400);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Create Bitcoin-like shape
    const geometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
    
    // Create material with crypto gold color
    const material = new THREE.MeshPhongMaterial({
      color: 0xf7931e,
      shininess: 100,
      emissive: 0x111111,
    });

    const bitcoin = new THREE.Mesh(geometry, material);
    scene.add(bitcoin);

    // Add Bitcoin symbol (simplified B)
    const textureLoader = new THREE.TextureLoader();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 256;
    
    context.fillStyle = '#f7931e';
    context.fillRect(0, 0, 256, 256);
    context.fillStyle = '#ffffff';
    context.font = 'bold 180px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('₿', 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    const symbolMaterial = new THREE.MeshPhongMaterial({ map: texture });
    const symbolGeometry = new THREE.CylinderGeometry(1.01, 1.01, 0.21, 32);
    const symbol = new THREE.Mesh(symbolGeometry, symbolMaterial);
    scene.add(symbol);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xf7931e, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x3b82f6, 0.8);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);

    camera.position.z = 4;

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      
      bitcoin.rotation.y += 0.01;
      symbol.rotation.y += 0.01;
      
      // Floating animation
      bitcoin.position.y = Math.sin(Date.now() * 0.001) * 0.1;
      symbol.position.y = Math.sin(Date.now() * 0.001) * 0.1;
      
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      symbolMaterial.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="flex items-center justify-center w-[400px] h-[400px] animate-glow-pulse"
    />
  );
};