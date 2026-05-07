import type { Transition } from "motion/react";

export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export const SPRING_NONE: Transition = {
  duration: 0,
};

export function springTransition(reduced: boolean): Transition {
  return reduced ? SPRING_NONE : SPRING_SNAPPY;
}
