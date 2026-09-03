import { Colors } from '../constants/Colors';

/** Floating pill tab bar — shared so nested screens can restore after hiding it. */
/** Space to reserve below scroll content when the floating tab bar is visible. */
export function getFloatingTabBarScrollPadding(bottomInset: number): number {
  const bottomPad = Math.max(bottomInset, 10);
  const barHeight = 72 + Math.min(bottomInset, 8);
  return bottomPad + barHeight + 16;
}

export function getMainFloatingTabBarStyle(bottomInset: number) {
  const bottomPad = Math.max(bottomInset, 10);
  return {
    position: 'absolute' as const,
    left: 16,
    right: 16,
    bottom: bottomPad,
    height: 64 + Math.min(bottomInset, 8),
    paddingTop: 8,
    paddingBottom: Math.min(bottomInset, 12) || 8,
    borderRadius: 30,
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(122, 120, 120, 0.5)',
    elevation: 0,
    shadowOpacity: 0,
  };
}
