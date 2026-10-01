import { Platform } from 'react-native';

export type GoogleAddressPrediction = {
  placeId: string;
  description: string;
  raw?: any;
};

export type GoogleAddressDetails = {
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
  parts: {
    street: string;
    number: string;
    block: string;
    neighborhood: string;
    postalCode: string;
    city: string;
    state: string;
    complement: string;
    country: string;
  };
};

export type GoogleGeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  approximate: boolean;
};

const GOOGLE_MAPS_WEB_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_ANDROID_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;
const GOOGLE_MAPS_IOS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY;
const GOOGLE_MAPS_ANDROID_CERT_SHA1 = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_CERT_SHA1;
let mapsLoader: Promise<any> | undefined;
const webSessionTokens = new Map<string, any>();

function requireApiKey() {
  const apiKey =
    Platform.OS === 'web'
      ? GOOGLE_MAPS_WEB_API_KEY
      : Platform.OS === 'android'
        ? GOOGLE_MAPS_ANDROID_API_KEY
        : GOOGLE_MAPS_IOS_API_KEY;
  if (!apiKey)
    throw new Error(
      Platform.OS === 'web'
        ? 'A chave Google Maps web não está configurada. Defina EXPO_PUBLIC_GOOGLE_MAPS_API_KEY e reinicie o app.'
        : 'Configure uma chave Google Maps separada e restrita para esta plataforma antes de usar a busca no app nativo.',
    );
  return apiKey;
}

function nativeRequestHeaders(apiKey: string): Record<string, string> {
  if (Platform.OS === 'android') {
    if (!GOOGLE_MAPS_ANDROID_CERT_SHA1)
      throw new Error(
        'Configure o SHA-1 do certificado do app em EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_CERT_SHA1 para restringir a chave Android.',
      );
    return {
      'X-Goog-Api-Key': apiKey,
      'X-Android-Package': 'com.gustavolima07.agendahub',
      'X-Android-Cert': GOOGLE_MAPS_ANDROID_CERT_SHA1,
    };
  }
  return {
    'X-Goog-Api-Key': apiKey,
    'X-Ios-Bundle-Identifier': 'com.gustavolima07.agendahub',
  };
}

async function loadGoogleMaps() {
  const key = requireApiKey();
  if (Platform.OS !== 'web')
    throw new Error('A biblioteca Maps JavaScript só funciona na versão web.');
  if ((window as any).google?.maps?.importLibrary) return (window as any).google.maps;
  if (!mapsLoader) {
    mapsLoader = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(
        'agendahub-google-maps',
      ) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve((window as any).google.maps), {
          once: true,
        });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Não foi possível carregar o Google Maps.')),
          { once: true },
        );
        return;
      }
      const script = document.createElement('script');
      script.id = 'agendahub-google-maps';
      const params = new URLSearchParams({
        key,
        v: 'weekly',
        libraries: 'places,geocoding',
        language: 'pt-BR',
        region: 'BR',
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve((window as any).google.maps);
      script.onerror = () =>
        reject(new Error('Falha ao carregar o Google Maps. Verifique a chave e as APIs ativadas.'));
      document.head.appendChild(script);
    });
  }
  return mapsLoader;
}

export function createGooglePlacesSession() {
  return `agendahub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function searchGoogleAddresses(
  input: string,
  sessionToken: string,
): Promise<GoogleAddressPrediction[]> {
  const searchText = input.trim();
  if (searchText.length < 4) return [];
  const key = requireApiKey();

  if (Platform.OS === 'web') {
    const maps = await loadGoogleMaps();
    const places = await maps.importLibrary('places');
    let token = webSessionTokens.get(sessionToken);
    if (!token) {
      token = new places.AutocompleteSessionToken();
      webSessionTokens.set(sessionToken, token);
    }
    const { suggestions = [] } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: searchText,
      includedRegionCodes: ['br'],
      language: 'pt-BR',
      region: 'BR',
      sessionToken: token,
    });
    return suggestions
      .filter((item: any) => item.placePrediction)
      .map((item: any) => ({
        placeId: item.placePrediction.placeId,
        description: item.placePrediction.text.toString(),
        raw: item.placePrediction,
      }));
  }

  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...nativeRequestHeaders(key),
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
    },
    body: JSON.stringify({
      input: searchText,
      includedRegionCodes: ['br'],
      languageCode: 'pt-BR',
      regionCode: 'BR',
      sessionToken,
    }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error?.message || 'O Google Places não conseguiu pesquisar esse endereço.',
    );
  return (data.suggestions || []).flatMap((item: any) =>
    item.placePrediction
      ? [
          {
            placeId: item.placePrediction.placeId,
            description: item.placePrediction.text.text,
          },
        ]
      : [],
  );
}

function addressPartsFromComponents(components: any[] = []) {
  const get = (...types: string[]) =>
    components.find((component) => types.some((type) => component.types.includes(type)));
  const componentText = (component: any, preferShort = false) =>
    component ? (preferShort ? component.shortText : component.longText) || '' : '';
  return {
    street: componentText(get('route')),
    number: componentText(get('street_number')),
    block: componentText(get('subpremise', 'premise')),
    neighborhood: componentText(get('neighborhood', 'sublocality_level_1', 'sublocality')),
    postalCode: componentText(get('postal_code')),
    city: componentText(get('locality', 'postal_town', 'administrative_area_level_2')),
    state: componentText(get('administrative_area_level_1'), true),
    complement: '',
    country: componentText(get('country')) || 'Brasil',
  };
}

export async function getGoogleAddressDetails(
  prediction: GoogleAddressPrediction,
  sessionToken: string,
): Promise<GoogleAddressDetails> {
  if (Platform.OS === 'web') {
    const place = prediction.raw.toPlace();
    await place.fetchFields({ fields: ['formattedAddress', 'addressComponents', 'location'] });
    const location = place.location;
    return {
      formattedAddress: place.formattedAddress || prediction.description,
      latitude: location?.lat(),
      longitude: location?.lng(),
      parts: addressPartsFromComponents(place.addressComponents),
    };
  }

  const key = requireApiKey();
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(prediction.placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
    {
      headers: {
        ...nativeRequestHeaders(key),
        'X-Goog-FieldMask': 'formattedAddress,addressComponents,location',
      },
    },
  );
  const place = await response.json();
  if (!response.ok)
    throw new Error(place.error?.message || 'Não foi possível carregar os detalhes do endereço.');
  return {
    formattedAddress: place.formattedAddress || prediction.description,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    parts: addressPartsFromComponents(place.addressComponents),
  };
}

export async function googleGeocodeAddress(address: string): Promise<GoogleGeocodeResult | null> {
  const query = address.trim();
  if (query.length < 8)
    throw new Error('Preencha um endereço completo para converter em coordenadas.');

  if (Platform.OS === 'web') {
    const maps = await loadGoogleMaps();
    const { Geocoder } = await maps.importLibrary('geocoding');
    const { results } = await new Geocoder().geocode({ address: query, region: 'BR' });
    if (!results?.length) return null;
    const result = results[0];
    return {
      latitude: result.geometry.location.lat(),
      longitude: result.geometry.location.lng(),
      displayName: result.formatted_address,
      approximate: result.geometry.location_type !== 'ROOFTOP',
    };
  }

  const params = new URLSearchParams({ address: query, region: 'br', key: requireApiKey() });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
    headers: nativeRequestHeaders(requireApiKey()),
  });
  const data = await response.json();
  if (!response.ok || (data.status !== 'OK' && data.status !== 'ZERO_RESULTS'))
    throw new Error(
      data.error_message || `Google Geocoding retornou: ${data.status || response.status}.`,
    );
  const result = data.results?.[0];
  return result
    ? {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        displayName: result.formatted_address,
        approximate: result.geometry.location_type !== 'ROOFTOP',
      }
    : null;
}
