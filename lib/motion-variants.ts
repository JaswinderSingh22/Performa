/** Shared Motion presets — calm, productive motion (respect reduced-motion in callers). */

export const springSnappy = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
};

export const springSoft = {
  type: "spring" as const,
  stiffness: 280,
  damping: 28,
};

export const easingOut = [0.22, 1, 0.36, 1] as const;

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: easingOut },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.35, ease: easingOut },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  transition: springSoft,
};

export const stagger = (delayChildren = 0.06) =>
  ({
    animate: {
      transition: {
        staggerChildren: delayChildren,
        delayChildren: 0.04,
      },
    },
  }) as const;

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: easingOut },
  },
};

/** Form field groups — pair with staggerFieldItem on children */
export const staggerFieldParent = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.052,
      delayChildren: 0.05,
    },
  },
};

export const staggerFieldItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: easingOut },
  },
};
