# Visual World Clock New Tab

Chrome extension that replaces the New Tab page with a live satellite world map: real day and night, city lights on the night side, and the local time and UTC offset for each of your cities.

## Run

1. Open `chrome://extensions` and turn on Developer mode.
2. Click **Load unpacked** and pick this folder.
3. Open a new tab. Move the cursor to the bottom of the page for the time slider and the Edit button.

## Develop

Plain ES modules, no build step. After editing, click the reload icon on the extension card in `chrome://extensions` and open a new tab.

To work on it outside the extension, serve the folder and open it in Chrome (settings fall back to `localStorage`):

```sh
python -m http.server 8765
```

## Common commands

Rebuild the map textures and city index from the source downloads:

```sh
python tools/build_assets.py <dir with day.jpg, night.jpg, cities1000.txt, admin1CodesASCII.txt>
```

## Dependencies

- Runtime: none. Uses WebGL2 (with a 2D canvas fallback), `Intl` for time zones and DST, and `chrome.storage.sync`.
- Asset build: Python 3 with Pillow.
- Data: NASA Earth Observatory Blue Marble (`world.topo.bathy.200408`) and Black Marble 2016 imagery; GeoNames `cities1000` and `admin1CodesASCII` (CC BY 4.0).
