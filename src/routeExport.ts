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
    '\uFEFFOrdem;Horário;Cliente;Endereço;Produtos;Latitude;Longitude;Link GPS\r\n' +
    rows.join('\r\n')
  );
}

export function routePdfHtml(account: Account, route: Delivery[], date: string, gpsApp: GpsApp) {
  const rows = route
    .map((delivery, index) => {
      const client = account.clients[delivery.clientId];
      const products = (delivery.lines || [])
        .map((line) => `${line.quantity} × ${line.name} (${line.type})`)
        .join('<br>');
      const gpsUrl = routeGpsUrl(account, delivery, gpsApp);
      const coordinates =
        client?.latitude != null && client.longitude != null
          ? `${client.latitude}, ${client.longitude}`
          : 'Não informadas';
      return `<tr>
        <td class="order">${index + 1}</td>
        <td>${escapeHtml(delivery.time)}</td>
        <td><strong>${escapeHtml(delivery.clientName)}</strong><br>${escapeHtml(delivery.address)}<br><small>GPS: ${escapeHtml(coordinates)}</small></td>
        <td>${products}</td>
        <td><a href="${escapeHtml(gpsUrl)}">Abrir ${gpsApp === 'waze' ? 'Waze' : 'Google Maps'}</a></td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>AgendaHub · Rota ${escapeHtml(date)}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          body { color: #19251f; font: 12px Arial, sans-serif; }
          h1 { margin: 0 0 4px; font-size: 22px; }
          p { color: #526259; margin: 0 0 18px; }
          table { border-collapse: collapse; width: 100%; }
          th { background: #22634c; color: white; text-align: left; }
          th, td { border: 1px solid #d8e1dc; padding: 9px 8px; vertical-align: top; }
          tr { break-inside: avoid; }
          .order { color: #22634c; font-size: 16px; font-weight: bold; text-align: center; }
          small { color: #65756c; }
          a { color: #22634c; }
          footer { color: #65756c; font-size: 10px; margin-top: 18px; }
        </style>
      </head>
      <body>
        <h1>AgendaHub · Rota do dia</h1>
        <p>${escapeHtml(date.split('-').reverse().join('/'))} · ${route.length} parada(s) · GPS: ${gpsApp === 'waze' ? 'Waze' : 'Google Maps'}</p>
        <table>
          <thead><tr><th>#</th><th>Horário</th><th>Cliente e endereço</th><th>Produtos</th><th>Navegação</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5">Nenhuma entrega pendente para esta data.</td></tr>'}</tbody>
        </table>
        <footer>Rota gerada pelo AgendaHub. Confirme endereços, coordenadas e sequência antes de iniciar a entrega.</footer>
      </body>
    </html>`;
}
