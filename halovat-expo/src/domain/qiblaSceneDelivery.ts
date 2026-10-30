/** Keep one unrendered WebView update in flight; newer headings replace the pending one. */
export function createSceneDelivery<T>(send: (state: T, sequence: number) => void, stalled: () => void, nextSequence: () => number) {
  let pending: T | undefined;
  let inFlight: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const flush = () => {
    if (disposed || inFlight !== undefined || pending === undefined) return;
    const state = pending;
    pending = undefined;
    inFlight = nextSequence();
    timer = setTimeout(() => {
      if (disposed) return;
      disposed = true;
      pending = undefined;
      stalled();
    }, 3000);
    send(state, inFlight);
  };
  return {
    submit(state: T) { if (!disposed) { pending = state; flush(); } },
    rendered(sequence: number) {
      if (disposed || sequence !== inFlight) return;
      clearTimeout(timer);
      inFlight = undefined;
      flush();
    },
    dispose() { disposed = true; pending = undefined; clearTimeout(timer); },
  };
}
