const RAD = Math.PI / 180;
const LAT_LIMIT = 85;
const VISIBLE = [-66, 82];
const PREFERRED = [-57, 77];
const ESSENTIAL = [-47, 66];

export const CENTER_LON = 11;

export const mercatorY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createView(width, height, centerLon = CENTER_LON) {
  const yTop = mercatorY(VISIBLE[1]);
  const yBottom = mercatorY(VISIBLE[0]);
  const prefTop = mercatorY(PREFERRED[1]);
  const prefBottom = mercatorY(PREFERRED[0]);
  const essTop = mercatorY(ESSENTIAL[1]);
  const essBottom = mercatorY(ESSENTIAL[0]);

  let scale = width / (2 * Math.PI);
  let span = height / scale;
  let centerY;

  if (span < essTop - essBottom) {
    scale = height / (essTop - essBottom);
    span = essTop - essBottom;
    centerY = (essTop + essBottom) / 2;
  } else if (span <= prefTop - prefBottom) {
    centerY = clamp((prefTop + prefBottom) / 2, essTop - span / 2, essBottom + span / 2);
  } else if (span >= yTop - yBottom) {
    centerY = (yTop + yBottom) / 2;
  } else {
    centerY = clamp((prefTop + prefBottom) / 2, yBottom + span / 2, yTop - span / 2);
  }

  const worldWidth = 2 * Math.PI * scale;

  return {
    width,
    height,
    scale,
    centerY,
    centerLon,
    worldWidth,
    yTop,
    yBottom,
    project(lat, lon) {
      const dLon = ((((lon - centerLon + 180) % 360) + 360) % 360) - 180;
      const y = mercatorY(clamp(lat, -LAT_LIMIT, LAT_LIMIT));
      return {
        x: width / 2 + dLon * RAD * scale,
        y: height / 2 - (y - centerY) * scale,
      };
    },
  };
}
