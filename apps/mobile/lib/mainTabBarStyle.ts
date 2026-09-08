import { Colors } from '../constants/Colors';

/** Floating pill tab bar — the single source of truth for App.tsx and every scroll screen. */
const BAR_V_PADDING = 10;

/** @react-navigation/bottom-tabs internals we have to lay out around. */
const ICON_BOX_HEIGHT = 28; // TabBarIcon `wrapperUikit`
const ITEM_INNER_PADDING = 5; // BottomTabItem `tabVerticalUiKit`

/** Explicit so item height stays deterministic across platforms and fonts. */
export const TAB_BAR_LABEL_FONT_SIZE = 10;
export const TAB_BAR_LABEL_LINE_HEIGHT = 13;

/** Below this width, four labelled items plus the raised Scan FAB crowd the pill. */
export const ICON_ONLY_TAB_BAR_WIDTH = 370;

export function tabBarShowsLabels(windowWidth: number): boolean {
  return windowWidth >= ICON_ONLY_TAB_BAR_WIDTH;
}

/** Wraps the item content exactly, so an icon-only bar isn't a tall empty pill. */
export function getMainTabBarHeight(showLabel: boolean): number {
  const contentHeight = ICON_BOX_HEIGHT + (showLabel ? TAB_BAR_LABEL_LINE_HEIGHT : 0);
  return contentHeight + ITEM_INNER_PADDING * 2 + BAR_V_PADDING * 2;
}

/**
 * The pill hugs the bottom edge. Following a large Android navigation-bar inset
 * instead would leave a strip of scroll content showing underneath it.
 */
export function getMainTabBarBottomGap(bottomInset: number): number {
  return Math.min(Math.max(bottomInset, 8), 14);
}

/** Space to reserve below scroll content when the floating tab bar is visible. */
export function getFloatingTabBarScrollPadding(bottomInset: number, showLabel: boolean): number {
  return getMainTabBarBottomGap(bottomInset) + getMainTabBarHeight(showLabel) + 16;
}

/**
 * BottomTabItem packs its content with `justifyContent: 'flex-start'` and 5pt
 * padding, so an item taller than its content sits high. Sizing the item to
 * exactly wrap the content centres it internally, and `alignSelf: 'center'`
 * centres the item itself inside the pill.
 */
export function getMainTabBarItemStyle(showLabel: boolean) {
  const contentHeight = ICON_BOX_HEIGHT + (showLabel ? TAB_BAR_LABEL_LINE_HEIGHT : 0);
  return {
    height: contentHeight + ITEM_INNER_PADDING * 2,
    alignSelf: 'center' as const,
  };
}

export function getMainFloatingTabBarStyle(bottomInset: number, showLabel: boolean) {
  return {
    position: 'absolute' as const,
    left: 8,
    right: 8,
    bottom: getMainTabBarBottomGap(bottomInset),
    height: getMainTabBarHeight(showLabel),
    paddingTop: BAR_V_PADDING,
    paddingBottom: BAR_V_PADDING,
    borderRadius: 30,
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(122, 120, 120, 0.5)',
    elevation: 0,
    shadowOpacity: 0,
    overflow: 'visible' as const,
  };
}
