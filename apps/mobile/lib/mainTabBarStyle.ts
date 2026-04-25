import { Colors } from '../constants/Colors';

/** Floating pill tab bar — shared so nested screens can restore after hiding it. */
export function getMainFloatingTabBarStyle(bottomInset: number) {
  const bottomPad = Math.max(bottomInset, 10);
  return {
    position: 'absolute' as const,
    left: 16,
    right: 16,
    bottom: bottomPad,
    height: 56 + Math.min(bottomInset, 8),
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
