"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import type { LottieRefCurrentProps } from "lottie-react";

// Lazy-load the lottie-react runtime so pages that never actually display
// an animation (e.g. the menu, the cart, the home) don't pay the bundle
// cost. ssr:false because Lottie touches the DOM at mount. The fallback is
// a transparent placeholder so swapping in the real player doesn't shift
// layout.
const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => null,
});

interface LottiePlayerProps {
  src: string; // The filename in /public/animations/
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onHover?: boolean; // If true, only plays on hover
  onClick?: boolean; // If true, only plays on click
  speed?: number;
  renderer?: "svg" | "canvas" | "html";
}

export function LottiePlayer({
  src,
  loop = true,
  autoplay = true,
  className = "",
  style,
  onHover = false,
  onClick = false,
  speed = 1,
  renderer = "svg",
}: LottiePlayerProps) {
  const [animationData, setAnimationData] = useState<any>(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    let isMounted = true;
    fetch(`/animations/${src}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setAnimationData(data);
      })
      .catch((err) => console.error("Failed to load Lottie animation", src, err));
    return () => {
      isMounted = false;
    };
  }, [src]);

  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(speed);
      if (onHover || onClick) {
        lottieRef.current.stop(); // Don't autoplay if it's interaction-based
      }
    }
  }, [animationData, speed, onHover, onClick]);

  if (!animationData) {
    return <div className={className} style={{ ...style, opacity: 0 }} />;
  }

  const handleMouseEnter = () => {
    if (onHover && lottieRef.current) {
      lottieRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    if (onHover && lottieRef.current) {
      lottieRef.current.stop();
    }
  };

  const handleClick = () => {
    if (onClick && lottieRef.current) {
      lottieRef.current.goToAndPlay(0, true);
    }
  };

  return (
    <div
      className={className}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={autoplay && !onHover && !onClick}
        renderer={renderer as any}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
