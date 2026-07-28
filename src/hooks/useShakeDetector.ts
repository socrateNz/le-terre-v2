'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseShakeDetectorOptions {
  onShake: () => void;
  enabled?: boolean;
  threshold?: number; // Seuil de sensibilité (10-14 est très réactif)
  timeout?: number;   // Temps min entre 2 détections (ms)
}

export function useShakeDetector({
  onShake,
  enabled = true,
  threshold = 11,
  timeout = 900,
}: UseShakeDetectorOptions) {
  const lastShakeTime = useRef<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [needsPermission, setNeedsPermission] = useState<boolean>(false);
  const [lastMagnitude, setLastMagnitude] = useState<number>(0);

  // Demande d'autorisation pour iOS 13+
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (
      typeof window !== 'undefined' &&
      'DeviceMotionEvent' in window &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          setNeedsPermission(false);
          return true;
        }
      } catch (err) {
        console.error('Erreur demande permission DeviceMotion:', err);
      }
      return false;
    }
    setPermissionGranted(true);
    setNeedsPermission(false);
    return true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasMotion = 'DeviceMotionEvent' in window;
    setIsSupported(hasMotion);

    if (hasMotion) {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        setNeedsPermission(true);
      } else {
        setPermissionGranted(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !isSupported || typeof window === 'undefined') return;
    if (needsPermission && !permissionGranted) return;

    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastZ: number | null = null;

    const handleMotion = (event: DeviceMotionEvent) => {
      // Priorité à acceleration (sans gravité) puis fallback sur accelerationIncludingGravity
      const acc = event.acceleration || event.accelerationIncludingGravity;
      if (!acc) return;

      const x = acc.x ?? 0;
      const y = acc.y ?? 0;
      const z = acc.z ?? 0;

      // Calcul de la magnitude de l'accélération
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      setLastMagnitude(Math.round(magnitude));

      if (lastX !== null && lastY !== null && lastZ !== null) {
        const deltaX = Math.abs(x - lastX);
        const deltaY = Math.abs(y - lastY);
        const deltaZ = Math.abs(z - lastZ);
        const totalDelta = deltaX + deltaY + deltaZ;

        // Détection soit par delta d'accélération (variations brusques), soit par magnitude élevée (> threshold)
        if (totalDelta > threshold || magnitude > threshold) {
          const now = Date.now();
          if (now - lastShakeTime.current > timeout) {
            lastShakeTime.current = now;

            // Feedback Haptique (Vibration sur téléphone)
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate([60, 80, 60]);
              } catch {
                // Ignore
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

    window.addEventListener('devicemotion', handleMotion, true);

    return () => {
      window.removeEventListener('devicemotion', handleMotion, true);
    };
  }, [enabled, isSupported, permissionGranted, needsPermission, onShake, threshold, timeout]);

  return {
    isSupported,
    needsPermission,
    permissionGranted,
    requestPermission,
    lastMagnitude,
  };
}
