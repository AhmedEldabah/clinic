// Real 3D crown (BodyParts3D molar, CC BY-SA 2.1 JP) rendered over the SVG implant.
// If WebGL, the CDN or the model fails, the SVG crown simply stays.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.documentElement;
const stage = document.getElementById('implantStage');
const canvas = document.getElementById('crown3d');
const still = () => root.getAttribute('data-motion') === 'off';

let renderer = null;
try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
} catch (e) { /* no WebGL: keep the SVG crown */ }

if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;

    const scene = new THREE.Scene();
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    camera.position.set(0, 1.0, 2.8);
    camera.lookAt(0, 0.12, 0);

    const key = new THREE.DirectionalLight(0xfff1d6, 3.0);   // warm studio key
    key.position.set(-2.2, 2.6, 1.6);
    const rim = new THREE.DirectionalLight(0xffe2a8, 2.4);   // gold rim, like the hero glow
    rim.position.set(2.5, 1.2, -2.5);
    scene.add(key, rim, new THREE.HemisphereLight(0xfff4e0, 0x0b0b0c, 0.25));

    const pivot = new THREE.Group();
    scene.add(pivot);

    const clock = new THREE.Clock();
    let introStart = 0;
    let running = false;
    let onScreen = true;

    const frame = () => {
        const t = clock.getElapsedTime();
        const s = still();
        const p = s ? 1 : Math.min(1, (t - introStart) / 1.4);
        const drop = 1 - Math.pow(1 - p, 3);
        const hover = s ? 0 : (1 - Math.cos(t * Math.PI * 2 / 9)) * 0.06;
        pivot.position.y = (1 - drop) * 0.9 + hover;
        pivot.rotation.y = -0.5 + (s ? 0 : t * 0.32);
        pivot.rotation.z = s ? 0 : Math.sin(t * 0.7) * 0.04;
        renderer.render(scene, camera);
    };
    const updateLoop = () => {
        running = !still() && onScreen && !document.hidden && pivot.children.length > 0;
        renderer.setAnimationLoop(running ? frame : null);
        if (!running && pivot.children.length) frame();
    };
    const resize = () => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (!running && pivot.children.length) frame();
    };

    new GLTFLoader().load('assets/molar-crown.glb', (gltf) => {
        let mesh = null;
        gltf.scene.traverse((o) => { if (o.isMesh) mesh = o; });
        if (!mesh) return;
        mesh.geometry = toCreasedNormals(mesh.geometry, Math.PI / 4); // keeps the cut margin crisp
        // Glossy ceramic. No clearcoat: it draws a dark seam along the molar's fissures.
        mesh.material = new THREE.MeshPhysicalMaterial({
            color: 0xEFEBE2, roughness: 0.24, specularIntensity: 1, ior: 1.6,
            sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xfff0d6), envMapIntensity: 0.45
        });
        pivot.add(mesh);
        // Wait for the curtain so the drop-in is actually seen
        setTimeout(() => {
            introStart = clock.getElapsedTime();
            resize();
            stage.classList.add('crown-3d-ready');
            updateLoop();
        }, Math.max(0, 1200 - performance.now()));
    }, undefined, () => { /* model failed to load: keep the SVG crown */ });

    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver((entries) => { onScreen = entries[0].isIntersecting; updateLoop(); }).observe(stage);
    document.addEventListener('visibilitychange', updateLoop);
    new MutationObserver(updateLoop).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
}
