import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Float, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';

function CyberSphere() {
  const outerSphereRef = useRef<THREE.Mesh>(null!);
  const innerCoreRef = useRef<THREE.Mesh>(null!);
  const icosahedronRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Smooth rotation
    outerSphereRef.current.rotation.y = time * 0.2;
    outerSphereRef.current.rotation.x = Math.sin(time * 0.15) * 0.2;

    innerCoreRef.current.rotation.y = -time * 0.4;
    innerCoreRef.current.rotation.z = time * 0.3;

    icosahedronRef.current.rotation.x = time * 0.1;
    icosahedronRef.current.rotation.y = time * 0.25;

    // React to mouse pointer
    const mouseX = state.pointer.x * 0.5;
    const mouseY = state.pointer.y * 0.5;
    outerSphereRef.current.position.x = THREE.MathUtils.lerp(outerSphereRef.current.position.x, mouseX, 0.05);
    outerSphereRef.current.position.y = THREE.MathUtils.lerp(outerSphereRef.current.position.y, mouseY, 0.05);
  });

  return (
    <group>
      {/* Outer Wireframe Neural Sphere */}
      <mesh ref={outerSphereRef}>
        <sphereGeometry args={[2.2, 28, 28]} />
        <meshStandardMaterial
          color="#06B6D4"
          wireframe
          transparent
          opacity={0.35}
          emissive="#06B6D4"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Mid Icosahedron Grid */}
      <mesh ref={icosahedronRef}>
        <icosahedronGeometry args={[1.7, 2]} />
        <meshStandardMaterial
          color="#8B5CF6"
          wireframe
          transparent
          opacity={0.5}
          emissive="#8B5CF6"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Inner Glowing AI Core */}
      <mesh ref={innerCoreRef}>
        <sphereGeometry args={[1.0, 32, 32]} />
        <meshStandardMaterial
          color="#3B82F6"
          roughness={0.2}
          metalness={0.8}
          emissive="#3B82F6"
          emissiveIntensity={1.2}
        />
      </mesh>
    </group>
  );
}

export const SecuritySphereScene: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} color="#06B6D4" />
        <pointLight position={[-5, -5, -5]} intensity={1.2} color="#8B5CF6" />
        <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.6}>
          <CyberSphere />
        </Float>
      </Canvas>
    </div>
  );
};
