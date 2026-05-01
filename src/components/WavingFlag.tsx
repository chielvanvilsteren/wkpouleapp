'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Wave params (matching CodePen defaults)
const SEG_W = 30
const SEG_H = 20
const SIZE_W = 30
const SIZE_H = 20
const H_WAVE = 0.5
const V_WAVE = 0.3
const SWING = 0.2
const SPEED = 0.5

export default function WavingFlag({ width = 400, height = 267 }: { width?: number; height?: number }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Scene + camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000)
    camera.position.set(0, 0, 40)
    camera.lookAt(new THREE.Vector3(0, 0, 0))

    // Renderer — transparent background so hero gradient shows through
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    // Lights
    const dirLight = new THREE.DirectionalLight('#ffffff', 1.2)
    dirLight.position.set(10, 30, 60)
    scene.add(dirLight)
    scene.add(new THREE.AmbientLight('#aaaaaa'))

    // Flagpole — golden cylinder
    const poleGeo = new THREE.CylinderGeometry(0.3, 0.3, SIZE_H + 8, 12)
    const poleMat = new THREE.MeshPhongMaterial({ color: '#c8a060', shininess: 60 })
    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.position.set(-SIZE_W / 2, 0, 0)
    scene.add(pole)

    // Dutch flag texture — drawn on canvas
    const texCanvas = document.createElement('canvas')
    texCanvas.width = 300
    texCanvas.height = 200
    const ctx = texCanvas.getContext('2d')!
    const stripe = 200 / 3
    ctx.fillStyle = '#AE1C28'; ctx.fillRect(0, 0, 300, stripe)
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, stripe, 300, stripe)
    ctx.fillStyle = '#21468B'; ctx.fillRect(0, stripe * 2, 300, stripe)
    const texture = new THREE.CanvasTexture(texCanvas)

    // Flag mesh — PlaneGeometry with many segments for smooth waves
    const flagGeo = new THREE.PlaneGeometry(SIZE_W, SIZE_H, SEG_W, SEG_H)
    const flagMat = new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide })
    const flag = new THREE.Mesh(flagGeo, flagMat)
    scene.add(flag)

    const posAttr = flagGeo.attributes.position as THREE.BufferAttribute

    let animId: number
    const animate = () => {
      const time = Date.now() * SPEED / 50
      for (let y = 0; y <= SEG_H; y++) {
        for (let x = 0; x <= SEG_W; x++) {
          const i = x + y * (SEG_W + 1)
          // x offset from left edge: flag is centered, so shift by half width
          const xLocal = x - SEG_W / 2 + SEG_W / 2  // x from 0..SEG_W
          posAttr.setZ(i, Math.sin(H_WAVE * x + V_WAVE * y - time) * SWING * x / 4)
        }
      }
      posAttr.needsUpdate = true
      flagGeo.computeVertexNormals()
      renderer.render(scene, camera)
      animId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [width, height])

  return (
    <div
      ref={mountRef}
      className="rounded-lg overflow-hidden drop-shadow-2xl"
      style={{ width, height }}
    />
  )
}
