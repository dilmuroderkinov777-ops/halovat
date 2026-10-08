const { withAppBuildGradle } = require('@expo/config-plugins');

const marker = 'CMAKE_OBJECT_PATH_MAX=240';

module.exports = function withShortCmakeObjectPaths(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;

    const contents = config.modResults.contents;
    if (contents.includes(marker)) return config;

    const defaultConfigStart = contents.indexOf('    defaultConfig {');
    if (defaultConfigStart === -1) {
      throw new Error('Could not find the Android defaultConfig block for the CMake path setting.');
    }

    const insertAt = defaultConfigStart + '    defaultConfig {'.length;
    config.modResults.contents =
      contents.slice(0, insertAt) +
      `\n        externalNativeBuild {\n            cmake {\n                arguments "-D${marker}"\n            }\n        }` +
      contents.slice(insertAt);

    return config;
  });
};
