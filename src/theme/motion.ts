/** Shared motion tokens — keep overlays / tabs / page enters feeling consistent. */

export const ZPC_MOTION = {
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Dialog / centered modal enter */
  popupEnter: 280,
  popupExit: 180,
  /** Drawer / bottom sheet */
  drawerEnter: 300,
  drawerExit: 220,
  /** Route / major page enter */
  page: 340,
  /** In-page tab / section switch */
  tab: 260,
  /** Menus, popovers, lightweight surfaces */
  popover: 180,
} as const;

export const ZPC_TRANSITION = {
  popup: {
    enter: ZPC_MOTION.popupEnter,
    exit: ZPC_MOTION.popupExit,
  },
  drawer: {
    enter: ZPC_MOTION.drawerEnter,
    exit: ZPC_MOTION.drawerExit,
  },
  popover: {
    enter: ZPC_MOTION.popover,
    exit: 140,
  },
} as const;
