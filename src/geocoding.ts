export type GeocodingMatch = {
  latitude: number;
  longitude: number;
  displayName: string;
  approximate?: boolean;
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

  const addressParts = address.split(',').map((part) => part.trim());
  const streetWithoutNumber = addressParts[0]?.replace(/\s+\d+[A-Za-z]?\s*$/, '').trim();
  const queries = [address.trim()];
  if (streetWithoutNumber && streetWithoutNumber !== addressParts[0])
    queries.push([streetWithoutNumber, ...addressParts.slice(1)].join(', '));

  const runRequest = requestQueue.then(async () => {
    for (let queryIndex = 0; queryIndex < queries.length; queryIndex++) {
      const delay = Math.max(0, 1100 - (Date.now() - lastRequestAt));
      if (delay) await wait(delay);
      lastRequestAt = Date.now();

      const query = new URLSearchParams({
        q: queries[queryIndex],
        format: 'jsonv2',
        addressdetails: '1',
        limit: '3',
        countrycodes: 'br',
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${query.toString()}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'AgendaHub/1.0 (+https://github.com/Gustavolima07/AgendaHub)',
          },
        },
      );
      if (!response.ok) {
        if (response.status === 429)
          throw new Error(
            'O OpenStreetMap limitou as consultas. Aguarde um minuto e tente novamente.',
          );
        throw new Error('Não foi possível consultar o OpenStreetMap agora.');
      }

      const results = (await response.json()) as {
        lat: string;
        lon: string;
        display_name: string;
      }[];
      if (!results.length) continue;

      const matches = results.map((result) => ({
        latitude: Number(result.lat),
        longitude: Number(result.lon),
        displayName: result.display_name,
        approximate: queryIndex > 0,
      }));
      resultCache.set(normalizedAddress, matches);
      return matches;
    }

    resultCache.set(normalizedAddress, []);
    return [];
  });
  requestQueue = runRequest.then(
    () => undefined,
    () => undefined,
  );
  return runRequest;
}
