import type { Coordinates } from '../types';

export function decodePolyline(encodedShape: string | null, precision = 6): Coordinates[] {
  if (!encodedShape) return [];

  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const factor = 10 ** precision;
  const coordinates: Coordinates[] = [];

  while (index < encodedShape.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encodedShape.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encodedShape.length);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encodedShape.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encodedShape.length);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({ lat: latitude / factor, lng: longitude / factor });
  }

  return coordinates;
}
