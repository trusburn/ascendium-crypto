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

    // Create standing Bitcoin coin
    const geometry = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 64);
    geometry.rotateX(0); // Keep it standing upright
    
    // Create material with crypto gold color and metallic appearance
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
    canvas.width = 512;
    canvas.height = 512;
    
    // Create gradient background
    const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#f7931e');
    gradient.addColorStop(1, '#d4761a');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    
    // Add Bitcoin symbol
    context.fillStyle = '#ffffff';
    context.font = 'bold 380px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('₿', 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    const symbolMaterial = new THREE.MeshPhongMaterial({ 
      map: texture,
      transparent: true,
      opacity: 1,
    });
    
    // Front face
    const frontGeometry = new THREE.CylinderGeometry(1.21, 1.21, 0.31, 64);
    const frontSymbol = new THREE.Mesh(frontGeometry, symbolMaterial);
    scene.add(frontSymbol);
    
    // Back face (rotated)
    const backGeometry = new THREE.CylinderGeometry(1.21, 1.21, 0.31, 64);
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

    // Animation - standing and rolling
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Rolling rotation around Y-axis
      bitcoin.rotation.y += 0.015;
      frontSymbol.rotation.y += 0.015;
      backSymbol.rotation.y += 0.015;
      
      // Gentle floating animation while standing
      const floatOffset = Math.sin(Date.now() * 0.002) * 0.08;
      bitcoin.position.y = floatOffset;
      frontSymbol.position.y = floatOffset;
      backSymbol.position.y = floatOffset;
      
      // Subtle wobble for realism
      const wobble = Math.sin(Date.now() * 0.003) * 0.02;
      bitcoin.rotation.z = wobble;
      frontSymbol.rotation.z = wobble;
      backSymbol.rotation.z = wobble;
      
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
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
      className="flex items-center justify-center w-full max-w-[400px] h-[300px] sm:h-[400px] mx-auto"
      style={{
        filter: 'drop-shadow(0 0 20px rgba(247, 147, 30, 0.5))',
      }}
    />
  );
};