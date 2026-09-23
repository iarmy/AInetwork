// solar.js
// 太阳系三维动画演示，使用Three.js实现

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.153.0/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let sun;
const planets = [];
const planetData = [
  // 名称, 轨道半径, 半径, 公转周期(秒), 颜色
  { name: '水星', orbit: 12, radius: 0.6, period: 8, color: 0xb1b1b1 },
  { name: '金星', orbit: 16, radius: 0.9, period: 20, color: 0xeccc9a },
  { name: '地球', orbit: 20, radius: 1, period: 30, color: 0x3399ff },
  { name: '火星', orbit: 25, radius: 0.8, period: 56, color: 0xff5533 },
  { name: '木星', orbit: 34, radius: 2.5, period: 140, color: 0xd6c08d },
  { name: '土星', orbit: 42, radius: 2.1, period: 350, color: 0xe5d29c },
  { name: '天王星', orbit: 50, radius: 1.5, period: 700, color: 0x7adfff },
  { name: '海王星', orbit: 58, radius: 1.4, period: 1100, color: 0x4666ff }
];

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000010);
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 30, 90);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('solar-container').appendChild(renderer.domElement);

  // 光源
  const light = new THREE.PointLight(0xffffff, 2, 0);
  light.position.set(0, 0, 0);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x333344, 0.6));

  // 太阳
  const sunGeo = new THREE.SphereGeometry(4, 32, 32);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  sun = new THREE.Mesh(sunGeo, sunMat);
  scene.add(sun);

  // 行星和轨道
  planetData.forEach(data => {
    // 行星
    const geo = new THREE.SphereGeometry(data.radius, 24, 24);
    const mat = new THREE.MeshLambertMaterial({ color: data.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = data.orbit;
    scene.add(mesh);
    // 轨道
    const curve = new THREE.EllipseCurve(
      0, 0, data.orbit, data.orbit, 0, 2 * Math.PI, false, 0
    );
    const points = curve.getPoints(100);
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, 0, p.y)));
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x888888 });
    const orbit = new THREE.Line(orbitGeo, orbitMat);
    scene.add(orbit);
    planets.push({ mesh, data });
  });

  // 控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;

  window.addEventListener('resize', onWindowResize);
}

function animate() {
  requestAnimationFrame(animate);
  const t = Date.now() * 0.001;
  planets.forEach(p => {
    const angle = (t / p.data.period) * 2 * Math.PI;
    p.mesh.position.x = Math.cos(angle) * p.data.orbit;
    p.mesh.position.z = Math.sin(angle) * p.data.orbit;
  });
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
animate();
