export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    mapboxToken: process.env.MAPBOX_TOKEN ?? '',
  },
});
