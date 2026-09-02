/**
 * LiveShield3D Component
 * Animated 3D blob visualization for real-time risk scoring.
 * Color: GREEN -> ORANGE -> RED
 * Animation: Scale, pulse, and rotation based on risk level
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface LiveShield3DProps {
  riskScore: number; // 0-1
  isAnimating: boolean;
  size?: number;
}

export const LiveShield3D: React.FC<LiveShield3DProps> = ({
  riskScore,
  isAnimating,
  size = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const blobRef = useRef<THREE.Mesh | null>(null);
  const animationIdRef = useRef<number | null>(null);

  const getRiskColor = (risk: number): [number, number, number] => {
    if (risk < 0.35) {
      // Green
      return [0.06, 0.72, 0.5];
    } else if (risk < 0.65) {
      // Orange (interpolate)
      const t = (risk - 0.35) / (0.65 - 0.35);
      return [0.96, 0.62 + t * 0.1, 0.04];
    } else {
      // Red
      return [0.93, 0.27, 0.27];
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 3.5;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Create lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x06b6d4, 1.5);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Create icosahedron blob
    const geometry = new THREE.IcosahedronGeometry(1.2, 3);
    const [r, g, b] = getRiskColor(riskScore);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(r, g, b),
      roughness: 0.3,
      metalness: 0.7,
      wireframe: true,
      emissive: new THREE.Color(r * 0.5, g * 0.5, b * 0.5),
    });

    const blob = new THREE.Mesh(geometry, material);
    scene.add(blob);
    blobRef.current = blob;

    // Animation loop
    let clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      if (blobRef.current) {
        blobRef.current.rotation.y = time * 0.5;
        blobRef.current.rotation.x = Math.sin(time * 0.3) * 0.2;
        const scale = 1.0 + Math.sin(time * 2) * (isAnimating ? 0.08 : 0.02);
        blobRef.current.scale.set(scale, scale, scale);
      }
      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
        rendererRef.current.domElement.remove();
      }
    };
  }, [size]);

  useEffect(() => {
    if (blobRef.current) {
      const [r, g, b] = getRiskColor(riskScore);
      const mat = blobRef.current.material as THREE.MeshStandardMaterial;
      mat.color.setRGB(r, g, b);
      mat.emissive.setRGB(r * 0.5, g * 0.5, b * 0.5);
    }
  }, [riskScore]);

  const [r, g, b] = getRiskColor(riskScore);

  return (
    <div className="flex flex-col items-center justify-center">
      <div ref={containerRef} style={{ width: size, height: size }} />
      <div className="mt-4 text-center">
        <p className="text-xs text-slate-400 mb-1 font-mono uppercase tracking-wider">Live Security State</p>
        <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{
              backgroundColor: `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`,
              boxShadow: `0 0 10px rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.8)`,
            }}
          />
          <span className="text-sm font-mono font-bold text-white">
            {(riskScore * 100).toFixed(1)}% Risk
          </span>
        </div>
      </div>
    </div>
  );
};
