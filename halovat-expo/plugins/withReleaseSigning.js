const { withAppBuildGradle } = require('@expo/config-plugins');

const begin = '// HALOVAT_RELEASE_SIGNING_BEGIN';
const end = '// HALOVAT_RELEASE_SIGNING_END';
const signing = `
${begin}
def halovatStore = System.getenv('HALOVAT_RELEASE_STORE_FILE')
def halovatTestBuild = System.getenv('HALOVAT_TEST_BUILD') == '1'
def halovatReleaseRequested = gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') }
if (halovatStore) {
    ['HALOVAT_RELEASE_STORE_PASSWORD', 'HALOVAT_RELEASE_KEY_ALIAS', 'HALOVAT_RELEASE_KEY_PASSWORD'].each { name ->
        if (!System.getenv(name)) throw new GradleException('Missing release signing variable: ' + name)
    }
    android.signingConfigs.create('halovatRelease') {
        storeFile file(halovatStore)
        storePassword System.getenv('HALOVAT_RELEASE_STORE_PASSWORD')
        keyAlias System.getenv('HALOVAT_RELEASE_KEY_ALIAS')
        keyPassword System.getenv('HALOVAT_RELEASE_KEY_PASSWORD')
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.halovatRelease
} else if (halovatReleaseRequested && !halovatTestBuild && System.getenv('EAS_BUILD') != 'true') {
    throw new GradleException('Production signing is missing. Use scripts/build-android.ps1 -Mode test for an installable test APK, or supply production credentials.')
}
if (halovatTestBuild && gradle.startParameter.taskNames.any { it.toLowerCase().contains('bundle') }) {
    throw new GradleException('A Play bundle cannot use the test signing key.')
}
${end}
`;
module.exports = config => withAppBuildGradle(config, mod => {
  if (mod.modResults.language !== 'groovy') throw new Error('Halovat signing requires a Groovy Gradle project.');
  const source = mod.modResults.contents;
  const first = source.indexOf(begin);
  mod.modResults.contents = (first < 0 ? source : source.slice(0, first) + source.slice(source.indexOf(end, first) + end.length)).trimEnd() + '\n' + signing;
  return mod;
});
