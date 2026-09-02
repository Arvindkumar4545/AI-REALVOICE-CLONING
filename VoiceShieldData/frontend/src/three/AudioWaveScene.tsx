import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

function ParticleWave({ isHovered }: { isHovered?: boolean }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 3000;

  const [positions, initialY] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const initY = new Float32Array(count);
    const rows = 50;
    const cols = 60;
    let idx = 0;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const x = (j - cols / 2) * 0.35;
        const z = (i - rows / 2) * 0.35;
        const y = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.5;

        pos[idx * 3] = x;
        pos[idx * 3 + 1] = y;
        pos[idx * 3 + 2] = z;
        initY[idx] = y;
        idx++;
      }
    }
    return [pos, initY];
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = positionAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const x = array[i * 3];
      const z = array[i * 3 + 2];
      const speedMultiplier = isHovered ? 2.5 : 1.2;
      const wave1 = Math.sin(x * 0.6 + time * speedMultiplier) * 0.6;
      const wave2 = Math.cos(z * 0.4 + time * speedMultiplier * 0.8) * 0.4;
      const wave3 = Math.sin((x + z) * 0.3 + time * 1.5) * 0.3;

      array[i * 3 + 1] = wave1 + wave2 + wave3;
    }
    positionAttr.needsUpdate = true;

    // Subtle overall scene tilt
    pointsRef.current.rotation.y = Math.sin(time * 0.1) * 0.15;
  });

  return (
    <points ref={pointsRef} position={[0, -0.5, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <PointMaterial
        transparent
        color="#06B6D4"
        size={0.06}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function FloatingRing() {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.x = time * 0.3;
    meshRef.current.rotation.y = time * 0.2;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <torusGeometry args={[3.2, 0.02, 16, 100]} />
      <meshBasicMaterial color="#8B5CF6" transparent opacity={0.4} wireframe />
    </mesh>
  );
}

export const AudioWaveScene: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 3.5, 7], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#06B6D4" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#8B5CF6" />
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <ParticleWave />
          <FloatingRing />
        </Float>
      </Canvas>
    </div>
  );
};
