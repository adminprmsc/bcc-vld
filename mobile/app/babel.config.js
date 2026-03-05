module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@rnmapbox/maps': '@rnmapbox/maps/lib/module/index.native'
          }
        }
      ],
      [
        'transform-remove-imports',
        {
          "regex": "\\.css$"
        }
      ]
    ]
  };
};
