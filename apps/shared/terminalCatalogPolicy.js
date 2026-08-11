export const MALL_TERMINAL_ID_MAX = 25;

export const COMMUTETOUR_ROUTE_IDS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 22, 23, 24, 27, 28, 29, 30, 38, 39, 40, 42,
  43, 44, 45, 46,
]);

export function isMallTerminalId(id) {
  const n = Number(id);
  return Number.isFinite(n) && n >= 1 && n <= MALL_TERMINAL_ID_MAX;
}

export function isMallTerminalName(name) {
  const n = String(name ?? '');
  return (
    /\bSM City\b/i.test(n) ||
    /\bRobinsons\b/i.test(n) ||
    /\bVista Mall\b/i.test(n) ||
    /\bWalterMart\b/i.test(n) ||
    /\bThe District\b/i.test(n) ||
    /\bNOMO\b/i.test(n) ||
    /\bMain Square Mall\b/i.test(n) ||
    /\bRFC Mall\b/i.test(n) ||
    /\bAyala Malls\b/i.test(n) ||
    /\bAcienda\b/i.test(n) ||
    /\bFora Mall\b/i.test(n) ||
    /\bLifestyle Center\b/i.test(n)
  );
}

export function isMallTerminalRow(row) {
  if (isMallTerminalId(row?.terminal_id)) return true;
  return isMallTerminalName(row?.terminal_name);
}

export function isCommuteTourRouteId(routeId) {
  const n = Number(routeId);
  return Number.isFinite(n) && COMMUTETOUR_ROUTE_IDS.has(n);
}

export function isShowcasedTerminalRouteLink(link) {
  return isMallTerminalId(link?.terminal_id) && isCommuteTourRouteId(link?.route_id);
}
