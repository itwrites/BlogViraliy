export const cardVariants = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 + i * 0.08,
      duration: 0.4,
      ease: [0.32, 0.72, 0, 1]
    }
  })
};
