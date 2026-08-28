/** Tracks signal subscriptions as one resettable lifecycle unit. */
export function createSignalManager() {
  const connections = [];

  return {
    get size() {
      return connections.length;
    },

    get isEmpty() {
      return connections.length === 0;
    },

    get connections() {
      return connections.map(({ source, signal, id }) => ({ source, signal, id }));
    },

    connect(source, signal, handler) {
      const id = source.connect(signal, handler);
      connections.push({ source, signal, id });
      return id;
    },

    getSignalIds(source, signal) {
      return connections
        .filter((connection) => connection.source === source && connection.signal === signal)
        .map(({ id }) => id);
    },

    resetSignal(source, signal) {
      let resetCount = 0;

      for (let index = connections.length - 1; index >= 0; index--) {
        const connection = connections[index];
        if (connection.source !== source || connection.signal !== signal) continue;

        connections.splice(index, 1);
        disconnect(connection);
        resetCount++;
      }

      return resetCount;
    },

    reset() {
      for (const connection of connections.splice(0).reverse()) disconnect(connection);
    },
  };
}

function disconnect({ source, id }) {
  try {
    source.disconnect(id);
  } catch {
    // The signal source may already have been destroyed.
  }
}

/** Destroys an optional owned object and returns its reset value. */
export function resetDisposable(value) {
  value?.destroy();
  return null;
}
