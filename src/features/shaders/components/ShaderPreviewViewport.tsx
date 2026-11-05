import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MaterialGraphProperties } from '../types/materialTypes';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../../types/BlueprintTypes';
import { generateGLSLFragmentShader } from '../utils/webglShaderGenerator';
import {
  LuRotateCw,
  LuBox,
  LuCircle,
  LuCylinder,
  LuSquare,
  LuMaximize2,
  LuMinimize2,
  LuMove,
  LuEye,
} from 'react-icons/lu';

interface ShaderPreviewViewportProps {
  materialProperties: MaterialGraphProperties;
  nodes?: Node<NodeData>[];
  edges?: Edge[];
  className?: string;
}

export type MeshShape = 'shaderball' | 'sphere' | 'cube' | 'cylinder' | 'plane';
export type ViewportMode = 'docked' | 'pip' | 'minimized' | 'fullscreen';

export function updateMeshGeometry(
  currentShape: MeshShape,
  group: THREE.Group,
  material: THREE.Material
) {
  // Clear old children
  while (group.children.length > 0) {
    const child = group.children[0] as THREE.Mesh;
    if (child.geometry) child.geometry.dispose();
    group.remove(child);
  }

  if (currentShape === 'shaderball') {
    // Composite Shader Ball: Outer Shell Sphere + Recessed Inner Core + Pedestal Ring
    const outerGeo = new THREE.SphereGeometry(1.0, 64, 64);
    const outerMesh = new THREE.Mesh(outerGeo, material);
    group.add(outerMesh);

    // Recessed core sphere
    const innerMat = material.clone();
    if ('roughness' in innerMat) {
      (innerMat as any).roughness = Math.max(0.05, ((material as any).roughness ?? 0.4) * 0.5);
    }
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
    const geo = new THREE.PlaneGeometry(2.2, 2.2, 64, 64);
    group.add(new THREE.Mesh(geo, material));
  }
}

export const ShaderPreviewViewport: React.FC<ShaderPreviewViewportProps> = ({
  materialProperties,
  nodes = [],
  edges = [],
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [shape, setShape] = useState<MeshShape>('shaderball');
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [viewportMode, setViewportMode] = useState<ViewportMode>('docked');
  const [isProceduralGLSL, setIsProceduralGLSL] = useState<boolean>(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const physicalMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const activeMaterialRef = useRef<THREE.Material | null>(null);
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

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 380;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0e11);
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

    // Studio 3-Point Lights + Ambient
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

    // 1. Procedural ShaderMaterial from compiled GLSL
    const glsl = generateGLSLFragmentShader(nodes, edges, materialProperties);
    const shaderMat = new THREE.ShaderMaterial({
      vertexShader: glsl.vertexShader,
      fragmentShader: glsl.fragmentShader,
      uniforms: glsl.uniforms,
      transparent: materialProperties.opacity < 0.99,
    });
    shaderMaterialRef.current = shaderMat;

    // 2. Fallback Physical Material
    const physMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(...materialProperties.baseColor),
      metalness: materialProperties.metallic,
      roughness: materialProperties.roughness,
      specularIntensity: materialProperties.specular ?? 0.5,
      emissive: new THREE.Color(...materialProperties.emissiveColor),
      emissiveIntensity: 1.0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
      transparent: materialProperties.opacity < 0.99,
      opacity: materialProperties.opacity,
    });
    physicalMaterialRef.current = physMat;

    const initialMat = isProceduralGLSL ? shaderMat : physMat;
    activeMaterialRef.current = initialMat;

    // Mesh Group
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    updateMeshGeometry(shapeRef.current, meshGroup, initialMat);

    // Animation Loop
    const animate = (time: number) => {
      frameIdRef.current = requestAnimationFrame(animate);

      // Animate uniform time for Panner, Noise, and Wave WPO
      if (shaderMaterialRef.current?.uniforms?.u_Time) {
        shaderMaterialRef.current.uniforms.u_Time.value = time * 0.001;
      }

      if (isAutoRotatingRef.current && meshGroupRef.current && !isDraggingRef.current) {
        meshGroupRef.current.rotation.y += 0.008;
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
      shaderMat.dispose();
      physMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update Dynamic Shader & Uniforms when Graph changes
  useEffect(() => {
    if (shaderMaterialRef.current) {
      const glsl = generateGLSLFragmentShader(nodes, edges, materialProperties);
      const u = shaderMaterialRef.current.uniforms;
      if (u.u_BaseColor) u.u_BaseColor.value = materialProperties.baseColor;
      if (u.u_Metallic) u.u_Metallic.value = materialProperties.metallic;
      if (u.u_Specular) u.u_Specular.value = materialProperties.specular ?? 0.5;
      if (u.u_Roughness) u.u_Roughness.value = materialProperties.roughness;
      if (u.u_Emissive) u.u_Emissive.value = materialProperties.emissiveColor;
      if (u.u_Opacity) u.u_Opacity.value = materialProperties.opacity;
      if (u.u_WPO) u.u_WPO.value = materialProperties.worldPositionOffset ?? [0, 0, 0];
      if (u.u_HasFresnel) u.u_HasFresnel.value = glsl.uniforms.u_HasFresnel.value;
      if (u.u_HasPanner) u.u_HasPanner.value = glsl.uniforms.u_HasPanner.value;
      if (u.u_HasNoise) u.u_HasNoise.value = glsl.uniforms.u_HasNoise.value;
      if (u.u_HasWPO) u.u_HasWPO.value = glsl.uniforms.u_HasWPO.value;
    }

    if (physicalMaterialRef.current) {
      const mat = physicalMaterialRef.current;
      mat.color.setRGB(...materialProperties.baseColor);
      mat.metalness = materialProperties.metallic;
      mat.roughness = materialProperties.roughness;
      mat.specularIntensity = materialProperties.specular ?? 0.5;
      mat.emissive.setRGB(...materialProperties.emissiveColor);
      mat.transparent = materialProperties.opacity < 0.99;
      mat.opacity = materialProperties.opacity;
      mat.needsUpdate = true;
    }
  }, [materialProperties, nodes, edges]);

  // Toggle Procedural GLSL vs MeshPhysicalMaterial
  const handleToggleMaterialMode = () => {
    const next = !isProceduralGLSL;
    setIsProceduralGLSL(next);
    if (!meshGroupRef.current) return;
    const targetMat = next ? shaderMaterialRef.current : physicalMaterialRef.current;
    if (targetMat) {
      activeMaterialRef.current = targetMat;
      updateMeshGeometry(shape, meshGroupRef.current, targetMat);
    }
  };

  // Update Geometry when shape changes
  useEffect(() => {
    if (!meshGroupRef.current || !activeMaterialRef.current) return;
    updateMeshGeometry(shape, meshGroupRef.current, activeMaterialRef.current);
  }, [shape]);

  // Orbit & Mouse Controls
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

  const handleWheel = (e: React.WheelEvent) => {
    if (!cameraRef.current) return;
    cameraRef.current.position.z = Math.min(Math.max(cameraRef.current.position.z + e.deltaY * 0.003, 1.5), 8.0);
  };

  if (viewportMode === 'minimized') {
    return (
      <div
        onClick={() => setViewportMode('docked')}
        className="fixed bottom-12 right-6 z-30 flex items-center space-x-2 px-3 py-2 rounded-lg bg-zinc-900 border border-gold-500/50 shadow-2xl cursor-pointer hover:bg-zinc-800 transition-all select-none"
      >
        <span className="text-base">🔮</span>
        <span className="font-semibold text-xs text-zinc-200">Shader Ball</span>
        <span className="text-[10px] font-mono px-1 rounded bg-gold-500/20 text-gold-400">Expand</span>
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
    <div className={`relative flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl select-none ${containerClasses}`}>
      {/* Top Bar Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-xs z-10 backdrop-blur">
        <div className="flex items-center space-x-1.5">
          <span className="font-semibold text-zinc-200">3D Shader Ball</span>
          <button
            onClick={handleToggleMaterialMode}
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
              isProceduralGLSL
                ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
            title="Toggle Procedural GLSL (Fresnel/Panner/Noise) vs Three.js Physical Material"
          >
            {isProceduralGLSL ? 'GLSL GPU' : 'PBR Flat'}
          </button>
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
            title="Toggle Auto-Rotate"
          >
            <LuRotateCw className={`w-3.5 h-3.5 ${isAutoRotating ? 'animate-spin' : ''}`} />
          </button>

          {/* PIP / Dock / Maximize Viewport Controls */}
          <button
            onClick={() => setViewportMode(viewportMode === 'pip' ? 'docked' : 'pip')}
            className={`p-1 rounded transition-colors ${
              viewportMode === 'pip' ? 'text-gold-400 bg-gold-500/20' : 'text-zinc-400 hover:text-white'
            }`}
            title={viewportMode === 'pip' ? 'Dock to right sidebar' : 'Float as Picture-in-Picture (PIP)'}
          >
            <LuMove className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setViewportMode('minimized')}
            className="p-1 rounded text-zinc-400 hover:text-white"
            title="Minimize to floating badge"
          >
            <LuEye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setViewportMode(viewportMode === 'fullscreen' ? 'docked' : 'fullscreen')}
            className="p-1 rounded text-zinc-400 hover:text-white"
            title="Toggle Fullscreen Maximize"
          >
            {viewportMode === 'fullscreen' ? <LuMinimize2 className="w-3.5 h-3.5" /> : <LuMaximize2 className="w-3.5 h-3.5" />}
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
        className="w-full flex-1 cursor-grab active:cursor-grabbing select-none"
      />

      {/* Footer Status Overlay */}
      <div className="px-3 py-1 bg-zinc-900/80 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
        <span className="truncate">Met: {materialProperties.metallic.toFixed(2)} | Rgh: {materialProperties.roughness.toFixed(2)} | Spec: {materialProperties.specular.toFixed(2)}</span>
        <span className="shrink-0 text-zinc-500">Drag: Orbit | Wheel: Zoom</span>
      </div>
    </div>
  );
};
