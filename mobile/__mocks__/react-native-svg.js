// Sprint 87A: react-native-svg test stub — Babel transform problemini bypass eder.
// Jest mock factory (jest.mock('react-native-svg', () => ...)) ayni sonucu vermedi cunku
// CircularProgress import zincirinde svg once yuku, Babel parser onu cozemeden once hata atiyor.
// moduleNameMapper jest config'inde tanimli, dolayisiyla tum testlerde otomatik uygulanir.
module.exports = {
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Circle: 'Circle',
  G: 'G',
  Path: 'Path',
  Rect: 'Rect',
  Text: 'SvgText',
  TSpan: 'TSpan',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  Stop: 'Stop',
  Mask: 'Mask',
  Polygon: 'Polygon',
  Polyline: 'Polyline',
  Symbol: 'Symbol',
  Use: 'Use',
};