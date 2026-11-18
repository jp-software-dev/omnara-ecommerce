// A neutral gray used as the blur placeholder of every remote image (product photos,
// category tiles, hero). It is drawn over the card's own muted background, so there is no
// jump and no flash while the real picture loads, in both the light and the dark theme.
// Precomputed (it is an 8x8 SVG: <rect fill='#808080' fill-opacity='0.14'/>) so it also works in
// client components without Buffer.
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPjxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzgnIGZpbGw9JyM4MDgwODAnIGZpbGwtb3BhY2l0eT0nMC4xNCcvPjwvc3ZnPg==";
