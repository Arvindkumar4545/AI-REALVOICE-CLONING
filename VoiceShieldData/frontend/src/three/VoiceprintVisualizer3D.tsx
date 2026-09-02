import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface VoiceprintVisualizer3DProps {
  className?: string;
  speakerName?: string;
  similarity?: number;
}

function EmbeddingCloud({ similarity = 0.94 }: { similarity?: number }) {
  const cloudRef = useRef<THREE.Group>(null!);
  const count = 192; // 192-D ECAPA Embedding size

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const baseColor = new THREE.Color(similarity >= 0.8 ? '#06B6D4' : '#F59E0B');

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * 2.0;

      const sinPhi = Math.sin(phi);
      pos[i * 3] = r * sinPhi * Math.cos(theta);
      pos[i * 3 + 1] = r * sinPhi * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      col[i * 3] = baseColor.r + (Math.random() - 0.5) * 0.2;
      col[i * 3 + 1] = baseColor.g + (Math.random() - 0.5) * 0.2;
      col[i * 3 + 2] = baseColor.b + (Math.random() - 0.5) * 0.2;
    }
    return [pos, col];
  }, [count, similarity]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    cloudRef.current.rotation.y = time * 0.2;
    cloudRef.current.rotation.z = Math.sin(time * 0.1) * 0.15;
  });

  return (
    <group ref={cloudRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Central Identity Sphere */}
      <mesh>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshStandardMaterial
          color="#06B6D4"
          wireframe
          transparent
          opacity={0.4}
          emissive="#06B6D4"
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

export const VoiceprintVisualizer3D: React.FC<VoiceprintVisualizer3DProps> = ({
  className = 'w-full h-80',
  similarity = 0.94,
}) => {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 4, 4]} intensity={1.5} color="#06B6D4" />
        <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
          <EmbeddingCloud similarity={similarity} />
        </Float>
      </Canvas>
    </div>
  );
};
