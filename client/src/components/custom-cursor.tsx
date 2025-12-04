import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence, useReducedMotion } from "framer-motion";

type CursorStyle = "default" | "pointer-dot" | "crosshair" | "spotlight" | "trail";

interface CustomCursorProps {
  style: CursorStyle;
}

export function CustomCursor({ style }: CustomCursorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);
  const [isInput, setIsInput] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastMousePos = useRef({ x: -100, y: -100 });
  const styleSheetRef = useRef<HTMLStyleElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = prefersReducedMotion 
    ? { damping: 50, stiffness: 500, mass: 0.3 }
    : { damping: 35, stiffness: 400, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);
  const trailIdRef = useRef(0);
  const trailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkIfClickable = useCallback((target: HTMLElement): boolean => {
    if (!target) return false;
    
    const tagName = target.tagName.toLowerCase();
    const isInteractive = 
      tagName === "button" ||
      tagName === "a" ||
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      target.getAttribute("role") === "button" ||
      target.getAttribute("role") === "link" ||
      target.hasAttribute("onclick") ||
      target.classList.contains("cursor-pointer");
    
    if (isInteractive) return true;
    
    const closest = target.closest("button, a, [role='button'], [role='link'], .cursor-pointer");
    if (closest) return true;
    
    const computedCursor = getComputedStyle(target).cursor;
    return computedCursor === "pointer";
  }, []);

  const checkIfInput = useCallback((target: HTMLElement): boolean => {
    if (!target) return false;
    const tagName = target.tagName.toLowerCase();
    return tagName === "input" || tagName === "textarea" || target.isContentEditable;
  }, []);

  const updateCursorStyles = useCallback((inInput: boolean) => {
    if (styleSheetRef.current) {
      styleSheetRef.current.textContent = inInput 
        ? `body:not(input):not(textarea):not([contenteditable="true"]), body *:not(input):not(textarea):not([contenteditable="true"]) { cursor: none !important; }`
        : `body, body * { cursor: none !important; } input, textarea, [contenteditable="true"] { cursor: text !important; }`;
    }
  }, []);

  useEffect(() => {
    if (style === "default") return;

    const styleSheet = document.createElement("style");
    styleSheet.id = "custom-cursor-styles";
    styleSheet.textContent = `
      body, body * { cursor: none !important; }
      input, textarea, [contenteditable="true"] { cursor: text !important; }
    `;
    document.head.appendChild(styleSheet);
    styleSheetRef.current = styleSheet;

    const handleMouseMove = (e: MouseEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      
      rafRef.current = requestAnimationFrame(() => {
        cursorX.set(lastMousePos.current.x);
        cursorY.set(lastMousePos.current.y);
        setIsVisible(true);
        
        const target = e.target as HTMLElement;
        const inInput = checkIfInput(target);
        setIsPointer(checkIfClickable(target));
        setIsInput(inInput);
        updateCursorStyles(inInput);
        
        if (style === "trail" && !prefersReducedMotion) {
          if (trailTimerRef.current) {
            clearTimeout(trailTimerRef.current);
          }
          
          trailIdRef.current += 1;
          setTrail(prev => {
            const newTrail = [...prev, { 
              x: lastMousePos.current.x, 
              y: lastMousePos.current.y, 
              id: trailIdRef.current 
            }];
            return newTrail.slice(-12);
          });
        }
        
        rafRef.current = null;
      });
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      
      if (styleSheetRef.current) {
        styleSheetRef.current.remove();
        styleSheetRef.current = null;
      }
      
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      
      if (trailTimerRef.current) {
        clearTimeout(trailTimerRef.current);
        trailTimerRef.current = null;
      }
    };
  }, [style, cursorX, cursorY, checkIfClickable, checkIfInput, updateCursorStyles, prefersReducedMotion]);

  if (style === "default" || isInput) return null;

  const transitionConfig = prefersReducedMotion 
    ? { type: "tween", duration: 0.1 }
    : { type: "spring", damping: 25, stiffness: 350, mass: 0.5 };

  const renderCursor = () => {
    switch (style) {
      case "pointer-dot":
        return (
          <motion.div
            className="fixed top-0 left-0 pointer-events-none z-[9999]"
            style={{ x: cursorXSpring, y: cursorYSpring }}
          >
            <motion.div
              className="rounded-full mix-blend-difference"
              initial={false}
              animate={{
                width: isPointer ? 56 : 14,
                height: isPointer ? 56 : 14,
                x: isPointer ? -28 : -7,
                y: isPointer ? -28 : -7,
                backgroundColor: "#ffffff",
              }}
              transition={transitionConfig}
            />
            <motion.div
              className="absolute rounded-full border-2 border-white/30"
              initial={false}
              animate={{
                width: isPointer ? 72 : 32,
                height: isPointer ? 72 : 32,
                x: isPointer ? -36 : -16,
                y: isPointer ? -36 : -16,
                opacity: isPointer ? 0.8 : 0.4,
              }}
              transition={prefersReducedMotion 
                ? { type: "tween", duration: 0.1 }
                : { type: "spring", damping: 20, stiffness: 200, mass: 0.8 }}
            />
          </motion.div>
        );

      case "crosshair":
        return (
          <motion.div
            className="fixed top-0 left-0 pointer-events-none z-[9999]"
            style={{ x: cursorXSpring, y: cursorYSpring }}
          >
            <motion.div
              className="relative"
              initial={false}
              animate={{ 
                scale: isPointer ? 1.3 : 1,
                rotate: isPointer ? 45 : 0,
              }}
              transition={transitionConfig}
            >
              <motion.div 
                className="absolute bg-primary origin-center"
                initial={false}
                animate={{
                  width: isPointer ? 28 : 20,
                  height: 2,
                  x: isPointer ? -14 : -10,
                  y: -1,
                }}
                transition={transitionConfig}
              />
              <motion.div 
                className="absolute bg-primary origin-center"
                initial={false}
                animate={{
                  width: 2,
                  height: isPointer ? 28 : 20,
                  x: -1,
                  y: isPointer ? -14 : -10,
                }}
                transition={transitionConfig}
              />
              <motion.div 
                className="absolute border-2 border-primary rounded-full"
                initial={false}
                animate={{ 
                  width: isPointer ? 12 : 6,
                  height: isPointer ? 12 : 6,
                  x: isPointer ? -6 : -3,
                  y: isPointer ? -6 : -3,
                  opacity: isPointer ? 1 : 0.6,
                }}
                transition={transitionConfig}
              />
            </motion.div>
          </motion.div>
        );

      case "spotlight":
        return (
          <motion.div
            className="fixed top-0 left-0 pointer-events-none z-[9998]"
            style={{ x: cursorXSpring, y: cursorYSpring }}
          >
            <motion.div
              className="rounded-full"
              initial={false}
              animate={{
                width: isPointer ? 280 : 180,
                height: isPointer ? 280 : 180,
                x: isPointer ? -140 : -90,
                y: isPointer ? -140 : -90,
                background: isPointer 
                  ? "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.05) 40%, transparent 70%)"
                  : "radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, hsl(var(--primary) / 0.03) 50%, transparent 70%)",
              }}
              transition={prefersReducedMotion 
                ? { type: "tween", duration: 0.1 }
                : { type: "spring", damping: 30, stiffness: 200, mass: 0.8 }}
            />
            <motion.div
              className="absolute rounded-full bg-primary shadow-lg shadow-primary/20"
              initial={false}
              animate={{
                width: isPointer ? 18 : 10,
                height: isPointer ? 18 : 10,
                x: isPointer ? -9 : -5,
                y: isPointer ? -9 : -5,
              }}
              transition={transitionConfig}
            />
            {isPointer && !prefersReducedMotion && (
              <motion.div
                className="absolute rounded-full border border-primary/40"
                initial={{ width: 18, height: 18, x: -9, y: -9, opacity: 0 }}
                animate={{ 
                  width: 40, 
                  height: 40, 
                  x: -20, 
                  y: -20, 
                  opacity: [0.6, 0],
                }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            )}
          </motion.div>
        );

      case "trail":
        if (prefersReducedMotion) {
          return (
            <motion.div
              className="fixed top-0 left-0 pointer-events-none z-[9999]"
              style={{ x: cursorXSpring, y: cursorYSpring }}
            >
              <motion.div
                className="rounded-full bg-primary"
                initial={false}
                animate={{
                  width: isPointer ? 24 : 14,
                  height: isPointer ? 24 : 14,
                  x: isPointer ? -12 : -7,
                  y: isPointer ? -12 : -7,
                }}
                transition={{ type: "tween", duration: 0.1 }}
              />
            </motion.div>
          );
        }
        return (
          <>
            <AnimatePresence mode="popLayout">
              {trail.map((pos, i) => {
                const age = (trail.length - 1 - i) / trail.length;
                const size = Math.max(4, 12 * (1 - age * 0.7));
                
                return (
                  <motion.div
                    key={pos.id}
                    className="fixed pointer-events-none z-[9998] rounded-full"
                    initial={{ 
                      opacity: 0.7, 
                      scale: 1,
                      x: pos.x - size / 2,
                      y: pos.y - size / 2,
                    }}
                    animate={{ 
                      opacity: 0, 
                      scale: 0.3,
                    }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ 
                      duration: 0.6,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    style={{
                      width: size,
                      height: size,
                      background: `hsl(var(--primary) / ${0.5 - age * 0.3})`,
                    }}
                  />
                );
              })}
            </AnimatePresence>
            <motion.div
              className="fixed top-0 left-0 pointer-events-none z-[9999]"
              style={{ x: cursorXSpring, y: cursorYSpring }}
            >
              <motion.div
                className="rounded-full bg-primary shadow-lg shadow-primary/30"
                initial={false}
                animate={{
                  width: isPointer ? 24 : 14,
                  height: isPointer ? 24 : 14,
                  x: isPointer ? -12 : -7,
                  y: isPointer ? -12 : -7,
                }}
                transition={transitionConfig}
              />
              {isPointer && (
                <motion.div
                  className="absolute rounded-full border-2 border-primary/50"
                  initial={{ width: 24, height: 24, x: -12, y: -12, opacity: 0 }}
                  animate={{ 
                    width: 48, 
                    height: 48, 
                    x: -24, 
                    y: -24, 
                    opacity: [0.5, 0],
                  }}
                  transition={{ 
                    duration: 0.6, 
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              )}
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
