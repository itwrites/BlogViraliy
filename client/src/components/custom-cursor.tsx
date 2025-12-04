import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

type CursorStyle = "default" | "pointer-dot" | "crosshair" | "spotlight" | "trail";

interface CustomCursorProps {
  style: CursorStyle;
}

export function CustomCursor({ style }: CustomCursorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = { damping: 25, stiffness: 400 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  const trailPositions = useRef<{ x: number; y: number }[]>([]);
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);
  const trailIdRef = useRef(0);

  useEffect(() => {
    if (style === "default") return;

    const updateCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      setIsVisible(true);

      if (style === "trail") {
        trailIdRef.current += 1;
        setTrail(prev => {
          const newTrail = [...prev, { x: e.clientX, y: e.clientY, id: trailIdRef.current }];
          return newTrail.slice(-8);
        });
      }

      const target = e.target as HTMLElement;
      const isClickable = 
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        !!target.closest("button") ||
        !!target.closest("a") ||
        target.classList.contains("cursor-pointer") ||
        getComputedStyle(target).cursor === "pointer";
      
      setIsPointer(Boolean(isClickable));
    };

    const hideCursor = () => setIsVisible(false);
    const showCursor = () => setIsVisible(true);

    document.addEventListener("mousemove", updateCursor);
    document.addEventListener("mouseleave", hideCursor);
    document.addEventListener("mouseenter", showCursor);

    document.body.style.cursor = "none";
    document.querySelectorAll("a, button, [role='button']").forEach(el => {
      (el as HTMLElement).style.cursor = "none";
    });

    return () => {
      document.removeEventListener("mousemove", updateCursor);
      document.removeEventListener("mouseleave", hideCursor);
      document.removeEventListener("mouseenter", showCursor);
      document.body.style.cursor = "";
      document.querySelectorAll("a, button, [role='button']").forEach(el => {
        (el as HTMLElement).style.cursor = "";
      });
    };
  }, [style, cursorX, cursorY]);

  if (style === "default") return null;

  const renderCursor = () => {
    switch (style) {
      case "pointer-dot":
        return (
          <motion.div
            className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
            style={{
              x: cursorXSpring,
              y: cursorYSpring,
            }}
          >
            <motion.div
              className="rounded-full bg-white"
              animate={{
                width: isPointer ? 48 : 12,
                height: isPointer ? 48 : 12,
                x: isPointer ? -24 : -6,
                y: isPointer ? -24 : -6,
              }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            />
          </motion.div>
        );

      case "crosshair":
        return (
          <motion.div
            className="fixed top-0 left-0 pointer-events-none z-[9999]"
            style={{
              x: cursorXSpring,
              y: cursorYSpring,
            }}
          >
            <motion.div
              className="relative"
              animate={{ scale: isPointer ? 1.5 : 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <div className="absolute w-6 h-px bg-primary -translate-x-3" />
              <div className="absolute h-6 w-px bg-primary -translate-y-3" />
              <motion.div 
                className="absolute w-2 h-2 border-2 border-primary rounded-full -translate-x-1 -translate-y-1"
                animate={{ opacity: isPointer ? 1 : 0 }}
              />
            </motion.div>
          </motion.div>
        );

      case "spotlight":
        return (
          <motion.div
            className="fixed top-0 left-0 pointer-events-none z-[9998]"
            style={{
              x: cursorXSpring,
              y: cursorYSpring,
            }}
          >
            <motion.div
              className="rounded-full bg-gradient-radial from-primary/20 via-primary/5 to-transparent"
              animate={{
                width: isPointer ? 300 : 200,
                height: isPointer ? 300 : 200,
                x: isPointer ? -150 : -100,
                y: isPointer ? -150 : -100,
              }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
            />
            <motion.div
              className="absolute rounded-full bg-primary"
              animate={{
                width: isPointer ? 16 : 8,
                height: isPointer ? 16 : 8,
                x: isPointer ? -8 : -4,
                y: isPointer ? -8 : -4,
              }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            />
          </motion.div>
        );

      case "trail":
        return (
          <>
            <AnimatePresence>
              {trail.map((pos, i) => (
                <motion.div
                  key={pos.id}
                  className="fixed top-0 left-0 pointer-events-none z-[9998] rounded-full bg-primary/30"
                  initial={{ opacity: 0.6, scale: 1 }}
                  animate={{ opacity: 0, scale: 0.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    left: pos.x - 4,
                    top: pos.y - 4,
                    width: 8,
                    height: 8,
                  }}
                />
              ))}
            </AnimatePresence>
            <motion.div
              className="fixed top-0 left-0 pointer-events-none z-[9999]"
              style={{
                x: cursorXSpring,
                y: cursorYSpring,
              }}
            >
              <motion.div
                className="rounded-full bg-primary"
                animate={{
                  width: isPointer ? 20 : 12,
                  height: isPointer ? 20 : 12,
                  x: isPointer ? -10 : -6,
                  y: isPointer ? -10 : -6,
                }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              />
            </motion.div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && renderCursor()}
    </AnimatePresence>
  );
}
