import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { NiagaraEmitterConfig } from '../types/niagaraTypes';
import { ParticleSimulationEngine } from '../utils/particleSimulationEngine';
import { LuPlay, LuPause, LuRotateCcw, LuSparkles, LuMaximize2, LuMinimize2 } from 'react-icons/lu';

interface NiagaraPreviewViewportProps {
  config: NiagaraEmitterConfig;
  className?: string;
}

export const NiagaraPreviewViewport: React.FC<NiagaraPreviewViewportProps> = ({
  config,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [particleStats, setParticleStats] = useState<{ active: number; max: number }>({
    active: 0,
    max: 10000,
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const engineRef = useRef<ParticleSimulationEngine | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const isPlayingRef = useRef<boolean>(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const configRef = useRef<NiagaraEmitterConfig>(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Initialize Three.js scene & simulation engine
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // Simulation Engine (Up to 10k particles @ 60 FPS)
    const simEngine = new ParticleSimulationEngine(configRef.current, 10000);
    engineRef.current = simEngine;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    sceneRef.current = scene;

    // Floor Grid Helper (UE5 style dark grid)
    const gridHelper = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b);
    gridHelper.position.y = -1.2;
    scene.add(gridHelper);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.0);
    camera.lookAt(0, 0.2, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Three.js Points BufferGeometry for fast GPU-like rendering
    const geometry = new THREE.BufferGeometry();
    geometryRef.current = geometry;

    const initialBuffers = simEngine.getBuffers();
    const posAttr = new THREE.BufferAttribute(initialBuffers.positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', posAttr);

    const colAttr = new THREE.BufferAttribute(initialBuffers.colors, 4);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('color', colAttr);

    // Points Material (Additive blending for VFX glow)
    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      blending: configRef.current.blendMode === 'Additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    pointsRef.current = points;

    // Animation Loop
    lastTimeRef.current = performance.now();
    const animate = (time: number) => {
      frameIdRef.current = requestAnimationFrame(animate);

      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (engineRef.current && isPlayingRef.current) {
        engineRef.current.step(dt);
        const bufs = engineRef.current.getBuffers();

        if (geometryRef.current) {
          (geometryRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
          (geometryRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
        }

        setParticleStats({
          active: bufs.activeCount,
          max: bufs.maxParticles,
        });
      }

      renderer.render(scene, camera);
    };
    frameIdRef.current = requestAnimationFrame(animate);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync config updates to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfig(config);
    }
    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      if (mat) {
        mat.blending = config.blendMode === 'Additive' ? THREE.AdditiveBlending : THREE.NormalBlending;
        mat.needsUpdate = true;
      }
    }
  }, [config]);

  // Restart Emitter
  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.reset();
    }
  };

  // Mouse Interaction (Orbit around center)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !cameraRef.current) return;
    const deltaX = e.clientX - previousMousePos.current.x;
    const deltaY = e.clientY - previousMousePos.current.y;

    // Rotate camera around origin
    const cam = cameraRef.current;
    const theta = deltaX * 0.008;
    const phi = deltaY * 0.008;

    const x = cam.position.x;
    const z = cam.position.z;
    cam.position.x = x * Math.cos(theta) - z * Math.sin(theta);
    cam.position.z = x * Math.sin(theta) + z * Math.cos(theta);
    cam.position.y = Math.max(0.2, Math.min(6.0, cam.position.y + phi * 2));
    cam.lookAt(0, 0.2, 0);

    previousMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      className={`relative flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl flex-1 h-full select-none ${
        isExpanded ? 'fixed inset-4 z-50' : ''
      } ${className}`}
    >
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-xs backdrop-blur z-10">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-zinc-200">WebGL GPU Particle Sim</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono">
            {particleStats.active.toLocaleString()} / {particleStats.max.toLocaleString()} particles
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1.5 rounded transition-colors ${
              isPlaying ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800 text-zinc-400'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          >
            {isPlaying ? <LuPause className="w-3.5 h-3.5" /> : <LuPlay className="w-3.5 h-3.5" />}
          </button>

          {/* Restart */}
          <button
            onClick={handleRestart}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Restart Emitter"
          >
            <LuRotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Burst */}
          <button
            onClick={() => engineRef.current?.burst(250)}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/40 font-mono text-[10px]"
            title="Trigger Instantaneous Burst"
          >
            <LuSparkles className="w-3 h-3" />
            <span>Burst (250)</span>
          </button>

          {/* Maximize */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded text-zinc-400 hover:text-white"
            title="Maximize Viewport"
          >
            {isExpanded ? <LuMinimize2 className="w-3.5 h-3.5" /> : <LuMaximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Mount */}
      <div
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full flex-1 cursor-grab active:cursor-grabbing"
      />

      {/* Footer Info */}
      <div className="px-3 py-1 bg-zinc-900/80 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
        <span>Forces: Gravity ({config.gravityForceZ}) • Turbulence ({config.curlNoiseStrength}) • Drag ({config.dragCoefficient})</span>
        <span>Drag to Orbit Camera</span>
      </div>
    </div>
  );
};
