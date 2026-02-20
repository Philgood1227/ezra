export function isOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

