"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { AvocadoIcon } from "@/components/common/brand-logo";

interface LottieAvocadoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  speed?: number;
  loop?: boolean;
  autoplay?: boolean;
  variant?: "walking" | "workout";
  path?: string;
}

export function LottieAvocado({
  className,
  width,
  height,
  speed = 1,
  loop = true,
  autoplay = true,
  variant = "walking",
  path,
}: LottieAvocadoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const animationPath =
    path || (variant === "workout" ? "/avocado-workout.json" : "/walking_avacado.json");

  useEffect(() => {
    let isMounted = true;
    let animInstance: any = null;

    async function loadLottie() {
      try {
        const lottie = (await import("lottie-web")).default;
        if (!isMounted || !containerRef.current) return;

        // Clear previous children if any
        containerRef.current.innerHTML = "";

        animInstance = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop,
          autoplay,
          path: animationPath,
        });

        animInstance.setSpeed(speed);

        animInstance.addEventListener("DOMLoaded", () => {
          if (isMounted) setIsLoaded(true);
        });

        animInstance.addEventListener("data_failed", () => {
          if (isMounted) setHasError(true);
        });
      } catch (err) {
        console.error("Failed to load Lottie animation", err);
        if (isMounted) setHasError(true);
      }
    }

    loadLottie();

    return () => {
      isMounted = false;
      if (animInstance) {
        animInstance.destroy();
      }
    };
  }, [loop, autoplay, speed, animationPath]);

  const style: CSSProperties = {};
  if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      style={style}
    >
      {/* Lottie SVG Container */}
      <div
        ref={containerRef}
        className={cn(
          "w-full h-full flex items-center justify-center transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{ pointerEvents: "none" }}
      />

      {/* Error fallback only. Nothing is shown while it is loading. */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AvocadoIcon className="size-20 opacity-80" />
        </div>
      )}
    </div>
  );
}
