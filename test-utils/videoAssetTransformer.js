/**
 * In the app, require('clip.mp4') returns an asset number, which is what the
 * player hands to react-native-video. The preset's asset transformer returns
 * an object instead, so tests couldn't tell clips apart. This returns a
 * stable number per file name, like the app does.
 */
const path = require('path');

module.exports = {
  process(_source, filename) {
    let hash = 7;
    for (const char of path.basename(filename)) {
      hash = (hash * 31 + char.charCodeAt(0)) % 1000000007;
    }
    return { code: `module.exports = ${hash};` };
  },
};
