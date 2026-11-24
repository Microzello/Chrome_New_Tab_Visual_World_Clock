const RAD = Math.PI / 180;

export function subsolarPoint(ms) {
  const t = (ms / 86400000 + 2440587.5 - 2451545) / 36525;
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const center =
    Math.sin(m * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m * RAD) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m * RAD) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const lambda = l0 + center - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const declination = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) / RAD;

  const y = Math.tan((eps * RAD) / 2) ** 2;
  const equationOfTime =
    (4 / RAD) *
    (y * Math.sin(2 * l0 * RAD) -
      2 * e * Math.sin(m * RAD) +
      4 * e * y * Math.sin(m * RAD) * Math.cos(2 * l0 * RAD) -
      0.5 * y * y * Math.sin(4 * l0 * RAD) -
      1.25 * e * e * Math.sin(2 * m * RAD));

  const utcMinutes = (((ms % 86400000) + 86400000) % 86400000) / 60000;
  const lon = -(utcMinutes + equationOfTime - 720) / 4;
  return { lat: declination, lon: ((((lon + 180) % 360) + 360) % 360) - 180 };
}

export function sunAltitude(sun, lat, lon) {
  const p = lat * RAD;
  const d = sun.lat * RAD;
  const s = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos((lon - sun.lon) * RAD);
  return Math.asin(Math.max(-1, Math.min(1, s))) / RAD;
}
