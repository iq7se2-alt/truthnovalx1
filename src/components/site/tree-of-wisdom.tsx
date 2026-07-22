"use client";

import { useRef, useMemo, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Sparkles, Environment } from "@react-three/drei";
import * as THREE from "three";

/**
 * Tree of Wisdom (شجرة الحكمة الذهبية)
 *
 * A 3D golden tree that grows as the user reads more chapters.
 * - 0 chapters: just a seed/sprout
 * - 1-50 chapters: trunk grows
 * - 50-200: main branches appear
 * - 200+: golden leaves and fruits
 * - Every 100 chapters: a "wisdom fruit" unlocks with a character name
 *
 * Data source: localStorage "lord-of-truth-stats" → readChapters[]
 */

// ─── Branch generation (recursive L-system style) ───
type Branch = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  thickness: number;
  depth: number;
};

function generateBranches(
  start: THREE.Vector3,
  direction: THREE.Vector3,
  length: number,
  thickness: number,
  depth: number,
  maxDepth: number,
  branches: Branch[]
) {
  if (depth > maxDepth || length < 0.15) return;
  const end = start.clone().add(direction.clone().multiplyScalar(length));
  branches.push({ start, end, thickness, depth });

  if (depth === maxDepth) return;

  // Number of children increases with depth
  const numChildren = depth < 2 ? 2 : Math.random() > 0.4 ? 2 : 3;
  for (let i = 0; i < numChildren; i++) {
    const angle = (Math.PI * 2 * i) / numChildren + Math.random() * 0.5;
    const tilt = 0.4 + Math.random() * 0.4;
    const newDir = direction
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt)
      .normalize();
    // Bias upward
    newDir.y = Math.abs(newDir.y) + 0.3;
    newDir.normalize();
    generateBranches(
      end,
      newDir,
      length * (0.65 + Math.random() * 0.15),
      thickness * 0.7,
      depth + 1,
      maxDepth,
      branches
    );
  }
}

// ─── Tree mesh component ───
function TreeMesh({ readCount }: { readCount: number }) {
  const groupRef = useRef<THREE.Group>(null);

  // Determine growth stage
  const stage = useMemo(() => {
    if (readCount === 0) return { trunk: 0, branches: 0, leaves: 0, fruits: 0, maxDepth: 0 };
    if (readCount < 50) return { trunk: readCount / 50, branches: 0, leaves: 0, fruits: 0, maxDepth: 0 };
    if (readCount < 200) return { trunk: 1, branches: (readCount - 50) / 150, leaves: 0, fruits: 0, maxDepth: 2 };
    if (readCount < 500) return { trunk: 1, branches: 1, leaves: (readCount - 200) / 300, fruits: 0, maxDepth: 3 };
    return { trunk: 1, branches: 1, leaves: 1, fruits: Math.min((readCount - 500) / 500, 1), maxDepth: 4 };
  }, [readCount]);

  // Generate branches (stable, only regenerates when stage changes meaningfully)
  const branches = useMemo(() => {
    const seed = Math.floor(readCount / 10); // regenerates every 10 chapters for visual variety
    // Simple seeded random
    let s = seed * 9301 + 49297;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const originalRandom = Math.random;
    Math.random = rand;
    const result: Branch[] = [];
    generateBranches(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      1.5 * stage.trunk,
      0.18,
      0,
      stage.maxDepth,
      result
    );
    Math.random = originalRandom;
    return result;
  }, [stage.trunk, stage.maxDepth, Math.floor(readCount / 10)]);

  // Leaves positions
  const leafPositions = useMemo(() => {
    if (stage.leaves === 0) return [];
    const positions: THREE.Vector3[] = [];
    const leafCount = Math.floor(stage.leaves * 80);
    branches
      .filter((b) => b.depth >= 2)
      .forEach((b) => {
        for (let i = 0; i < leafCount / 10; i++) {
          const t = Math.random();
          const pos = b.start.clone().lerp(b.end, t);
          pos.x += (Math.random() - 0.5) * 0.3;
          pos.y += (Math.random() - 0.5) * 0.3;
          pos.z += (Math.random() - 0.5) * 0.3;
          positions.push(pos);
        }
      });
    return positions;
  }, [branches, stage.leaves]);

  // Fruit positions (wisdom fruits)
  const fruitPositions = useMemo(() => {
    if (stage.fruits === 0) return [];
    const positions: THREE.Vector3[] = [];
    const fruitCount = Math.floor(stage.fruits * Math.floor(readCount / 100));
    branches
      .filter((b) => b.depth >= 3)
      .slice(0, fruitCount)
      .forEach((b) => {
        positions.push(b.end.clone());
      });
    return positions;
  }, [branches, stage.fruits, readCount]);

  // Gentle rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Trunk and branches */}
      {branches.map((branch, i) => {
        const mid = branch.start.clone().lerp(branch.end, 0.5);
        const dir = branch.end.clone().sub(branch.start);
        const length = dir.length();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.clone().normalize()
        );
        const isTrunk = branch.depth === 0;
        const goldness = branch.depth / 4;
        return (
          <mesh
            key={i}
            position={mid}
            quaternion={quaternion}
            castShadow
          >
            <cylinderGeometry
              args={[
                branch.thickness * 0.7,
                branch.thickness,
                length,
                isTrunk ? 8 : 6,
              ]}
            />
            <meshStandardMaterial
              color={isTrunk ? "#3d2817" : "#6b4423"}
              emissive={isTrunk ? "#1a0a00" : "#d4b05e"}
              emissiveIntensity={goldness * 0.3}
              roughness={0.7}
              metalness={goldness * 0.6}
            />
          </mesh>
        );
      })}

      {/* Golden leaves */}
      {leafPositions.map((pos, i) => (
        <mesh key={`leaf-${i}`} position={pos}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial
            color="#d4b05e"
            emissive="#f0c870"
            emissiveIntensity={0.8}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* Wisdom fruits (glowing orbs) */}
      {fruitPositions.map((pos, i) => (
        <Float key={`fruit-${i}`} speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
          <mesh position={pos}>
            <icosahedronGeometry args={[0.12, 1]} />
            <meshStandardMaterial
              color="#ffd700"
              emissive="#ffaa00"
              emissiveIntensity={1.5}
              metalness={1}
              roughness={0}
            />
          </mesh>
          {/* Glow point light */}
          <pointLight
            position={pos}
            color="#ffcc44"
            intensity={0.5}
            distance={1.5}
          />
        </Float>
      ))}

      {/* Base pedestal */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[0.6, 0.7, 0.3, 16]} />
        <meshStandardMaterial
          color="#1a0a00"
          emissive="#d4b05e"
          emissiveIntensity={0.15}
          roughness={0.5}
          metalness={0.8}
        />
      </mesh>

      {/* Floating sparkles around the tree */}
      <Sparkles
        count={stage.leaves > 0 ? 50 : 10}
        scale={[4, 5, 4]}
        size={3}
        speed={0.3}
        opacity={0.6}
        color="#d4b05e"
      />
    </group>
  );
}

// ─── Main component ───
export function TreeOfWisdom({ readCount }: { readCount: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-gold/20 bg-gradient-to-b from-background to-muted">
        <div className="animate-pulse text-gold/50">يحمّل شجرة الحكمة...</div>
      </div>
    );
  }

  const stage = readCount === 0 ? "بذرة" : readCount < 50 ? "جذع" : readCount < 200 ? "أغصان" : readCount < 500 ? "أوراق" : "ثمار";
  const nextMilestone = readCount < 50 ? 50 : readCount < 200 ? 200 : readCount < 500 ? 500 : 1000;
  const progress = Math.min(100, (readCount / nextMilestone) * 100);

  return (
    <div className="relative overflow-hidden rounded-xl border border-gold/20 bg-gradient-to-b from-background via-background to-muted">
      <Canvas
        camera={{ position: [3, 2, 5], fov: 50 }}
        dpr={[1, 2]}
        shadows
        style={{ height: "400px" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-5, 3, -5]} color="#d4b05e" intensity={0.5} />
          <pointLight position={[0, 5, 0]} color="#ffaa00" intensity={0.8} />

          <TreeMesh readCount={readCount} />

          <Environment preset="sunset" />
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={3}
            maxDistance={10}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 1.8}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>

      {/* Overlay info */}
      <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-gold/30 bg-background/80 px-3 py-2 backdrop-blur-md">
        <div className="text-xs text-gold/60">المرحلة</div>
        <div className="font-naskh text-lg font-bold text-gold">{stage}</div>
        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-gold/60 to-gold"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          {readCount}/{nextMilestone} فصل
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-gold/20 bg-background/60 px-4 py-1 text-[10px] text-muted-foreground backdrop-blur-md">
        🖱️ اسحب للتدوير · عجلة الفأرة للتكبير
      </div>
    </div>
  );
}
