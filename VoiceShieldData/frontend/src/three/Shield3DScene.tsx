import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface ShieldProps {
  riskScore?: number | null;
  prediction?: 'BONA_FIDE' | 'SPOOF' | 'UNCERTAIN' | 'SUSPICIOUS' | 'INSUFFICIENT_AUDIO' | string | null;
}

function ShieldMesh({ riskScore, prediction = 'BONA_FIDE' }: ShieldProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);

  const score = typeof riskScore === 'number' && Number.isFinite(riskScore) ? riskScore : 15;

  // Determine threat color palette based on risk score
  const { mainColor, emissiveColor, pulseSpeed } = useMemo(() => {
    if (prediction === 'SPOOF' || score >= 70) {
      return { mainColor: '#EF4444', emissiveColor: '#DC2626', pulseSpeed: 4.0 };
    }
    if (prediction === 'UNCERTAIN' || prediction === 'SUSPICIOUS' || score >= 35) {
      return { mainColor: '#F59E0B', emissiveColor: '#D97706', pulseSpeed: 2.0 };
    }
    return { mainColor: '#06B6D4', emissiveColor: '#0891B2', pulseSpeed: 1.2 };
  }, [score, prediction]);

  // Procedural 3D Shield Shape Geometry
  const shieldGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.6);
    shape.quadraticCurveTo(1.4, 1.4, 1.4, 0.2);
    shape.quadraticCurveTo(1.2, -1.2, 0, -1.8);
    shape.quadraticCurveTo(-1.2, -1.2, -1.4, 0.2);
    shape.quadraticCurveTo(-1.4, 1.4, 0, 1.6);

    const extrudeSettings = {
      depth: 0.3,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 2,
      bevelSize: 0.1,
      bevelThickness: 0.1,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Parallax mouse follow
    const targetX = state.pointer.x * 0.4;
    const targetY = state.pointer.y * 0.4;
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetX + Math.sin(time * 0.8) * 0.1, 0.05);
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -targetY, 0.05);

    // Pulse effect
    const pulse = 1 + Math.sin(time * pulseSpeed) * 0.05;
    meshRef.current.scale.set(pulse, pulse, pulse);

    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.5;
      ringRef.current.rotation.x = Math.sin(time * 0.3) * 0.2;
    }
  });

  return (
    <group position={[0, 0.1, 0]}>
      {/* 3D Shield Solid Body */}
      <mesh ref={meshRef} geometry={shieldGeometry} castShadow>
        <meshStandardMaterial
          color={mainColor}
          emissive={emissiveColor}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.85}
        />
      </mesh>

      {/* Outer Rotating Shield Sensor Ring */}
      <mesh ref={ringRef} position={[0, 0, -0.2]}>
        <torusGeometry args={[2.2, 0.03, 16, 100]} />
        <meshBasicMaterial color={mainColor} transparent opacity={0.6} wireframe />
      </mesh>
    </group>
  );
}

export const Shield3DScene: React.FC<{
  riskScore?: number | null;
  prediction?: 'BONA_FIDE' | 'SPOOF' | 'UNCERTAIN' | 'SUSPICIOUS' | 'INSUFFICIENT_AUDIO' | string | null;
  className?: string;
}> = ({ riskScore = 15, prediction = 'BONA_FIDE', className = 'w-full h-full' }) => {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={2.0} color="#ffffff" />
        <pointLight position={[-5, -5, -2]} intensity={1.5} color="#8B5CF6" />
        <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.4}>
          <ShieldMesh riskScore={riskScore} prediction={prediction} />
        </Float>
      </Canvas>
    </div>
  );
};
