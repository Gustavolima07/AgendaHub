import { Account, Delivery } from './types';
import { mapsUrls, wazeUrl } from './domain';

type GpsApp = 'maps' | 'waze';

function csvCell(value: string) {
  const safeValue = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function routeGpsUrl(account: Account, delivery: Delivery, gpsApp: GpsApp) {
  const client = account.clients[delivery.clientId];
  return gpsApp === 'waze'
    ? wazeUrl(delivery.address, client?.latitude, client?.longitude)
    : mapsUrls([delivery])[0] || '';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function routeCsv(account: Account, route: Delivery[], gpsApp: GpsApp) {
  const rows = route.map((delivery, index) => {
    const client = account.clients[delivery.clientId];
    const products = (delivery.lines || [])
      .map((line) => `${line.quantity} x ${line.name} (${line.type})`)
      .join(', ');
    return [
      String(index + 1),
      delivery.time,
      delivery.clientName,
      delivery.address,
      products,
      client?.latitude == null ? '' : String(client.latitude),
      client?.longitude == null ? '' : String(client.longitude),
      routeGpsUrl(account, delivery, gpsApp),
    ]
      .map((value, cellIndex) =>
        cellIndex === 0 || cellIndex === 5 || cellIndex === 6 ? value : csvCell(value),
      )
      .join(';');
  });
  return (
    '\uFEFFOrdem;Hor\u00e1rio;Cliente;Endere\u00e7o;Produtos;Latitude;Longitude;Link GPS\r\n' +
    rows.join('\r\n')
  );
}

export function routePdfHtml(account: Account, route: Delivery[], date: string, gpsApp: GpsApp) {
  const stops = route
    .map(
      (delivery, index) => `<p class="stop">
        <strong>${index + 1}. ${escapeHtml(delivery.clientName)} \u2022 ${escapeHtml(delivery.time)}</strong><br>
        ${escapeHtml(delivery.address)}
      </p>`,
    )
    .join('');
  const navigationUrls =
    gpsApp === 'maps'
      ? mapsUrls(route)
      : route.map((delivery) => routeGpsUrl(account, delivery, gpsApp));
  const navigationLinks = navigationUrls
    .map(
      (url, index) =>
        `<p><a href="${escapeHtml(url)}">${gpsApp === 'waze' ? `Abrir parada ${index + 1} no Waze` : navigationUrls.length === 1 ? 'Abrir viagem no Google Maps' : `Abrir trecho ${index + 1} no Google Maps`}</a><br><small class="url">${escapeHtml(url)}</small></p>`,
    )
    .join('');

  return `<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>AgendaHub - Rota ${escapeHtml(date)}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          body { color: #19251f; font: 12px Arial, sans-serif; }
          h1 { margin: 0 0 4px; font-size: 20px; }
          h2 { margin: 20px 0 8px; font-size: 14px; }
          p { margin: 0 0 12px; }
          .stop { break-inside: avoid; line-height: 1.5; }
          small { color: #526259; }
          .url { overflow-wrap: anywhere; }
          a { color: #22634c; }
        </style>
      </head>
      <body>
        <h1>AgendaHub \u2022 Rota ${escapeHtml(date)}</h1>
        ${stops || '<p>Nenhuma entrega pendente para esta data.</p>'}
        <h2>${gpsApp === 'waze' ? 'Waze (links por parada)' : 'Google Maps (trechos na ordem)'}:</h2>
        ${navigationLinks || '<p>Nenhum link dispon\u00edvel.</p>'}
      </body>
    </html>`;
}
