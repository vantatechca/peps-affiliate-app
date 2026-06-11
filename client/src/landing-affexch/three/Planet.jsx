import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NEON } from "../theme";

const RIM_VERT = `
  varying vec3 vN; varying vec3 vView;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    vN = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const RIM_FRAG = `
  varying vec3 vN; varying vec3 vView; uniform vec3 uColor; uniform float uPow; uniform float uIntensity;
  void main(){
    float f = pow(1.0 - abs(dot(vN, vView)), uPow);
    gl_FragColor = vec4(uColor, f * uIntensity);
  }`;

/* A glowing wireframe planet with a fresnel atmosphere. Reused by Ecosystem. */
export default function Planet({ radius = 2.4, spin = 0.05, rimPow = 2.1, rimIntensity = 1.7 }) {
  const grp = useRef();
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(NEON) },
      uPow: { value: rimPow },
      uIntensity: { value: rimIntensity },
    }),
    [rimPow, rimIntensity]
  );
  useFrame((_, dt) => {
    if (grp.current) grp.current.rotation.y += dt * spin;
  });
  return (
    <group ref={grp}>
      {/* solid body */}
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial color="#06372b" emissive={NEON} emissiveIntensity={0.2} metalness={0.25} roughness={0.5} />
      </mesh>
      {/* lat/long grid */}
      <mesh scale={1.003}>
        <sphereGeometry args={[radius, 36, 24]} />
        <meshBasicMaterial color={NEON} wireframe transparent opacity={0.17} toneMapped={false} />
      </mesh>
      {/* fresnel atmosphere */}
      <mesh scale={1.16}>
        <sphereGeometry args={[radius, 64, 64]} />
        <shaderMaterial
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={RIM_VERT}
          fragmentShader={RIM_FRAG}
        />
      </mesh>
    </group>
  );
}
