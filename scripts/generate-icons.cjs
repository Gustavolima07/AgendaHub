const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
async function main() {
  const assets = path.resolve(__dirname, '../assets');
  const source = await fs.readFile(path.join(assets, 'brand.svg'));
  await sharp(source).resize(1024).png().toFile(path.join(assets, 'icon.png'));
  await sharp(source).resize(64).png().toFile(path.join(assets, 'favicon.png'));
  const foreground = source.toString().replace(/<rect width="1024"[^>]+\/>/, '');
  await sharp(Buffer.from(foreground))
    .resize(1024)
    .png()
    .toFile(path.join(assets, 'android-icon-foreground.png'));
  console.log('Ícones do AgendaHub atualizados.');
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
