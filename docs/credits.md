# Credits

MISSION27 is not an official NASA product. NASA, NOAA and other organisations
named below do not endorse this project.

Labels used in the game: NASA DATA / NOAA DATA mark real records.
MISSION27 SIMULATION marks anything computed or invented by the game.

## Textures
- Moon 02 (color, normal GL, roughness maps, 2K) — Poly Haven, [author name shown
  on the asset page], CC0 1.0. https://polyhaven.com/a/moon_02
  Normal map resized to 2048 px and converted to WebP with Squoosh.
  [Check the Lossless box was ticked, then keep or edit this line.]

## Terrain (NASA DATA, derived)
- LRO LOLA DEM 5 mpp, Site04: Shackleton Rim, S Pole — NASA Moon Trek
  (trek.nasa.gov), accessed 2026-10-16. File: Site04_final_adj_5mpp_surf.tif.
  Credit requested by the data provider: Barker, M.K., et al. (2020), Improved
  LOLA Elevation Maps for South Pole Landing Sites: Error Estimates and Their
  Impact on Illumination Conditions, Planetary & Space Science,
  doi:10.1016/j.pss.2020.105119.
  Modified: two small windows cut from the source (256x256 at 5 m, 128x128 at
  50 m), gaps filled with nearest value, stored as 16-bit height files.
  About 90 percent of the source pixels are interpolated by the original authors.

## Earth imagery (NASA DATA)
- DSCOVR EPIC natural color images and metadata, NASA, via api.nasa.gov/EPIC,
  date 2024-05-10, accessed 2026-10-[xx]. https://epic.gsfc.nasa.gov
  Five frames used: epic_1b_20240510002712, 040317, 055119, 073921, 130329.
  The game reads the metadata (time, center latitude and longitude) from
  assets/data/epic-2024-05-10.json.

## Space weather (NOAA DATA)
Event: May 2024 solar storm, 10-11 May 2024 (active region 3664).
All records are in assets/data/storm-record.json.
- NOAA Space Weather Prediction Center, edited events files
  20240510events.txt and 20240511events.txt (flare class, begin, max, end).
- NOAA Space Weather Prediction Center, Joint USAF/NOAA Solar Geophysical
  Activity Report and Forecast, 0511RSGA.txt (SDF 132) and 0512RSGA.txt (SDF 133)
  (proton peaks).
- Archive: NOAA NCEI, SWPC Reports, Forecasts and Summaries,
  https://www.ncei.noaa.gov/products/space-weather/swpc-products-and-data
  (accessed 2026-10-[xx]).
- Proton peak of 206 pfu on 10 May was read through a SpaceWeatherLive mirror
  of the NOAA report; confirm against 0510RSGA.txt. [Remove this line once done.]
- Start time of the 11 May proton event: SIDC (Royal Observatory of Belgium),
  https://sidc.be/article/x-class-festival-continues
- Context: ESA Space Environment, https://space-env.esa.int/?p=7192
- Live feed examples: NOAA SWPC GOES X-ray and proton flux,
  https://www.swpc.noaa.gov (only if used in the build).

Crew dose, shelter time and resource effects are MISSION27 SIMULATION.

## Fonts, icons, other assets
- [One line each: name, author, link, license]
