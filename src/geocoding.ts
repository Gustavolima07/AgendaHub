export type GeocodingMatch = {
  latitude: number;
  longitude: number;
  displayName: string;
};

let lastRequestAt = 0;
let requestQueue = Promise.resolve();
const resultCache = new Map<string, GeocodingMatch[]>();

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function findAddressCoordinates(address: string): Promise<GeocodingMatch[]> {
  const normalizedAddress = address.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
  if (normalizedAddress.length < 8) throw new Error('Preencha rua, cidade e estado para buscar.');
  const cachedResults = resultCache.get(normalizedAddress);
  if (cachedResults) return cachedResults;

  const runRequest = requestQueue.then(async () => {
    const delay = Math.max(0, 1100 - (Date.now() - lastRequestAt));
    if (delay) await wait(delay);
    lastRequestAt = Date.now();

    const query = new URLSearchParams({
      q: address.trim(),
      format: 'jsonv2',
      addressdetails: '1',
      limit: '3',
      countrycodes: 'br',
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${query.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AgendaHub/1.0 (+https://github.com/Gustavolima07/AgendaHub)',
      },
    });
    if (!response.ok) {
      if (response.status === 429)
        throw new Error(
          'O OpenStreetMap limitou as consultas. Aguarde um minuto e tente novamente.',
        );
      throw new Error('Não foi possível consultar o OpenStreetMap agora.');
    }
    const results = (await response.json()) as { lat: string; lon: string; display_name: string }[];
    const matches = results.map((result) => ({
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      displayName: result.display_name,
    }));
    resultCache.set(normalizedAddress, matches);
    return matches;
  });
  requestQueue = runRequest.then(
    () => undefined,
    () => undefined,
  );
  return runRequest;
}
