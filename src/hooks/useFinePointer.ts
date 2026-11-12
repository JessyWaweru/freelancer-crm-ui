import { useEffect, useState } from "react";

// True on devices with a mouse/trackpad. Hover-driven effects are skipped on touch screens.
export function useFinePointer() {
  const query = "(hover: hover) and (pointer: fine)";
  const [fine, setFine] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setFine(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return fine;
}
