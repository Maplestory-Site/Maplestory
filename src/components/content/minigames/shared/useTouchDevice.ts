import { useEffect, useState } from "react";

export function useTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      const coarse = window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false;
      const noHover = window.matchMedia ? window.matchMedia("(hover: none)").matches : false;
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setIsTouch(coarse || noHover || hasTouch);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isTouch;
}
