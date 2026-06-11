import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { NEON, HOT } from "../theme";

const R = 2.4;

const RIM_VERT = `
  varying vec3 vN; varying vec3 vView;
  void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vView = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const RIM_FRAG = `
  varying vec3 vN; varying vec3 vView; uniform vec3 uColor;
  void main(){ float f = pow(1.0 - abs(dot(vN, vView)), 2.2); gl_FragColor = vec4(uColor, f * 1.4); }`;

function latLngToVec3(lat, lng, r = R) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

const HUBS = [
  { lat: 43.65, lng: -79.38 }, // 0 Toronto
  { lat: 37.77, lng: -122.42 }, // 1 SF
  { lat: 51.5, lng: -0.12 }, // 2 London
  { lat: 52.52, lng: 13.4 }, // 3 Berlin
  { lat: 1.35, lng: 103.82 }, // 4 Singapore
  { lat: -33.87, lng: 151.21 }, // 5 Sydney
  { lat: -23.55, lng: -46.63 }, // 6 Sao Paulo
  { lat: 25.2, lng: 55.27 }, // 7 Dubai
];
const PAIRS = [
  [1, 2], [2, 4], [0, 1], [2, 3], [4, 5], [2, 7], [0, 6], [7, 4],
];

function Pulses({ curves }) {
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    curves.forEach((c, i) => {
      const m = refs.current[i];
      if (!m) return;
      const tt = (t * 0.28 + i * 0.17) % 1;
      const p = c.getPoint(tt);
      m.position.set(p.x, p.y, p.z);
    });
  });
  return (
    <>
      {curves.map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color={i % 3 === 0 ? HOT : "#eafffd"} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

export default function DotGlobe() {
  const grp = useRef();

  const positions = useMemo(() => {
    const N = 1500;
    const arr = new Float32Array(N * 3);
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = phi * i;
      arr[i * 3] = Math.cos(th) * rad * R;
      arr[i * 3 + 1] = y * R;
      arr[i * 3 + 2] = Math.sin(th) * rad * R;
    }
    return arr;
  }, []);

  const rimUniforms = useMemo(() => ({ uColor: { value: new THREE.Color(NEON) } }), []);
  const hubVecs = useMemo(() => HUBS.map((h) => latLngToVec3(h.lat, h.lng)), []);
  const curves = useMemo(
    () =>
      PAIRS.map(([a, b]) => {
        const A = hubVecs[a];
        const B = hubVecs[b];
        const mid = A.clone().add(B).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.45);
        return new THREE.QuadraticBezierCurve3(A, mid, B);
      }),
    [hubVecs]
  );
  const arcPts = useMemo(() => curves.map((c) => c.getPoints(46)), [curves]);

  useFrame((_, dt) => {
    if (grp.current) grp.current.rotation.y += dt * 0.085;
  });

  return (
    <group ref={grp} rotation={[0.32, 0, 0]}>
      {/* faint solid core so back dots are occluded */}
      <mesh>
        <sphereGeometry args={[R * 0.985, 48, 48]} />
        <meshBasicMaterial color="#03231d" transparent opacity={0.9} />
      </mesh>
      {/* lat/long grid */}
      <mesh>
        <sphereGeometry args={[R * 0.995, 30, 20]} />
        <meshBasicMaterial color={NEON} wireframe transparent opacity={0.06} toneMapped={false} />
      </mesh>

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.05} color={NEON} transparent opacity={0.9} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* fresnel atmosphere */}
      <mesh scale={1.16}>
        <sphereGeometry args={[R, 64, 64]} />
        <shaderMaterial transparent side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} uniforms={rimUniforms} vertexShader={RIM_VERT} fragmentShader={RIM_FRAG} />
      </mesh>

      {hubVecs.map((v, i) => (
        <mesh key={i} position={v}>
          <sphereGeometry args={[0.055, 14, 14]} />
          <meshBasicMaterial color={i % 3 === 0 ? HOT : NEON} toneMapped={false} />
        </mesh>
      ))}

      {arcPts.map((pts, i) => (
        <Line key={i} points={pts} color={NEON} lineWidth={1.1} transparent opacity={0.45} />
      ))}

      <Pulses curves={curves} />
    </group>
  );
}
