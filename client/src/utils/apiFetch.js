function unwrapEnvelope(payload) {
  if (!payload || typeof payload.success !== 'boolean') return payload;
  if (payload.success) return payload.data;
  return { error: payload.error || 'internal_error', message: payload.message || payload.error || 'İstek başarısız' };
}

export async function apiFetch(input, init) {
  const response = await fetch(input, init);
  const readJson = response.json.bind(response);
  return new Proxy(response, {
    get(target, property) {
      if (property === 'json') return async () => unwrapEnvelope(await readJson());
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export { unwrapEnvelope };
