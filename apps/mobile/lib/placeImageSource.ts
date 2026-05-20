import type { ImageSourcePropType } from 'react-native';

/** `require()` asset, remote URI string, or `{ uri }` for React Native Image. */
export function placeImageSource(image: unknown): ImageSourcePropType | undefined {
  if (image == null) return undefined;
  if (typeof image === 'number') return image;
  if (typeof image === 'string') {
    const uri = image.trim();
    return uri ? { uri } : undefined;
  }
  if (typeof image === 'object' && image !== null && 'uri' in image) {
    return image as ImageSourcePropType;
  }
  return undefined;
}
