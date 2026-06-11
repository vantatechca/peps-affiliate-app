import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { NEON, HOT } from "../theme";

const FRESNEL_VERT = `
  varying vec3 vN; varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const FRESNEL_FRAG = `
  varying vec3 vN; varying vec3 vView; uniform vec3 uColor;
  void main() {
    float f = pow(1.0 - abs(dot(vN, vView)), 2.6);
    gl_FragColor = vec4(uColor, f * 0.9);
  }`;

/* Ring of small glowing nodes orbiting the core. */
function OrbitNodes({ count = 7, radius = 2.25 }) {
  const group = useRef();
  const nodes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return [Math.cos(a) * radius, Math.sin(a * 1.7) * 0.55, Math.sin(a) * radius];
      }),
    [count, radius]
  );
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.28;
  });
  return (
    <group ref={group}>
      {nodes.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.052, 16, 16]} />
          <meshBasicMaterial color={i % 4 === 0 ? HOT : NEON} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function CommissionCore() {
  const group = useRef();
  const wire = useRef();
  const fresnelUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(NEON) } }),
    []
  );

  useFrame((state, dt) => {
    if (group.current) {
      group.current.rotation.y += dt * 0.18;
      group.current.rotation.x = THREE.MathUtils.lerp(
        group.current.rotation.x,
        state.pointer.y * 0.32,
        0.05
      );
      group.current.position.x = THREE.MathUtils.lerp(
        group.current.position.x,
        state.pointer.x * 0.35,
        0.05
      );
    }
    if (wire.current) wire.current.rotation.y -= dt * 0.12;
  });

  return (
    <>
      <ambientLight intensity={0.22} />
      <pointLight position={[5, 4, 6]} intensity={55} color={NEON} />
      <pointLight position={[-6, -2, -3]} intensity={34} color={HOT} />
      <pointLight position={[2, 2, 5]} intensity={18} color="#ffffff" />

      <Float speed={1.5} rotationIntensity={0.25} floatIntensity={0.7}>
        <group ref={group}>
          {/* morphing core */}
          <mesh>
            <icosahedronGeometry args={[1.2, 14]} />
            <MeshDistortMaterial
              color="#03140f"
              emissive={NEON}
              emissiveIntensity={0.16}
              roughness={0.26}
              metalness={0.96}
              distort={0.26}
              speed={1.6}
            />
          </mesh>
          {/* wireframe shell */}
          <mesh ref={wire} scale={1.2}>
            <icosahedronGeometry args={[1.2, 2]} />
            <meshBasicMaterial color={NEON} wireframe transparent opacity={0.22} toneMapped={false} />
          </mesh>
          {/* fresnel atmosphere rim */}
          <mesh scale={1.3}>
            <sphereGeometry args={[1.2, 64, 64]} />
            <shaderMaterial
              transparent
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              uniforms={fresnelUniforms}
              vertexShader={FRESNEL_VERT}
              fragmentShader={FRESNEL_FRAG}
            />
          </mesh>
          {/* equator ring */}
          <mesh rotation={[Math.PI / 2.05, 0, 0.2]}>
            <torusGeometry args={[2.25, 0.012, 12, 160]} />
            <meshBasicMaterial color={NEON} transparent opacity={0.45} toneMapped={false} />
          </mesh>
          <OrbitNodes />
        </group>
      </Float>

      <Sparkles count={80} scale={[10, 7, 10]} size={2.4} speed={0.35} opacity={0.7} color={NEON} noise={1.6} />
    </>
  );
}
