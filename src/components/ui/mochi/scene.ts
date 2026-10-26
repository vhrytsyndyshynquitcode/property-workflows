import * as THREE from "three"
import { createBlobCreature } from "./blob-creature.js"
import { createGPUFurSystem } from "./fur-system.js"
import { createGPUFurPhysics } from "./gpu-physics.js"

// Сцена талісмана Mochi-Puff (ADR 0004): спрощений main.js демо без середовищ, AR, UI й OrbitControls.
// Очі й тіло стежать за курсором по всьому вікну; наведення на хутро — «погладити», клік — «бупнути».
// Рендер — лише коли полотно видно й вкладка активна; при prefers-reduced-motion — один статичний кадр.

// Пресет «Sakura Mochi» з демо: фіолетова основа й рожеві кінчики — у тон з primary дизайн-системи.
const FUR = {
  baseColor: "#5e2bff",
  tipColor: "#ff9ec7",
  furLength: 0.31,
  furDensity: 0.55, // менше, ніж у демо (0.75): легше для слабких GPU, на вигляд майже те саме
  roughness: 0.77,
  specular: 0.24,
  clumping: 0.35,
  curliness: 0.23,
  lightIntensity: 1.35,
  rimIntensity: 1.35,
  windStrength: 0.6,
  keyColor: "#fff7ed",
  lightAngle: -74,
}

export function mountMochi(container: HTMLElement, { reducedMotion }: { reducedMotion: boolean }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "default" })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.domElement.style.display = "block"
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40)
  camera.position.set(0, 0.3, 6.6)
  camera.lookAt(0, 0.08, 0)

  const keyLight = new THREE.DirectionalLight(FUR.keyColor, FUR.lightIntensity * 1.35)
  const rimLight = new THREE.DirectionalLight("#c4b5fd", FUR.rimIntensity * 1.15)
  rimLight.position.set(-2.4, 1.8, -3.2)
  const hemiLight = new THREE.HemisphereLight("#f5d0fe", "#1e1b4b", 0.85)
  scene.add(keyLight, rimLight, hemiLight)

  const creature = createBlobCreature()
  scene.add(creature.root)
  creature.setEnvironmentScale(1, 0, 0)

  const physics = createGPUFurPhysics(renderer)
  const gpuFur = physics.isGPGPUActive
  const fur = createGPUFurSystem(creature.bodyGeometry, { ...FUR, gpuFurEnabled: gpuFur })
  creature.root.add(fur.shellMesh)
  creature.root.add(fur.strandMesh)

  const rad = (FUR.lightAngle * Math.PI) / 180
  keyLight.position.set(Math.sin(rad) * 2.8, 2.1, Math.cos(rad) * 2.8)
  const u = fur.sharedUniforms
  const physicsTex = u.uPhysicsTex as { value: THREE.Texture | null }
  u.uKeyLightColor.value.set(FUR.keyColor)
  u.uKeyLightDir.value.copy(keyLight.position).normalize()
  creature.skinMaterial.color.set(FUR.baseColor).multiplyScalar(0.55)

  // Курсор: погляд — від центру полотна в межах вікна; петтинг — промінь у тіло істоти.
  const raycaster = new THREE.Raycaster()
  const lookNDC = new THREE.Vector2(0, 0)
  const canvasNDC = new THREE.Vector2(0, 0)
  const pointerLocal = new THREE.Vector3(0, 0, 2)
  const prevPointerLocal = new THREE.Vector3(0, 0, 2)
  const pointerVelocity = new THREE.Vector3()
  let overCreature = false
  let boop = 0
  let downX = 0
  let downY = 0

  function onPointerMove(e: PointerEvent) {
    const box = renderer.domElement.getBoundingClientRect()
    const cx = box.left + box.width / 2
    const cy = box.top + box.height / 2
    lookNDC.set(
      THREE.MathUtils.clamp((e.clientX - cx) / (window.innerWidth / 2), -1, 1),
      THREE.MathUtils.clamp(-(e.clientY - cy) / (window.innerHeight / 2), -1, 1),
    )
    canvasNDC.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1)
    raycaster.setFromCamera(canvasNDC, camera)
    const hit = raycaster.intersectObject(creature.bodyMesh, false)[0]
    if (hit) {
      prevPointerLocal.copy(pointerLocal)
      pointerLocal.copy(hit.point)
      creature.root.worldToLocal(pointerLocal)
      if (overCreature) pointerVelocity.subVectors(pointerLocal, prevPointerLocal).multiplyScalar(32)
      overCreature = true
    } else {
      overCreature = false
      pointerVelocity.multiplyScalar(0.5)
    }
    renderer.domElement.style.cursor = overCreature ? "pointer" : ""
  }
  function onPointerDown(e: PointerEvent) {
    downX = e.clientX
    downY = e.clientY
  }
  function onPointerUp(e: PointerEvent) {
    if (overCreature && Math.hypot(e.clientX - downX, e.clientY - downY) < 6) {
      creature.triggerBoop()
      boop = 1
    }
  }

  function resize() {
    const w = Math.max(1, container.clientWidth)
    const h = Math.max(1, container.clientHeight)
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)

  const clock = new THREE.Clock()
  let elapsed = 0
  let frame = 0
  let visible = true
  const inertiaDisp = new THREE.Vector3()
  const inertiaVel = new THREE.Vector3()
  const force = new THREE.Vector3()

  function renderFrame(dt: number) {
    elapsed += dt
    boop = boop > 0.001 ? boop * Math.exp(-dt * 2.8) : 0
    pointerVelocity.multiplyScalar(Math.exp(-dt * 12))
    creature.update(dt, lookNDC, null, false) // cameraPos потрібен лише в AR

    let physicsTexture = physics.fallbackTexture
    if (gpuFur) {
      physicsTexture = physics.step({
        time: elapsed,
        dt,
        windStrength: FUR.windStrength,
        creatureVelocity: creature.animState.velocity,
        creatureAngularVel: creature.animState.angularVelocity,
        pointerLocalPos: pointerLocal,
        pointerVelocity,
        pointerActive: overCreature,
        boopShockwave: boop,
      })
    } else {
      // Аналітична пружина з демо для пристроїв без GPGPU.
      force.set(0, -0.32, 0).addScaledVector(creature.animState.velocity, -1.65)
      if (overCreature) force.addScaledVector(pointerVelocity, 0.85)
      force.addScaledVector(inertiaDisp, -24)
      inertiaVel.addScaledVector(force, dt).multiplyScalar(Math.exp(-5.5 * dt))
      inertiaDisp.addScaledVector(inertiaVel, dt)
      if (inertiaDisp.lengthSq() > 0.64) inertiaDisp.normalize().multiplyScalar(0.8)
    }

    physicsTex.value = physicsTexture
    u.uTime.value = elapsed
    u.uPointerLocalPos.value.copy(pointerLocal)
    u.uPointerActive.value = overCreature ? 1 : 0
    u.uWebGLInertia.value.copy(inertiaDisp)
    u.uBoopShockwave.value = boop
    renderer.render(scene, camera)
  }

  function loop() {
    frame = requestAnimationFrame(loop)
    const dt = Math.min(clock.getDelta(), 0.033)
    if (visible && !document.hidden) renderFrame(dt)
  }

  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true
  })
  visibility.observe(container)

  if (reducedMotion) {
    // Один кадр без руху: істота дивиться вперед, хутро нерухоме.
    renderFrame(0.016)
  } else {
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    renderer.domElement.addEventListener("pointerdown", onPointerDown)
    renderer.domElement.addEventListener("pointerup", onPointerUp)
    loop()
  }

  return function dispose() {
    cancelAnimationFrame(frame)
    window.removeEventListener("pointermove", onPointerMove)
    renderer.domElement.removeEventListener("pointerdown", onPointerDown)
    renderer.domElement.removeEventListener("pointerup", onPointerUp)
    resizeObserver.disconnect()
    visibility.disconnect()
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      mesh.geometry?.dispose()
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material?.dispose()
    })
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }
}
