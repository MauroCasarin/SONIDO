import React, { useRef, useEffect, useCallback, useLayoutEffect, useState } from 'react';
import * as THREE from 'three';
import { SIMULATION_SIZE_Y, SEGMENTS, VELOCIDAD_SONIDO } from '../constants';
import clsx from 'clsx'; // Utility for conditional classes

interface AudioWaveVisualizerProps {
  frecuenciaHz: number;
  separacionMetros: number;
}

export const AudioWaveVisualizer: React.FC<AudioWaveVisualizerProps> = ({
  frecuenciaHz,
  separacionMetros,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const sub1Ref = useRef<THREE.Mesh | null>(null);
  const sub2Ref = useRef<THREE.Mesh | null>(null);
  const labelFreqRef = useRef<HTMLDivElement>(null);
  const labelDistanciaRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(performance.now()); // Para el uniforme de tiempo
  const [isFullScreen, setIsFullScreen] = useState(false);

  const vectorFreq = useRef(new THREE.Vector3(0, 0, SIMULATION_SIZE_Y / 2 * 0.875));
  const vectorDist = useRef(new THREE.Vector3(0, 0, -0.5));

  const onWindowResize = useCallback(() => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const aspectRatio = width / height;

    let viewHeight = SIMULATION_SIZE_Y;
    let viewWidth = viewHeight * aspectRatio;

    // Adjust view frustum to fit container while maintaining aspect ratio
    // If width is limiting, use it. Else, use height.
    if (viewWidth < SIMULATION_SIZE_Y) {
      viewWidth = SIMULATION_SIZE_Y;
      viewHeight = viewWidth / aspectRatio;
    }
    // If the container is wider than SIMULATION_SIZE_Y, allow the view to expand horizontally
    if (width > height) {
      viewWidth = (SIMULATION_SIZE_Y / height) * width;
    } else {
      viewHeight = (SIMULATION_SIZE_Y / width) * height;
    }


    cameraRef.current.left = -viewWidth / 2;
    cameraRef.current.right = viewWidth / 2;
    cameraRef.current.top = viewHeight / 2;
    cameraRef.current.bottom = -viewHeight / 2;

    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, []);

  const updateLabelsPosition = useCallback(() => {
    if (
      !containerRef.current ||
      !cameraRef.current ||
      !labelFreqRef.current ||
      !labelDistanciaRef.current
    )
      return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const posFreq = vectorFreq.current.clone().project(cameraRef.current);
    labelFreqRef.current.style.left = `${(posFreq.x * 0.5 + 0.5) * width}px`;
    labelFreqRef.current.style.top = `${(-posFreq.y * 0.5 + 0.5) * height}px`;

    const posDist = vectorDist.current.clone().project(cameraRef.current);
    labelDistanciaRef.current.style.left = `${(posDist.x * 0.5 + 0.5) * width}px`;
    labelDistanciaRef.current.style.top = `${(-posDist.y * 0.5 + 0.5) * height - 30}px`;
  }, []);

  const handleContainerClick = useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x1e1e1e);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera();
    camera.position.set(0, 5, 0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const geometry = new THREE.PlaneGeometry(
      SIMULATION_SIZE_Y,
      SIMULATION_SIZE_Y,
      SEGMENTS,
      SEGMENTS,
    );
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_lambda: { value: 3.4 }, // Initial value, updated by props
        u_separation: { value: 0.85 }, // Initial value, updated by props
        u_size: { value: SIMULATION_SIZE_Y },
        u_red_color: { value: new THREE.Color(0xFF5733) }, // Original red
        u_green_color: { value: new THREE.Color(0x4CAF50) }, // Original green
        u_time: { value: 0.0 }, // Nuevo uniforme de tiempo
      },
      vertexShader: `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
          uniform float u_lambda;
          uniform float u_separation;
          uniform float u_size;
          uniform vec3 u_red_color;
          uniform vec3 u_green_color;
          uniform float u_time; // Nuevo uniforme para el tiempo
          varying vec2 vUv;

          void main() {
              vec2 pos = (vUv - 0.5) * u_size;
              float sub_offset = u_separation / 2.0;

              // Distancia a cada altavoz
              float r1 = distance(pos, vec2(-sub_offset, 0.0));
              float r2 = distance(pos, vec2(sub_offset, 0.0));

              // Diferencia de fase para el patrón de interferencia estático (color base)
              float deltaR = r2 - r1;
              float interference_phase_diff = (deltaR / u_lambda) * 6.2831853; // 2 * PI

              // Calculo del "power" de la interferencia estática (0=cancelación, 1=refuerzo)
              float intensity_static = 2.0 * abs(cos(interference_phase_diff / 2.0));
              float power_static = pow(intensity_static / 2.0, 4.0); // Potencia para mayor contraste

              // --- NUEVA LÓGICA DE COLOR (Más brillante en extremos, más oscuro en intermedios) ---
              // Modula el brillo de cada color componente según su "fuerza"
              vec3 base_color = u_green_color * power_static + u_red_color * (1.0 - power_static);

              // Ondas animadas saliendo de cada altavoz (más rápidas)
              float wave_speed = 15.0; // Velocidad de las ondas (más rápido)
              float wave_frequency = 4.0; // Frecuencia de las "crestas" de las ondas (más "puntos")
              float animated_wave1 = cos((r1 / u_lambda * wave_frequency * 6.2831853) - u_time * wave_speed);
              float animated_wave2 = cos((r2 / u_lambda * wave_frequency * 6.2831853) - u_time * wave_speed);

              // Combinar ambas ondas animadas para mostrar su interacción en el movimiento
              float combined_animated_wave = (animated_wave1 + animated_wave2) / 2.0; // De -1 a 1

              // Modulación de brillo/opacidad para crear el efecto de "puntos/curvas" animadas
              // Usamos smoothstep para hacer las "ondas" más suaves y visibles en las crestas
              float brightness_mod = smoothstep(0.6, 1.0, combined_animated_wave); // Hace las crestas más brillantes

              // La opacidad también se modula para que las ondas se desvanezcan un poco
              float final_alpha_mod = smoothstep(0.5, 1.0, combined_animated_wave);

              // Aplicar la modulación al color base y la opacidad final
              vec3 final_color_rgb = base_color * brightness_mod * 1.5; // Multiplicar por 1.5 para que las crestas sean más visibles
              float final_alpha = power_static * final_alpha_mod; // Opacidad influenciada por la interferencia y la onda animada

              // Degradado de borde para desvanecer el efecto lejos del centro
              float border_fade = 1.0 - smoothstep(2.5, 4.0, length(pos));
              final_color_rgb *= border_fade;
              final_alpha *= border_fade;

              gl_FragColor = vec4(final_color_rgb, final_alpha);
          }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
    materialRef.current = material;

    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    // Speakers
    const bafleGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const bafleMat = new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: false });
    const bafleEdgeMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const coneGeo = new THREE.ConeGeometry(0.15, 0.15, 16);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    coneGeo.translate(0, 0.15, -0.15); // Adjust cone position relative to box

    const sub1 = new THREE.Mesh(bafleGeo, bafleMat);
    sub1.add(new THREE.LineSegments(new THREE.EdgesGeometry(bafleGeo), bafleEdgeMat));
    sub1.add(new THREE.Mesh(coneGeo, coneMat));
    scene.add(sub1);
    sub1Ref.current = sub1;

    const sub2 = new THREE.Mesh(bafleGeo, bafleMat);
    sub2.add(new THREE.LineSegments(new THREE.EdgesGeometry(bafleGeo), bafleEdgeMat));
    sub2.add(new THREE.Mesh(coneGeo, coneMat));
    scene.add(sub2);
    sub2Ref.current = sub2;

    onWindowResize();
    window.addEventListener('resize', onWindowResize, false);

    const animate = () => {
      requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current && materialRef.current) {
        // Actualizar el uniforme de tiempo
        const elapsedTime = (performance.now() - startTimeRef.current) / 1000; // Segundos
        materialRef.current.uniforms.u_time.value = elapsedTime;

        updateLabelsPosition();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', onWindowResize, false);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        containerRef.current?.removeChild(rendererRef.current.domElement);
      }
    };
  }, [onWindowResize, updateLabelsPosition]); // eslint-disable-line react-hooks/exhaustive-deps

  // Force resize when fullScreen state changes
  useEffect(() => {
    onWindowResize();
    // Re-call label positioning as container dimensions change
    // Using a timeout to ensure DOM has updated
    const timeoutId = setTimeout(updateLabelsPosition, 50);
    return () => clearTimeout(timeoutId);
  }, [isFullScreen, onWindowResize, updateLabelsPosition]);


  // Update Three.js uniforms and speaker positions when props change
  useEffect(() => {
    if (materialRef.current && sub1Ref.current && sub2Ref.current) {
      const longitudOnda = VELOCIDAD_SONIDO / frecuenciaHz;
      materialRef.current.uniforms.u_lambda.value = longitudOnda;
      materialRef.current.uniforms.u_separation.value = separacionMetros;

      const offset = separacionMetros / 2;
      sub1Ref.current.position.x = -offset;
      sub2Ref.current.position.x = offset;

      if (labelFreqRef.current && labelDistanciaRef.current) {
        labelFreqRef.current.textContent = `Frecuencia: ${frecuenciaHz.toFixed(0)} Hz`;
        labelDistanciaRef.current.textContent = `Separación: ${separacionMetros.toFixed(2)} Metros`;
      }
    }
  }, [frecuenciaHz, separacionMetros]);

  // Use useLayoutEffect for initial label positioning after DOM rendering
  useLayoutEffect(() => {
    updateLabelsPosition();
  }, [updateLabelsPosition]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative w-full max-w-3xl h-[280px] mx-auto overflow-hidden border-2 border-emerald-600 rounded-xl shadow-xl shadow-emerald-500/15 cursor-pointer transition-all duration-300 ease-in-out',
        isFullScreen && 'fixed inset-0 z-50 !max-w-none !h-screen !rounded-none !border-none', // Override specific classes when full screen
      )}
      onClick={handleContainerClick}
      role="button"
      aria-expanded={isFullScreen}
      aria-label={isFullScreen ? "Reducir visualizador de ondas" : "Expandir visualizador de ondas"}
    >
      <div
        ref={labelFreqRef}
        className="absolute bg-neutral-900/80 text-white px-2.5 py-1.5 rounded-md text-base font-bold text-emerald-400 whitespace-nowrap -translate-x-1/2 -translate-y-1/2 pointer-events-none border border-neutral-600 shadow-md z-10"
      ></div>
      <div
        ref={labelDistanciaRef}
        className="absolute bg-neutral-900/80 text-white px-2.5 py-1.5 rounded-md text-sm text-amber-400 whitespace-nowrap -translate-x-1/2 -translate-y-1/2 pointer-events-none border border-neutral-600 shadow-md z-10"
      ></div>
    </div>
  );
};