import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

export interface Dice3DProps {
  /** pixel size of canvas */
  size?: number;
  /** roll animation duration in ms */
  duration?: number;
  /** callback when roll ends */
  onRoll?: (face: number) => void;
  className?: string;
  /** if true, only spin in place; if false, do screen bounces */
  spinOnly?: boolean;
}

export interface Dice3DHandle {
  roll: () => void;
  rollTo: (face: number) => void;
}

/**
 * Dice3D – simple WebGL dice rendered with three.js
 * Usage:
 *   const diceRef = useRef<Dice3DHandle>(null);
 *   <Dice3D ref={diceRef} onRoll={(f)=>console.log(f)}/>
 *   diceRef.current?.roll();
 */
const Dice3D = forwardRef<Dice3DHandle, Dice3DProps>(
  ({ size = 180, duration = 1200, onRoll, className, spinOnly = true }: Dice3DProps, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sceneRef = useRef<THREE.Scene>();
    const cubeRef = useRef<THREE.Mesh>();
    const rendererRef = useRef<THREE.WebGLRenderer>();
    const cameraRef = useRef<THREE.PerspectiveCamera>();
    const animIdRef = useRef(0);
    const lastRequestRef = useRef<any>(null);
    const isSettledRef = useRef<boolean>(true); // when true, dice remain static until next roll
    const spinningTweenRef = useRef<any>(null);
    const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

    /** helper to create a texture with pips */
    const createFaceTexture = (face: number): THREE.Texture => {
      const size = 128;
      const cvs = document.createElement('canvas');
      cvs.width = cvs.height = size;
      const ctx = cvs.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#111';

      const dot = (x: number, y: number) => {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
      };
      const g = size * 0.25;
      const centers: Record<number, Array<[number, number]>> = {
        1: [[size / 2, size / 2]],
        2: [[g, g], [size - g, size - g]],
        3: [[g, g], [size / 2, size / 2], [size - g, size - g]],
        4: [[g, g], [size - g, g], [g, size - g], [size - g, size - g]],
        5: [[g, g], [size - g, g], [size / 2, size / 2], [g, size - g], [size - g, size - g]],
        6: [[g, g], [size - g, g], [g, size / 2], [size - g, size / 2], [g, size - g], [size - g, size - g]],
      };
      centers[face].forEach(([x, y]) => dot(x, y));
      const tex = new THREE.CanvasTexture(cvs);
      tex.needsUpdate = true;
      return tex;
    };

    // initialize three scene
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Check if WebGL is available
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('WebGL not supported, Dice3D component will not render');
        setWebglSupported(false);
        return;
      }
      setWebglSupported(true);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.position.z = 4;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setSize(size, size);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      } catch (error) {
        console.error('Failed to create WebGL renderer:', error);
        return;
      }

      // lights
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);
      const dir = new THREE.DirectionalLight(0xffffff, 1.0);
      dir.position.set(5, 10, 7);
      dir.castShadow = true;
      dir.shadow.mapSize.width = 1024;
      dir.shadow.mapSize.height = 1024;
      dir.shadow.camera.left = -5;
      dir.shadow.camera.right = 5;
      dir.shadow.camera.top = 5;
      dir.shadow.camera.bottom = -5;
      scene.add(dir);

      // ground plane to receive shadow
      const planeGeo = new THREE.PlaneGeometry(10, 10);
      const planeMat = new THREE.ShadowMaterial({ opacity: 0.35 });
      const plane = new THREE.Mesh(planeGeo, planeMat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = -1.1;
      plane.receiveShadow = true;
      scene.add(plane);

      // Create a simple procedural equirectangular-like texture for subtle reflections
      let generatedEnvMap: THREE.Texture | null = null;
      try {
        const envCanvas = document.createElement('canvas');
        envCanvas.width = envCanvas.height = 256;
        const ectx = envCanvas.getContext('2d')!;
        // simple radial gradient
        const grad = ectx.createRadialGradient(128, 128, 20, 128, 128, 140);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#ccccff');
        grad.addColorStop(1, '#556688');
        ectx.fillStyle = grad;
        ectx.fillRect(0, 0, 256, 256);
        const envTex = new THREE.CanvasTexture(envCanvas);
        envTex.mapping = THREE.EquirectangularReflectionMapping;
        const pmremGen = new THREE.PMREMGenerator(renderer);
        pmremGen.compileEquirectangularShader();
        generatedEnvMap = pmremGen.fromEquirectangular(envTex).texture;
        scene.environment = generatedEnvMap;
      } catch (e) {
        // ignore if PMREM not supported in environment
        generatedEnvMap = null;
      }

      // cube
      const materials = [1, 2, 3, 4, 5, 6].map(f => new THREE.MeshStandardMaterial({ map: createFaceTexture(f), metalness: 0.4, roughness: 0.25, envMapIntensity: 1.0 }));
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const cube = new THREE.Mesh(geometry, materials);
      cube.castShadow = true;
      cube.receiveShadow = false;
      scene.add(cube);

      // If we generated an environment map, apply it to materials for reflections
      if (generatedEnvMap) {
        try {
          materials.forEach((m: any) => {
            m.envMap = generatedEnvMap;
            m.envMapIntensity = 0.8;
            m.needsUpdate = true;
          });
        } catch (e) {}
      }

      sceneRef.current = scene;
      cubeRef.current = cube;
      rendererRef.current = renderer;
      cameraRef.current = camera;

      // Ensure canvas is anchored bottom-right and has no initial transform
      try {
        const el = canvas as HTMLCanvasElement;
        el.style.position = 'fixed';
        el.style.right = '20px';
        el.style.bottom = '20px';
        el.style.left = '';
        el.style.top = '';
        el.style.transform = '';
        el.style.transition = '';
      } catch (e) {}

      // animation loop
      // previous rotation for motion-blur estimation
      const prevRot = { x: 0, y: 0, z: 0 };
      const animate = () => {
        animIdRef.current = requestAnimationFrame(animate);
        // subtle idle rotate
        if (cube) {
          // only apply subtle idle motion while an active roll timeline is running
          if (!isSettledRef.current) {
            cube.rotation.x *= 0.995;
            cube.rotation.y *= 0.995;

            // compute angular velocity
            const dx = cube.rotation.x - prevRot.x;
            const dy = cube.rotation.y - prevRot.y;
            const dz = cube.rotation.z - prevRot.z;
            const angSpeed = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // map angular speed to CSS blur (px)
            const blurPx = Math.min(12, angSpeed * 120);
            try {
              const el = canvas as HTMLCanvasElement;
              if (el && el.style) {
                el.style.filter = blurPx > 0.3 ? `blur(${blurPx.toFixed(2)}px)` : 'none';
              }
            } catch (e) {}

            prevRot.x = cube.rotation.x;
            prevRot.y = cube.rotation.y;
            prevRot.z = cube.rotation.z;
          } else {
            // settled: ensure no blur and reset prevRot
            try { const el = canvas as HTMLCanvasElement; if (el && el.style) el.style.filter = 'none'; } catch(e) {}
            prevRot.x = cube.rotation.x;
            prevRot.y = cube.rotation.y;
            prevRot.z = cube.rotation.z;
          }
        }
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(animIdRef.current);
        renderer.dispose();
      };
    }, [size]);

    // roll logic (includes DOM motion)
    const rollInternal = useCallback((targetFace?: number) => {
      if (!cubeRef.current) return;
      const cube = cubeRef.current;
      // pick target if not provided
      const face = targetFace ?? (1 + Math.floor(Math.random() * 6));

      // orientation map: face -> Euler rotation (approx)
      const orientations: Record<number, [number, number, number]> = {
        1: [0, 0, 0],
        2: [0, Math.PI / 2, 0],
        3: [-Math.PI / 2, 0, 0],
        4: [Math.PI / 2, 0, 0],
        5: [0, -Math.PI / 2, 0],
        6: [Math.PI, 0, 0],
      };
      // Support an override mapping from engine face -> visual orientation index for quick calibration
      const faceMap = (window as any).__pc_dice_face_map as number[] | undefined;
      const mappedFace = (faceMap && Number.isFinite(faceMap[face]) ? faceMap[face] : face) as number;
      const [tx, ty, tz] = orientations[mappedFace];

      // compute a target quaternion for exact-face alignment (prefer quaternion-based final set)
      let targetQuat: THREE.Quaternion | null = null;
      try {
        const faceNormals: Record<number, THREE.Vector3> = {
          1: new THREE.Vector3(1, 0, 0),   // +X
          2: new THREE.Vector3(-1, 0, 0),  // -X
          3: new THREE.Vector3(0, 1, 0),   // +Y
          4: new THREE.Vector3(0, -1, 0),  // -Y
          5: new THREE.Vector3(0, 0, 1),   // +Z
          6: new THREE.Vector3(0, 0, -1),  // -Z
        };
        const normal = faceNormals[mappedFace];
        if (normal) {
          const target = new THREE.Vector3(0, 0, 1); // point towards camera
          targetQuat = new THREE.Quaternion().setFromUnitVectors(normal.clone().normalize(), target);
        }
      } catch (e) { targetQuat = null; }

      const start = { x: cube.rotation.x, y: cube.rotation.y, z: cube.rotation.z };
      const end = { x: tx + 2 * Math.PI, y: ty + 2 * Math.PI, z: tz + 2 * Math.PI };

      // Ensure any previous rotation tweens on cube are killed so they can't override final orientation
      try { if (cube) { gsap.killTweensOf(cube); gsap.killTweensOf(cube.rotation); } } catch (e) {}
      // Use GSAP timeline for smooth rotation + bounces and DOM motion
      const timeline = gsap.timeline({ onStart: () => {
        // mark as active so idle loop applies motion
        try { isSettledRef.current = false; } catch(e) {}
      }, onComplete: () => {
        // explicitly kill any remaining tweens affecting cube
        try { if (cube) { gsap.killTweensOf(cube); gsap.killTweensOf(cube.rotation); } } catch(e) {}
        // if we could compute a target quaternion, apply it to show the correct face deterministically
        if (targetQuat && cube) {
          try {
            cube.quaternion.copy(targetQuat);
            try { gsap.set(cube.quaternion, { x: targetQuat.x, y: targetQuat.y, z: targetQuat.z, w: targetQuat.w }); } catch(e) {}
          } catch(e) { /* fallback to euler */ }
        } else {
          cube.rotation.set(tx, ty, tz);
          try { gsap.set(cube.rotation, { x: tx, y: ty, z: tz }); } catch(e) {}
        }
        // force a final render so the UI immediately reflects the exact face
        try { rendererRef.current?.render(sceneRef.current as any, cameraRef.current as any); } catch(e) {}
        try { isSettledRef.current = true; } catch(e) {}
        enhancedOnRoll(face);
      }});

      // ensure any previous tweens are cleared and canvas anchored bottom-right
      const canvasEl = canvasRef.current as HTMLCanvasElement | null;
      if (canvasEl) {
        try { gsap.killTweensOf(canvasEl); } catch (e) {}
        try {
          canvasEl.style.transform = '';
          canvasEl.style.transition = '';
          canvasEl.style.left = '';
          canvasEl.style.top = '';
          canvasEl.style.right = '20px';
          canvasEl.style.bottom = '20px';
          canvasEl.style.willChange = 'auto';
        } catch (e) {}
      }

      if (spinOnly) {
        // keep canvas fixed bottom-right with no transform
        if (canvasEl && canvasEl.style) {
          gsap.set(canvasEl, { x: 0, y: 0, filter: 'blur(0px)' });
          canvasEl.style.right = '20px';
          canvasEl.style.bottom = '20px';
        }
      } else {
        // physics-like multi-bounce motion across screen
        if (canvasEl && canvasEl.style) {
          canvasEl.style.position = 'fixed';
          canvasEl.style.left = '0px';
          canvasEl.style.top = '0px';
          canvasEl.style.willChange = 'transform, filter';

          // initial velocity and angle
          const speedBase = Math.max(200, duration * 0.6); // px per second scale
          const angle = Math.random() * Math.PI * 2;
          let vx = Math.cos(angle) * (speedBase * (0.6 + Math.random() * 0.8));
          let vy = Math.sin(angle) * (speedBase * (0.6 + Math.random() * 0.8));

          // start position: bottom-right corner with small margin
          const margin = 20;
          const startX = Math.max(0, window.innerWidth - size - margin);
          const startY = Math.max(0, window.innerHeight - size - margin);
          let x = startX;
          let y = startY;
          gsap.set(canvasEl, { x, y, filter: 'blur(0px)' });

          // final target: within 100px radius around screen center
          const centerX = Math.round(window.innerWidth / 2 - size / 2);
          const centerY = Math.round(window.innerHeight / 2 - size / 2);
          const radius = 100;
          const angT = Math.random() * Math.PI * 2;
          const endX = Math.max(0, Math.min(window.innerWidth - size, centerX + Math.cos(angT) * (Math.random() * radius)));
          const endY = Math.max(0, Math.min(window.innerHeight - size, centerY + Math.sin(angT) * (Math.random() * radius)));

          // generate bounces until energy low or max 6 bounces
          const bounces: Array<{ nx: number; ny: number; dur: number; blur: number }> = [];
          let energy = Math.hypot(vx, vy);
          const damp = 0.45 + Math.random() * 0.18; // energy retention per bounce
          const maxBounces = 6;
          for (let i = 0; i < maxBounces && energy > 80; i++) {
            // project next position with simple friction
            const dt = (duration / 1000) * (0.25 + Math.random() * 0.35);
            const nx = x + vx * dt;
            const ny = y + vy * dt + 200 * (Math.random() - 0.5) * 0.1; // slight gravity variation
            const dur = Math.max(0.06, dt * (0.6 + Math.random() * 0.6));
            const blur = Math.min(6, energy / 200);
            bounces.push({ nx, ny, dur, blur });

            // update for next
            x = nx; y = ny;
            energy *= damp * (0.8 + Math.random() * 0.4);
            // random angle change
            const angChange = (Math.random() - 0.5) * 0.8;
            const vAngle = Math.atan2(vy, vx) + angChange;
            const vMag = energy;
            vx = Math.cos(vAngle) * vMag * 0.02;
            vy = Math.sin(vAngle) * vMag * 0.02;
          }

          // schedule bounces in timeline
          let tOffset = 0;
          for (const b of bounces) {
            timeline.to(canvasEl, { duration: b.dur, x: b.nx, y: b.ny, ease: 'power2.out' }, tOffset);
            timeline.to(canvasEl, { duration: b.dur, filter: `blur(${b.blur}px)` }, tOffset);
            tOffset += b.dur * 0.9;
          }
          // final settle to the computed center-target
          timeline.to(canvasEl, { duration: 0.12, x: endX, y: endY, ease: 'power1.out' }, '>-0.02');
          timeline.to(canvasEl, { duration: 0.12, filter: 'blur(0px)', ease: 'power1.out' }, '>-0.02');
        }
      }

      // rotation: spin multiple revolutions then ease to final orientation
      // we'll use a GSAP ticker to update cube.rotation
      const totalSpins = 3 + Math.floor(Math.random() * 4);
      const rotEnd = { x: end.x, y: end.y, z: end.z };
      const rotStart = { x: start.x, y: start.y, z: start.z };

      // animate rotation using timeline with an onUpdate that writes to cube
      let progress = { t: 0 };
      timeline.to(progress, {
        t: 1,
        duration: duration / 1000,
        ease: 'power3.out',
        onUpdate: () => {
          const k = progress.t;
          // combine ease with extra spins
          const spinFactor = 1 - Math.pow(1 - k, 3);
          const currentX = rotStart.x + (rotEnd.x - rotStart.x) * k + totalSpins * Math.PI * 2 * (1 - (1 - k));
          const currentY = rotStart.y + (rotEnd.y - rotStart.y) * k + totalSpins * Math.PI * 2 * (1 - (1 - k));
          const currentZ = rotStart.z + (rotEnd.z - rotStart.z) * k + totalSpins * Math.PI * 2 * (1 - (1 - k));
          cube.rotation.set(currentX, currentY, currentZ);
        }
      });

      // small multi-bounce sequence on completion (scale + tilt)
      timeline.to(cube.scale, { x: 1.08, y: 0.90, z: 0.9, duration: 0.07, ease: 'power2.out' }, '>-0.05');
      timeline.to(cube.scale, { x: 0.95, y: 1.07, z: 0.95, duration: 0.06, ease: 'power2.in' });
      timeline.to(cube.scale, { x: 1.03, y: 0.98, z: 1.02, duration: 0.05, ease: 'power2.out' });
      timeline.to(cube.scale, { x: 1, y: 1, z: 1, duration: 0.04, ease: 'power2.out' });
    }, [duration, onRoll, spinOnly, size]);

    useImperativeHandle(ref, () => ({
      roll: () => rollInternal(),
      rollTo: (face: number) => rollInternal(Math.max(1, Math.min(6, face))),
    }), [rollInternal]);

    // click to roll
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const handler = () => rollInternal();
      canvas.addEventListener('click', handler);
      return () => canvas.removeEventListener('click', handler);
    }, [rollInternal]);

    // auto-roll when requested by corruption system
    useEffect(() => {
      const handler = (ev: any) => {
        console.log('🎲 DICE: Received auto-roll request (start visual spin)', ev.detail);
        lastRequestRef.current = ev.detail; // store player/targetUid
        // start a visual spin without finalizing face - wait for engine result
        try {
          isSettledRef.current = false;
          if (spinningTweenRef.current) { try { spinningTweenRef.current.kill(); } catch(e) {} }
          const cube = cubeRef.current;
          if (cube) {
            spinningTweenRef.current = gsap.to(cube.rotation, { y: '+=6.283', duration: 0.6, repeat: -1, ease: 'none' });
          }
        } catch(e) { console.debug('dice spin start error', e); }
      };
      window.addEventListener('pc:ui_request_dice_roll', handler as EventListener);
      return () => window.removeEventListener('pc:ui_request_dice_roll', handler as EventListener);
    }, [rollInternal]);

    // listen for engine-calculated dice result to display exact value
    useEffect(() => {
      const handler = (ev: any) => {
        const { roll } = ev.detail || {};
        if (roll && typeof roll === 'number' && roll >= 1 && roll <= 6) {
          console.log('🎲 DICE: Engine calculated roll received:', roll, '- displaying exact value');
          lastRequestRef.current = ev.detail; // store player/targetUid
          // stop any visual spinning tween before finalizing to exact face
          try { if (spinningTweenRef.current) { spinningTweenRef.current.kill(); spinningTweenRef.current = null; } } catch(e) {}
          // ensure no lingering tweens apply, then display exact face
          try { const cube = cubeRef.current; if (cube) { gsap.killTweensOf(cube); gsap.killTweensOf(cube.rotation); } } catch(e) {}
          rollInternal(roll); // roll to exact face
        }
      };
      window.addEventListener('pc:engine_dice_result', handler as EventListener);
      return () => window.removeEventListener('pc:engine_dice_result', handler as EventListener);
    }, [rollInternal]);

    // dispatch dice result including player info
    const enhancedOnRoll = useCallback((face:number)=>{
      onRoll?.(face);
      try {
        const det = lastRequestRef.current || {};
        window.dispatchEvent(new CustomEvent('pc:dice_result', { detail: { roll: face, player: det.player, targetUid: det.targetUid } }));
      } catch(e){ console.error('dice_result dispatch error',e); }
    },[onRoll]);

    // Fallback component for when WebGL is not supported
    const FallbackDice = () => (
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: '#333',
          border: '2px solid #666',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '14px',
          cursor: 'pointer',
          position: 'relative'
        }}
        onClick={() => onRoll?.(1 + Math.floor(Math.random() * 6))}
        className={className}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>🎲</div>
          <div>Click to roll</div>
        </div>
      </div>
    );

    // Show fallback if WebGL is not supported
    if (webglSupported === false) {
      return <FallbackDice />;
    }

    // Show loading state while checking WebGL support
    if (webglSupported === null) {
      return (
        <div
          style={{
            width: size,
            height: size,
            backgroundColor: '#222',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '12px'
          }}
          className={className}
        >
          Loading...
        </div>
      );
    }

    return <canvas ref={canvasRef} width={size} height={size} className={className} style={{ cursor: 'pointer' }} />;
  });

export default Dice3D;
