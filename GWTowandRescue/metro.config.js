// const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// /**
//  * Metro configuration
//  * https://reactnative.dev/docs/metro
//  *
//  * @type {import('@react-native/metro-config').MetroConfig}
//  */
// const config = {};

// module.exports = mergeConfig(getDefaultConfig(__dirname), config);


// //from outerspace
// const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// module.exports = mergeConfig(getDefaultConfig(__dirname), {
//   watchFolders: [__dirname],
//   resolver: {
//     blockList: /.*\/build\/intermediates\/.*/  // Ignore all build output
//   }
// });


// const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// module.exports = mergeConfig(getDefaultConfig(__dirname), {
//   server: {
//     port: 8081,
//     host: '0.0.0.0' // Listen on ALL interfaces, not just localhost
//   },
//   resolver: {
//     blockList: /.*\/build\/intermediates\/.*/, // Ignore locked folders
//   },
//   watchFolders: [__dirname]
// });

// //unta ok na
// const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// module.exports = mergeConfig(getDefaultConfig(__dirname), {
//   server: {
//     port: 8081
//   },
//   host: '0.0.0.0', // Correct place for host
//   resolver: {
//     blockList: /.*\/build\/intermediates\/.*/
//   }
// });

//wala pa na ok 
// const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// module.exports = mergeConfig(getDefaultConfig(__dirname), {
//   server: {
//     port: 8081,
//     host: '0.0.0.0'   // ← HOST MUST BE INSIDE server {}
//   },
//   resolver: {
//     blockList: /.*\/build\/intermediates\/.*/
//   }
// });

//wla na lami
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  resolver: {
    blockList: /.*\/build\/intermediates\/.*/
  }
});