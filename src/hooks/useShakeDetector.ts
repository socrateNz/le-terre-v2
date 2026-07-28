'use client';

import { useEffect, useRef, useState } from 'react';

interface UseShakeDetectorOptions {
  onShake: () => void;
  enabled?: boolean;
  threshold?: number; // Seuil d'accélération (par défaut 18)
  timeout?: number;   // Délai min entre 2 secousses (en ms)
}

export function useShakeDetector({
  onShake,
  enabled = true,
  threshold = 18,
  timeout = 1000,
}: UseShakeDetectorOptions) {
  const lastShakeTime = useRef<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [needsPermission, setNeedsPermission] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasMotion = 'DeviceMotionEvent' in window;
    setIsSupported(hasMotion);

    // Détecte si iOS requiert une autorisation explicite
    if (
      hasMotion &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      setNeedsPermission(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !isSupported || typeof window === 'undefined') return;

    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastZ: number | null = null;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity || event.acceleration;
      if (!acceleration) return;

      const { x, y, z } = acceleration;
      if (x === null || y === null || z === null) return;

      if (lastX !== null && lastY !== null && lastZ !== null) {
        const deltaX = Math.abs(x - lastX);
        const deltaY = Math.abs(y - lastY);
        const deltaZ = Math.abs(z - lastZ);

        const totalMotion = deltaX + deltaY + deltaZ;

        if (totalMotion > threshold) {
          const now = Date.now();
          if (now - lastShakeTime.current > timeout) {
            lastShakeTime.current = now;

            // Retour haptique (vibration mobile)
            if ('vibrate' in navigator) {
              try {
                navigator.vibrate([40, 60, 40]);
              } catch {
                // Ignore si refusé par le navigateur
              }
            }

            onShake();
          }
        }
      }

      lastX = x;
      lastY = y;
      lastZ = z;
    };

    window.addEventListener('devicemotion', handleMotion, false);

    return () => {
      window.removeEventListener('devicemotion', handleMotion, false);
    };
  }, [enabled, isSupported, onShake, threshold, timeout]);

  const requestPermission = async () => {
    if (
      typeof window !== 'undefined' &&
      'DeviceMotionEvent' in window &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setNeedsPermission(false);
          return true;
        }
      } catch (err) {
        console.error('Permission DeviceMotion refusée', err);
      }
    }
    return false;
  };

  return { isSupported, needsPermission, requestPermission };
}
