import { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';

export const Bitcoin3D = memo(() => {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameIdRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 400 / 400, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: 'high-performance',
    });
    
    renderer.setSize(400, 400);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Create standing Bitcoin coin
    const geometry = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 32); // Reduced segments from 64 to 32
    geometry.rotateX(0);
    
    const material = new THREE.MeshPhongMaterial({
      color: 0xf7931e,
      shininess: 100,
      emissive: 0x222222,
      transparent: true,
      opacity: 0.95,
    });

    const bitcoin = new THREE.Mesh(geometry, material);
    scene.add(bitcoin);

    // Add Bitcoin symbol on both sides
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256; // Reduced from 512 for performance
    canvas.height = 256;
    
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, '#f7931e');
    gradient.addColorStop(1, '#d4761a');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    
    context.fillStyle = '#ffffff';
    context.font = 'bold 190px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('₿', 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    const symbolMaterial = new THREE.MeshPhongMaterial({ 
      map: texture,
      transparent: true,
      opacity: 1,
    });
    
    const frontGeometry = new THREE.CylinderGeometry(1.21, 1.21, 0.31, 32);
    const frontSymbol = new THREE.Mesh(frontGeometry, symbolMaterial);
    scene.add(frontSymbol);
    
    const backGeometry = new THREE.CylinderGeometry(1.21, 1.21, 0.31, 32);
    const backSymbol = new THREE.Mesh(backGeometry, symbolMaterial);
    backSymbol.rotation.y = Math.PI;
    scene.add(backSymbol);

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

    // Throttled animation loop - target 30fps for smoother performance
    let lastTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    
    const animate = (currentTime: number) => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      const deltaTime = currentTime - lastTime;
      if (deltaTime < frameInterval) return;
      
      lastTime = currentTime - (deltaTime % frameInterval);
      
      // Slower, smoother rotation
      const rotationSpeed = 0.008;
      bitcoin.rotation.y += rotationSpeed;
      frontSymbol.rotation.y += rotationSpeed;
      backSymbol.rotation.y += rotationSpeed;
      
      // Gentle floating animation
      const floatOffset = Math.sin(currentTime * 0.001) * 0.06;
      bitcoin.position.y = floatOffset;
      frontSymbol.position.y = floatOffset;
      backSymbol.position.y = floatOffset;
      
      // Subtle wobble
      const wobble = Math.sin(currentTime * 0.0015) * 0.015;
      bitcoin.rotation.z = wobble;
      frontSymbol.rotation.z = wobble;
      backSymbol.rotation.z = wobble;
      
      renderer.render(scene, camera);
    };

    frameIdRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      frontGeometry.dispose();
      backGeometry.dispose();
      material.dispose();
      symbolMaterial.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="flex items-center justify-center w-full max-w-[400px] h-[300px] sm:h-[400px] mx-auto gpu-accelerated"
      style={{
        filter: 'drop-shadow(0 0 20px rgba(247, 147, 30, 0.5))',
      }}
    />
  );
});

Bitcoin3D.displayName = 'Bitcoin3D';
