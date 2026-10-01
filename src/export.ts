import { Platform, Share } from 'react-native';
export async function exportText(name: string, text: string, mime = 'text/csv') {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const FS = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const file = new FS.File(FS.Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: 'Exportar AgendaHub' });
  else await Share.share({ message: text });
}

export async function exportPdf(name: string, html: string) {
  const Print = await import('expo-print');
  if (Platform.OS === 'web') {
    const response = await fetch('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const openedWindow = window.open(url, '_blank');
    if (!openedWindow) {
      const link = document.createElement('a');
      link.href = url;
      link.download = name.replace(/\.pdf$/i, '.html');
      link.click();
    } else {
      openedWindow.addEventListener('load', () => openedWindow.print(), { once: true });
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });

  const Sharing = await import('expo-sharing');
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Exportar ${name}`,
      UTI: 'com.adobe.pdf',
    });
  else await Share.share({ message: `${name}: ${uri}`, url: uri });
}
