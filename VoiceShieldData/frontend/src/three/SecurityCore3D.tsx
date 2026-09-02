import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface SecurityCoreProps {
  isAnalyzing?: boolean;
  riskScore?: number; // 0 to 100
  threatLevel?: 'SAFE' | 'SUSPICIOUS' | 'CRITICAL';
}

function ProceduralParticles({ count = 160, color = '#22D3EE' }: { count?: number; color?: string }) {
  const pointsRef = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 2.4 + Math.random() * 1.8;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    pointsRef.current.rotation.y = time * 0.06;
    pointsRef.current.rotation.x = Math.sin(time * 0.03) * 0.15;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={color}
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function CoreObject({ isAnalyzing = false, riskScore = 0 }: SecurityCoreProps) {
  const outerRingRef = useRef<THREE.Mesh>(null!);
  const midRingRef = useRef<THREE.Mesh>(null!);
  const innerSphereRef = useRef<THREE.Mesh>(null!);
  const waveformGridRef = useRef<THREE.Mesh>(null!);
  const pulseRingRef = useRef<THREE.Mesh>(null!);

  const coreColor = useMemo(() => {
    if (riskScore >= 70) return { main: '#EF4444', glow: '#F87171', accent: '#FCA5A5' };
    if (riskScore >= 40) return { main: '#F59E0B', glow: '#FBBF24', accent: '#FDE68A' };
    return { main: '#22D3EE', glow: '#38BDF8', accent: '#818CF8' };
  }, [riskScore]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const speed = isAnalyzing ? 1.6 : 0.8;

    outerRingRef.current.rotation.x = time * 0.22 * speed;
    outerRingRef.current.rotation.y = time * 0.3 * speed;

    midRingRef.current.rotation.y = -time * 0.38 * speed;
    midRingRef.current.rotation.z = Math.sin(time * 0.5) * 0.3;

    waveformGridRef.current.rotation.y = time * 0.12 * speed;
    waveformGridRef.current.rotation.x = Math.sin(time * 0.2) * 0.18;
    pulseRingRef.current.rotation.x = time * 0.18;
    pulseRingRef.current.rotation.z = time * 0.26;

    const pulse = 1.0 + Math.sin(time * (isAnalyzing ? 4.8 : 2.2)) * 0.05;
    innerSphereRef.current.scale.set(pulse, pulse, pulse);

    const targetX = state.pointer.x * 0.35;
    const targetY = state.pointer.y * 0.35;
    outerRingRef.current.position.x = THREE.MathUtils.lerp(outerRingRef.current.position.x, targetX, 0.04);
    outerRingRef.current.position.y = THREE.MathUtils.lerp(outerRingRef.current.position.y, targetY, 0.04);
  });

  return (
    <group>
      {/* Outer Waveform Grid Sphere */}
      <mesh ref={waveformGridRef}>
        <sphereGeometry args={[2.08, 18, 18]} />
        <meshStandardMaterial
          color={coreColor.main}
          wireframe
          transparent
          opacity={0.22}
          emissive={coreColor.main}
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Pulse Outer Torus */}
      <mesh ref={pulseRingRef}>
        <torusGeometry args={[2.72, 0.014, 10, 120]} />
        <meshStandardMaterial
          color={coreColor.accent}
          emissive={coreColor.accent}
          emissiveIntensity={0.45}
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* Outer Rotating Cyber Ring */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[2.42, 0.024, 12, 96]} />
        <meshStandardMaterial
          color={coreColor.main}
          emissive={coreColor.main}
          emissiveIntensity={0.8}
          roughness={0.15}
          metalness={0.9}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Middle Rotating Secondary Ring */}
      <mesh ref={midRingRef}>
        <torusGeometry args={[2.22, 0.016, 12, 72]} />
        <meshStandardMaterial
          color={coreColor.glow}
          emissive={coreColor.glow}
          emissiveIntensity={0.7}
          roughness={0.25}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Inner Icosahedron Security Core */}
      <mesh ref={innerSphereRef}>
        <icosahedronGeometry args={[1.08, 2]} />
        <meshStandardMaterial
          color={coreColor.main}
          emissive={coreColor.glow}
          emissiveIntensity={isAnalyzing ? 1.4 : 0.9}
          roughness={0.15}
          metalness={0.85}
          wireframe
          transparent
          opacity={0.95}
        />
      </mesh>

      <ProceduralParticles count={160} color={coreColor.main} />
    </group>
  );
}

export const SecurityCore3D: React.FC<{
  className?: string;
  isAnalyzing?: boolean;
  riskScore?: number;
}> = ({ className = 'w-full h-full min-h-[360px]', isAnalyzing = false, riskScore = 0 }) => {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 4, 5]} intensity={1.4} color="#38BDF8" />
        <pointLight position={[-5, -5, -4]} intensity={1.0} color="#818CF8" />
        <Float speed={1.2} rotationIntensity={0.22} floatIntensity={0.35}>
          <CoreObject isAnalyzing={isAnalyzing} riskScore={riskScore} />
        </Float>
      </Canvas>
    </div>
  );
};
