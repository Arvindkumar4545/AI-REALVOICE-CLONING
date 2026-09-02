import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const CyberBackground3D: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const gridRef = useRef<THREE.LineSegments | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x030712);
    scene.fog = new THREE.Fog(0x030712, 100, 200);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Grid background
    const gridSize = 200;
    const gridDivisions = 40;
    const gridGeometry = new THREE.BufferGeometry();
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.08,
      fog: true,
    });

    const gridVertices = [];
    for (let i = -gridDivisions / 2; i <= gridDivisions / 2; i++) {
      const pos = (i / gridDivisions) * gridSize;
      gridVertices.push(pos, 0, -gridSize / 2, pos, 0, gridSize / 2);
      gridVertices.push(-gridSize / 2, 0, pos, gridSize / 2, 0, pos);
    }
    gridGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gridVertices), 3));
    const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2.5;
    scene.add(grid);
    gridRef.current = grid;

    // Particles (floating security particles)
    const particleCount = 150;
    const particleGeometry = new THREE.BufferGeometry();
    const positionArray = new Float32Array(particleCount * 3);
    const velocityArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positionArray[i] = (Math.random() - 0.5) * 150;
      positionArray[i + 1] = (Math.random() - 0.5) * 100;
      positionArray[i + 2] = (Math.random() - 0.5) * 100;
      velocityArray[i] = (Math.random() - 0.5) * 0.01;
      velocityArray[i + 1] = (Math.random() - 0.5) * 0.01;
      velocityArray[i + 2] = (Math.random() - 0.5) * 0.01;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocityArray, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 0.3,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.4,
      fog: true,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    // Add subtle lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xe2e8f0, 0.8);
    pointLight.position.set(50, 50, 50);
    scene.add(pointLight);

    // Mouse tracking for parallax
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Handle window resize
    const onWindowResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onWindowResize);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Update particles
      const positions = particles.geometry.attributes.position.array as Float32Array;
      const velocities = particles.geometry.attributes.velocity.array as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        // Wrap around
        if (Math.abs(positions[i]) > 75) velocities[i] *= -1;
        if (Math.abs(positions[i + 1]) > 50) velocities[i + 1] *= -1;
        if (Math.abs(positions[i + 2]) > 50) velocities[i + 2] *= -1;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Subtle camera movement based on mouse
      camera.position.x = mouseRef.current.x * 3;
      camera.position.y = mouseRef.current.y * 2;
      camera.lookAt(0, 0, 0);

      // Rotate grid slightly
      if (gridRef.current) {
        gridRef.current.rotation.z += 0.00005;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationId);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 -z-10 ${className}`}
      style={{ pointerEvents: 'none' }}
    />
  );
};
