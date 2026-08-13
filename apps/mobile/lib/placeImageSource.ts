import type { ImageSourcePropType } from 'react-native';

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

export function placeHasDisplayImage(place: {
  image?: unknown;
  gallery?: unknown[];
}): boolean {
  if (placeImageSource(place.image)) return true;
  if (Array.isArray(place.gallery)) {
    for (const g of place.gallery) {
      if (placeImageSource(g)) return true;
    }
  }
  return false;
}
