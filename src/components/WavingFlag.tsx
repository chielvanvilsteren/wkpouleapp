"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const SEG_W = 30,
  SEG_H = 20,
  SIZE_W = 30,
  SIZE_H = 20;
const H_WAVE = 0.5,
  V_WAVE = 0.3,
  SWING = 0.2,
  SPEED = 0.5;
const ASPECT = SIZE_W / SIZE_H; // 3:2

function makeDutchTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 300;
  c.height = 200;
  const ctx = c.getContext("2d")!;
  const s = 200 / 3;
  ctx.fillStyle = "#AE1C28";
  ctx.fillRect(0, 0, 300, s);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, s, 300, s);
  ctx.fillStyle = "#21468B";
  ctx.fillRect(0, s * 2, 300, s);
  return new THREE.CanvasTexture(c);
}

type Props = {
  className?: string;
  flagUrl?: string | null;
};

export default function WavingFlag({ className = "", flagUrl }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.MeshLambertMaterial | null>(null);

  // Scene — mount once
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let w = mount.clientWidth;
    let h = Math.round(w / ASPECT);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, ASPECT, 1, 1000);
    camera.position.set(0, 0, 40);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const dir = new THREE.DirectionalLight("#ffffff", 1.2);
    dir.position.set(10, 30, 60);
    scene.add(dir);
    scene.add(new THREE.AmbientLight("#aaaaaa"));

    const flagGeo = new THREE.PlaneGeometry(SIZE_W, SIZE_H, SEG_W, SEG_H);
    const flagMat = new THREE.MeshLambertMaterial({
      map: makeDutchTexture(),
      side: THREE.DoubleSide,
    });
    materialRef.current = flagMat;
    scene.add(new THREE.Mesh(flagGeo, flagMat));

    const posAttr = flagGeo.attributes.position as THREE.BufferAttribute;

    const ro = new ResizeObserver(() => {
      w = mount.clientWidth;
      h = Math.round(w / ASPECT);
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    let animId: number;
    const animate = () => {
      const t = (Date.now() * SPEED) / 50;
      for (let y = 0; y <= SEG_H; y++)
        for (let x = 0; x <= SEG_W; x++)
          posAttr.setZ(
            x + y * (SEG_W + 1),
            (Math.sin(H_WAVE * x + V_WAVE * y - t) * SWING * x) / 4,
          );
      posAttr.needsUpdate = true;
      flagGeo.computeVertexNormals();
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, []);

  // Texture swap — runs when flagUrl changes
  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    if (!flagUrl) {
      mat.map = makeDutchTexture();
      mat.needsUpdate = true;
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(flagUrl, (tex) => {
      if (!materialRef.current) return;
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      materialRef.current.map = tex;
      materialRef.current.needsUpdate = true;
    });
  }, [flagUrl]);

  return (
    <div
      ref={mountRef}
      className={`w-full overflow-hidden ${className}`}
      style={{ aspectRatio: `${ASPECT}` }}
    />
  );
}
