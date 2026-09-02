import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AudioWaveform3DProps {
  isPlaying?: boolean;
  isRecording?: boolean;
  className?: string;
}

function WaveformBars({ isPlaying = false, isRecording = false }: { isPlaying: boolean; isRecording: boolean }) {
  const barsRef = useRef<THREE.Group>(null!);
  const barCount = 48;

  // Pre-generate bar positions
  const barPositions = useMemo(() => {
    const arr = [];
    const span = 6.0;
    const step = span / barCount;
    for (let i = 0; i < barCount; i++) {
      arr.push(-span / 2 + i * step);
    }
    return arr;
  }, [barCount]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const isActive = isPlaying || isRecording;
    const speed = isActive ? 8.0 : 1.5;

    if (barsRef.current) {
      barsRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const normalizedIndex = i / barCount;
        
        // Complex procedural waveform formula simulating vocal harmonics & F0
        const freq1 = Math.sin(time * speed + i * 0.4);
        const freq2 = Math.cos(time * (speed * 0.7) + i * 0.2);
        const envelope = Math.sin(normalizedIndex * Math.PI); // Window function
        
        let height = 0.15;
        if (isActive) {
          height = Math.max(0.1, (Math.abs(freq1 * 0.7 + freq2 * 0.5) * 1.6 + 0.2) * envelope);
        } else {
          height = Math.max(0.08, (Math.abs(Math.sin(time * 1.2 + i * 0.3)) * 0.3 + 0.08) * envelope);
        }

        mesh.scale.y = height;
        mesh.position.y = height / 2;
      });
    }
  });

  return (
    <group ref={barsRef}>
      {barPositions.map((posX, idx) => (
        <mesh key={idx} position={[posX, 0, 0]}>
          <boxGeometry args={[0.08, 1, 0.08]} />
          <meshStandardMaterial
            color={isPlaying || isRecording ? '#06B6D4' : '#3B82F6'}
            emissive={isPlaying || isRecording ? '#06B6D4' : '#1E293B'}
            emissiveIntensity={isPlaying || isRecording ? 1.2 : 0.2}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

export const AudioWaveform3D: React.FC<AudioWaveform3DProps> = ({
  isPlaying = false,
  isRecording = false,
  className = 'w-full h-32',
}) => {
  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      <Canvas
        camera={{ position: [0, 0.5, 4.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[0, 4, 3]} intensity={1.5} color="#22D3EE" />
        <WaveformBars isPlaying={isPlaying} isRecording={isRecording} />
      </Canvas>
    </div>
  );
};
