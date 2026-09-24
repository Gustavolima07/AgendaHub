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
