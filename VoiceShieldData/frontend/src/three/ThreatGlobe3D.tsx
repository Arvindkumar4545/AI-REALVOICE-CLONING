import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface ThreatPoint {
  lat: number;
  lng: number;
  threatType: string;
  risk: number;
}

const SAMPLE_THREATS: ThreatPoint[] = [
  { lat: 37.7749, lng: -122.4194, threatType: 'Deepfake CEO Fraud', risk: 94 }, // San Francisco
  { lat: 40.7128, lng: -74.006, threatType: 'Bank Impersonation', risk: 88 },    // New York
  { lat: 51.5074, lng: -0.1278, threatType: 'Voice Clone Extortion', risk: 91 },  // London
  { lat: 35.6762, lng: 139.6503, threatType: 'Synthetic Speech Scam', risk: 78 }, // Tokyo
  { lat: 1.3521, lng: 103.8198, threatType: 'Telecom Spoofing', risk: 85 },       // Singapore
  { lat: 25.2048, lng: 55.2708, threatType: 'Executive Vishing', risk: 92 },      // Dubai
  { lat: -33.8688, lng: 151.2093, threatType: 'Insurance Spoof', risk: 73 },     // Sydney
  { lat: 19.076, lng: 72.8777, threatType: 'KYC Deepfake Bypass', risk: 89 },     // Mumbai
  { lat: 52.52, lng: 13.405, threatType: 'Customer Impersonation', risk: 65 },    // Berlin
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function CyberGlobe() {
  const globeRef = useRef<THREE.Group>(null!);
  const pointsRef = useRef<THREE.Points>(null!);

  // Globe Wireframe & Surface
  const radius = 2.2;

  // Compute threat node vectors
  const threatPositions = useMemo(() => {
    return SAMPLE_THREATS.map((t) => ({
      pos: latLngToVector3(t.lat, t.lng, radius * 1.02),
      data: t,
    }));
  }, [radius]);

  // Ambient globe particles
  const surfaceParticles = useMemo(() => {
    const p = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      p[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = radius * Math.cos(phi);
    }
    return p;
  }, [radius]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    globeRef.current.rotation.y = time * 0.15;
    globeRef.current.rotation.x = 0.2;
  });

  return (
    <group ref={globeRef}>
      {/* Wireframe Globe Sphere */}
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color="#06B6D4"
          wireframe
          transparent
          opacity={0.25}
          emissive="#06B6D4"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Surface Particle Cloud */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={surfaceParticles.length / 3}
            array={surfaceParticles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          color="#3B82F6"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Threat Beacon Markers */}
      {threatPositions.map((item, idx) => (
        <group key={idx} position={item.pos}>
          <mesh>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial
              color={item.data.risk >= 85 ? '#EF4444' : '#F59E0B'}
              emissive={item.data.risk >= 85 ? '#EF4444' : '#F59E0B'}
              emissiveIntensity={1.8}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export const ThreatGlobe3D: React.FC<{ className?: string }> = ({
  className = 'w-full h-80',
}) => {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5.8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} color="#06B6D4" />
        <pointLight position={[-5, -5, -5]} intensity={1.0} color="#EF4444" />
        <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
          <CyberGlobe />
        </Float>
      </Canvas>
    </div>
  );
};
