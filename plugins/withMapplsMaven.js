const { withProjectBuildGradle, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// mappls-map-react-native's own app.plugin.js is broken in the published package
// (points at a plugin/build folder that isn't shipped), so this plugin does the
// two things the android install docs require:
// 1. Register the Mappls maven repository so Gradle can resolve com.mappls.sdk.
// 2. Copy the Mappls licence files (<name>.a.olf + <name>.a.conf, downloaded
//    from apps.mappls.com for package com.karmaverse.agent) from the project's
//    mappls/ folder into android/app/, where react-mappls-plugin.gradle
//    searches for them at build time.
const MAVEN_LINE = "        maven { url 'https://maven.mappls.com/repository/mappls/' }";

const withMavenRepo = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('maven.mappls.com')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /allprojects\s*\{\s*\n(\s*)repositories\s*\{/,
        (match) => `${match}\n${MAVEN_LINE}`
      );
    }
    return cfg;
  });

const withLicenceFiles = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      const srcDir = path.join(cfg.modRequest.projectRoot, 'mappls');
      const destDir = path.join(cfg.modRequest.platformProjectRoot, 'app');
      if (fs.existsSync(srcDir)) {
        for (const name of fs.readdirSync(srcDir)) {
          if (name.endsWith('.a.olf') || name.endsWith('.a.conf')) {
            fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
          }
        }
      }
      return cfg;
    },
  ]);

module.exports = function withMappls(config) {
  return withLicenceFiles(withMavenRepo(config));
};
