import { Dimensions, PixelRatio } from 'react-native';

// Guideline baseline (iPhone 8)
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 667;

const scale = (size) => {
  return Math.round(PixelRatio.roundToNearestPixel((SCREEN_WIDTH / guidelineBaseWidth) * size));
};

const verticalScale = (size) => {
  return Math.round(PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / guidelineBaseHeight) * size));
};

const moderateScale = (size, factor = 0.5) => {
  const scaled = (SCREEN_WIDTH / guidelineBaseWidth) * size;
  return Math.round(PixelRatio.roundToNearestPixel(size + (scaled - size) * factor));
};

// Backwards compatible alias used across the codebase
const normalize = scale;

export { scale, verticalScale, moderateScale, normalize };
