const { withFinalizedMod } = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// The supplied artwork is a complete square icon. Keep it within Android's
// visible mask instead of zooming/cropping the arch as a full 108 dp foreground.
module.exports = function withLauncherArtworkInset(config) {
  return withFinalizedMod(config, ['android', async config => {
    const resourceRoot = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26');
    for (const file of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
      const target = path.join(resourceRoot, file);
      const xml = await fs.readFile(target, 'utf8');
      const updated = xml.replace(/<foreground\s+android:drawable="@mipmap\/ic_launcher_foreground"\s*\/>/,
        '<foreground><inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.6667%" /></foreground>');
      await fs.writeFile(target, updated);
    }
    return config;
  }]);
};
