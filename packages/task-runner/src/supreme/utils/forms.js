const ATC = (size, style, siteName) => {
  if (/eu/i.test(siteName)) {
    return `size=${size}&style=${style}&qty=1`;
  }
  if (/us/i.test(siteName)) {
    return `s=${size}&st=${style}&qty=1`;
  }
  return `s=${size}&st=${style}&qty=1`;
};

module.exports = {
  ATC,
};
