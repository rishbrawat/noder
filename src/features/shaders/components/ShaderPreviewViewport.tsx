import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MaterialGraphProperties } from '../types/materialTypes';
import {
  LuRotateCw,
  LuBox,
  LuCircle,
  LuCylinder,
  LuSquare,
  LuMaximize2,
  LuMinimize2,
} from 'react-icons/lu';

interface ShaderPreviewViewportProps {
  materialProperties: MaterialGraphProperties;
  className?: string;
}

export type MeshShape = 'shaderball' | 'sphere' | 'cube' | 'cylinder' | 'plane';

export function updateMeshGeometry(
  currentShape: MeshShape,
  group: THREE.Group,
  material: THREE.MeshPhysicalMaterial
) {
  // Clear old children
  while (group.children.length > 0) {
    const child = group.children[0] as THREE.Mesh;
    if (child.geometry) child.geometry.dispose();
    group.remove(child);
  }

  if (currentShape === 'shaderball') {
    // UE5-style composite Shader Ball: Outer Beveled Ring Sphere + Inner Core Sphere + Pedestal Ring
    const outerGeo = new THREE.SphereGeometry(1.0, 64, 64);
    const outerMesh = new THREE.Mesh(outerGeo, material);
    group.add(outerMesh);

    // Recessed core sphere
    const innerMat = material.clone();
    innerMat.roughness = Math.max(0.05, material.roughness * 0.5);
    const innerGeo = new THREE.SphereGeometry(0.68, 32, 32);
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.position.set(0, 0, 0.45);
    group.add(innerMesh);

    // Base ring
    const ringGeo = new THREE.TorusGeometry(1.05, 0.08, 16, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, material);
    ringMesh.position.set(0, -0.6, 0);
    group.add(ringMesh);
  } else if (currentShape === 'sphere') {
    const geo = new THREE.SphereGeometry(1.1, 64, 64);
    group.add(new THREE.Mesh(geo, material));
  } else if (currentShape === 'cube') {
    const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    group.add(new THREE.Mesh(geo, material));
  } else if (currentShape === 'cylinder') {
    const geo = new THREE.CylinderGeometry(0.9, 0.9, 1.8, 48);
    group.add(new THREE.Mesh(geo, material));
  } else if (currentShape === 'plane') {
    const geo = new THREE.PlaneGeometry(2.2, 2.2, 32, 32);
    group.add(new THREE.Mesh(geo, material));
  }
}

export const ShaderPreviewViewport: React.FC<ShaderPreviewViewportProps> = ({
  materialProperties,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [shape, setShape] = useState<MeshShape>('shaderball');
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const frameIdRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const shapeRef = useRef<MeshShape>(shape);
  useEffect(() => {
    shapeRef.current = shape;
  }, [shape]);

  const isAutoRotatingRef = useRef<boolean>(isAutoRotating);
  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating;
  }, [isAutoRotating]);

  const materialPropertiesRef = useRef<MaterialGraphProperties>(materialProperties);
  useEffect(() => {
    materialPropertiesRef.current = materialProperties;
  }, [materialProperties]);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121214);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.8);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting Rig (Studio 3-Point Lights + Ambient)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.5);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x90b0ff, 1.2);
    fillLight.position.set(-4, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 2.0);
    rimLight.position.set(0, -3, -4);
    scene.add(rimLight);

    // Physical Material
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(...materialPropertiesRef.current.baseColor),
      metalness: materialPropertiesRef.current.metallic,
      roughness: materialPropertiesRef.current.roughness,
      specularIntensity: materialPropertiesRef.current.specular ?? 0.5,
      emissive: new THREE.Color(...materialPropertiesRef.current.emissiveColor),
      emissiveIntensity: 1.0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
      transparent: materialPropertiesRef.current.opacity < 0.99,
      opacity: materialPropertiesRef.current.opacity,
    });
    materialRef.current = material;

    // Mesh Group
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    // Build Current Mesh
    updateMeshGeometry(shapeRef.current, meshGroup, material);

    // Animation Loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      if (isAutoRotatingRef.current && meshGroupRef.current && !isDraggingRef.current) {
        meshGroupRef.current.rotation.y += 0.008;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && rendererRef.current) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Material Properties dynamically
  useEffect(() => {
    if (!materialRef.current) return;
    const mat = materialRef.current;
    mat.color.setRGB(...materialProperties.baseColor);
    mat.metalness = materialProperties.metallic;
    mat.roughness = materialProperties.roughness;
    mat.specularIntensity = materialProperties.specular ?? 0.5;
    mat.emissive.setRGB(...materialProperties.emissiveColor);
    mat.transparent = materialProperties.opacity < 0.99;
    mat.opacity = materialProperties.opacity;
    mat.needsUpdate = true;
  }, [materialProperties]);

  // Update Geometry when shape changes
  useEffect(() => {
    if (!meshGroupRef.current || !materialRef.current) return;
    updateMeshGeometry(shape, meshGroupRef.current, materialRef.current);
  }, [shape]);

  // Mouse Interaction for Orbit Rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !meshGroupRef.current) return;
    const deltaX = e.clientX - previousMousePos.current.x;
    const deltaY = e.clientY - previousMousePos.current.y;
    meshGroupRef.current.rotation.y += deltaX * 0.01;
    meshGroupRef.current.rotation.x += deltaY * 0.01;
    previousMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Wheel Interaction for Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!cameraRef.current) return;
    const zoomDelta = e.deltaY * 0.003;
    cameraRef.current.position.z = Math.min(Math.max(cameraRef.current.position.z + zoomDelta, 1.8), 7.5);
  };

  // Touch Interaction for Mobile / Tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      isDraggingRef.current = true;
      previousMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !meshGroupRef.current || e.touches.length === 0) return;
    const deltaX = e.touches[0].clientX - previousMousePos.current.x;
    const deltaY = e.touches[0].clientY - previousMousePos.current.y;
    meshGroupRef.current.rotation.y += deltaX * 0.01;
    meshGroupRef.current.rotation.x += deltaY * 0.01;
    previousMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      className={`relative flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl transition-all ${
        isExpanded ? 'fixed inset-4 z-50' : 'w-80 h-96 shrink-0'
      } ${className}`}
    >
      {/* Top Bar Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-xs z-10 backdrop-blur">
        <div className="flex items-center space-x-1.5">
          <span className="font-semibold text-zinc-200">3D Shader Ball</span>
          <span className="text-[10px] px-1 rounded bg-gold-500/20 text-gold-400 font-mono">
            WebGL
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {/* Shape Switchers */}
          <button
            onClick={() => setShape('shaderball')}
            className={`p-1 rounded ${shape === 'shaderball' ? 'bg-gold-500/20 text-gold-400' : 'text-zinc-400 hover:text-white'}`}
            title="UE5 Shader Ball"
          >
            🔮
          </button>
          <button
            onClick={() => setShape('sphere')}
            className={`p-1 rounded ${shape === 'sphere' ? 'bg-gold-500/20 text-gold-400' : 'text-zinc-400 hover:text-white'}`}
            title="Sphere"
          >
            <LuCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShape('cube')}
            className={`p-1 rounded ${shape === 'cube' ? 'bg-gold-500/20 text-gold-400' : 'text-zinc-400 hover:text-white'}`}
            title="Cube"
          >
            <LuBox className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShape('cylinder')}
            className={`p-1 rounded ${shape === 'cylinder' ? 'bg-gold-500/20 text-gold-400' : 'text-zinc-400 hover:text-white'}`}
            title="Cylinder"
          >
            <LuCylinder className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShape('plane')}
            className={`p-1 rounded ${shape === 'plane' ? 'bg-gold-500/20 text-gold-400' : 'text-zinc-400 hover:text-white'}`}
            title="Plane"
          >
            <LuSquare className="w-3.5 h-3.5" />
          </button>

          {/* Auto rotate toggle */}
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-1 rounded ${isAutoRotating ? 'text-gold-400' : 'text-zinc-500'}`}
            title="Toggle Auto-Rotate (0.008 rad/frame)"
          >
            <LuRotateCw className={`w-3.5 h-3.5 ${isAutoRotating ? 'animate-spin' : ''}`} />
          </button>

          {/* Maximize */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-zinc-400 hover:text-white"
            title="Maximize Viewport"
          >
            {isExpanded ? <LuMinimize2 className="w-3.5 h-3.5" /> : <LuMaximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full flex-1 cursor-grab active:cursor-grabbing select-none"
      />

      {/* Footer Status Overlay */}
      <div className="px-3 py-1 bg-zinc-900/80 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
        <span>Met: {materialProperties.metallic.toFixed(2)} | Rgh: {materialProperties.roughness.toFixed(2)} | Spec: {materialProperties.specular.toFixed(2)}</span>
        <span>Drag: Orbit | Wheel: Zoom</span>
      </div>
    </div>
  );
};
