import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function ShieldLattice() {
  const outerShieldRef = useRef<THREE.Mesh>(null!);
  const innerHexRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    outerShieldRef.current.rotation.y = Math.sin(time * 0.5) * 0.3;
    outerShieldRef.current.rotation.x = Math.cos(time * 0.4) * 0.15;
    innerHexRef.current.rotation.z = time * 0.2;
  });

  return (
    <group>
      {/* Outer Curved Shield Shell */}
      <mesh ref={outerShieldRef}>
        <cylinderGeometry args={[1.5, 0.4, 2.8, 6, 1, false, 0, Math.PI]} />
        <meshStandardMaterial
          color="#06B6D4"
          wireframe
          transparent
          opacity={0.6}
          emissive="#06B6D4"
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* Inner Rotating Security Core */}
      <mesh ref={innerHexRef} position={[0, 0, 0.2]}>
        <octahedronGeometry args={[0.9, 1]} />
        <meshStandardMaterial
          color="#3B82F6"
          roughness={0.2}
          metalness={0.9}
          emissive="#3B82F6"
          emissiveIntensity={1.2}
          wireframe
        />
      </mesh>
    </group>
  );
}

export const CyberSecurityShield3D: React.FC<{ className?: string }> = ({
  className = 'w-full h-80',
}) => {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 4, 4]} intensity={1.6} color="#06B6D4" />
        <pointLight position={[-4, -4, -4]} intensity={1.2} color="#8B5CF6" />
        <Float speed={1.6} rotationIntensity={0.3} floatIntensity={0.5}>
          <ShieldLattice />
        </Float>
      </Canvas>
    </div>
  );
};
