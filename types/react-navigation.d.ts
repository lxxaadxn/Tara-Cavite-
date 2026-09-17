/**
 * Lets `navigation.navigate('Screen', params)` typecheck without listing every route here.
 * Prefer tightening to a real param list when the navigator graph stabilizes.
 */
export {};

declare global {
  namespace ReactNavigation {
    interface RootParamList {
      [key: string]: object | undefined;
    }
  }
}
