import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { NiagaraEmitterConfig } from '../types/niagaraTypes';
import { ParticleSimulationEngine } from '../utils/particleSimulationEngine';
import { LuPlay, LuPause, LuRotateCcw, LuSparkles, LuMaximize2, LuMinimize2, LuMove, LuEye } from 'react-icons/lu';

export type NiagaraViewportMode = 'docked' | 'pip' | 'minimized' | 'fullscreen';

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
  const [viewportMode, setViewportMode] = useState<NiagaraViewportMode>('docked');

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

    const sizeAttr = new THREE.BufferAttribute(initialBuffers.sizes, 1);
    sizeAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('pSize', sizeAttr);

    // Points Custom ShaderMaterial for soft, blooming circular particle billboards
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: configRef.current.blendMode === 'Additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexColors: true,
      uniforms: {
        uScale: { value: height / 2.0 },
      },
      vertexShader: `
        attribute float pSize;
        varying vec4 vColor;
        uniform float uScale;

        void main() {
          vColor = color;
          // Discard inactive, offscreen, or transparent particles
          if (pSize <= 0.0 || vColor.a <= 0.0001 || position.x > 90000.0) {
            gl_PointSize = 0.0;
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
          }
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float size = pSize;
          float pDist = max(0.1, -mvPosition.z);
          // Scale size with camera perspective (UE Niagara sprite size)
          gl_PointSize = max(1.0, size * (uScale / pDist) * 0.18);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec4 vColor;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          
          // Anti-aliased soft circular falloff with core bloom
          float glow = pow(1.0 - dist * 2.0, 1.6);
          gl_FragColor = vec4(vColor.rgb * (1.0 + glow * 0.7), vColor.a * glow);
        }
      `,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 100000);
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
          if (geometryRef.current.attributes.pSize) {
            (geometryRef.current.attributes.pSize as THREE.BufferAttribute).needsUpdate = true;
          }
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
          if (pointsRef.current?.material) {
            const sm = pointsRef.current.material as THREE.ShaderMaterial;
            if (sm.uniforms?.uScale) {
              sm.uniforms.uScale.value = newH / 2.0;
            }
          }
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
      const mat = pointsRef.current.material as THREE.ShaderMaterial;
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

  if (viewportMode === 'minimized') {
    return (
      <div
        onClick={() => setViewportMode('docked')}
        className="fixed bottom-12 right-6 z-30 flex items-center space-x-2 px-3 py-2 rounded-lg bg-zinc-900 border border-orange-500/50 shadow-2xl cursor-pointer hover:bg-zinc-800 transition-all select-none"
      >
        <LuSparkles className="w-4 h-4 text-orange-400 animate-pulse" />
        <span className="font-semibold text-xs text-zinc-200">Niagara VFX ({particleStats.active})</span>
        <span className="text-[10px] font-mono px-1 rounded bg-orange-500/20 text-orange-400">Expand</span>
      </div>
    );
  }

  const containerClasses =
    viewportMode === 'fullscreen'
      ? 'fixed inset-4 z-50'
      : viewportMode === 'pip'
      ? 'fixed bottom-12 right-6 w-96 h-80 z-30 rounded-xl shadow-2xl'
      : `w-96 h-full flex flex-col border-l border-zinc-800 bg-zinc-950 z-10 shrink-0 ${className}`;

  return (
    <div
      className={`relative flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl select-none ${containerClasses}`}
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

          {/* PIP / Dock toggle */}
          <button
            onClick={() => setViewportMode(viewportMode === 'pip' ? 'docked' : 'pip')}
            className={`p-1.5 rounded transition-colors ${
              viewportMode === 'pip' ? 'text-orange-400 bg-orange-500/20' : 'text-zinc-400 hover:text-white'
            }`}
            title={viewportMode === 'pip' ? 'Dock to right sidebar' : 'Float as Picture-in-Picture (PIP)'}
          >
            <LuMove className="w-3.5 h-3.5" />
          </button>

          {/* Minimize to badge */}
          <button
            onClick={() => setViewportMode('minimized')}
            className="p-1.5 rounded text-zinc-400 hover:text-white"
            title="Minimize to floating badge"
          >
            <LuEye className="w-3.5 h-3.5" />
          </button>

          {/* Maximize */}
          <button
            onClick={() => setViewportMode(viewportMode === 'fullscreen' ? 'docked' : 'fullscreen')}
            className="p-1.5 rounded text-zinc-400 hover:text-white"
            title="Toggle Fullscreen Maximize"
          >
            {viewportMode === 'fullscreen' ? <LuMinimize2 className="w-3.5 h-3.5" /> : <LuMaximize2 className="w-3.5 h-3.5" />}
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
      <div className="px-3 py-1 bg-zinc-900/80 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-400 flex items-center justify-between gap-2 overflow-hidden">
        <span className="truncate" title={`Forces: Gravity (${config.gravityForceZ}) • Turbulence (${config.curlNoiseStrength}) • Drag (${config.dragCoefficient})${config.pointAttractorStrength ? ` • Attractor (${config.pointAttractorStrength})` : ''}${config.collisionEnabled ? ` • Floor Bounce (${config.bounciness ?? 0.45})` : ''}`}>
          Forces: Gravity ({config.gravityForceZ}) • Turb ({config.curlNoiseStrength}) • Drag ({config.dragCoefficient})
          {config.pointAttractorStrength ? ` • Attractor (${config.pointAttractorStrength})` : ''}
          {config.collisionEnabled ? ` • Floor Bounce (${config.bounciness ?? 0.45})` : ''}
        </span>
        <span className="shrink-0 text-zinc-500">Drag to Orbit</span>
      </div>
    </div>
  );
};
