const { withProjectBuildGradle } = require('expo/config-plugins');

// mappls-map-react-native's own app.plugin.js is broken in the published package
// (points at a plugin/build folder that isn't shipped), so this minimal plugin
// does the one thing the android install docs require: register the Mappls maven
// repository so Gradle can resolve the com.mappls.sdk artifacts.
const MAVEN_LINE = "        maven { url 'https://maven.mappls.com/repository/mappls/' }";

module.exports = function withMapplsMaven(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('maven.mappls.com')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /allprojects\s*\{\s*\n(\s*)repositories\s*\{/,
        (match) => `${match}\n${MAVEN_LINE}`
      );
    }
    return cfg;
  });
};
