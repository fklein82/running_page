# Running Page

A personal running dashboard that visualizes all your runs on an interactive map, with statistics, heatmaps, and location rankings. Built with Leaflet and OpenStreetMap/CARTO tiles (free, no account needed).

Live: [fklein82.github.io/running_page](https://fklein82.github.io/running_page/)

## Features

- Interactive dark-themed map with all running routes
- Year filter to browse runs by year
- Stats overview: total runs, distance, hours, average pace
- Last 12 months heatmap (GitHub-style contribution grid)
- Top countries and cities ranking
- Activity cards with distance, duration, and pace
- Click any route on the map or activity card to highlight it

## How to Update with Apple Health Data

### 1. Export from iPhone

1. Open the **Health** app on your iPhone
2. Tap your **profile picture** (top right)
3. Scroll down and tap **Export All Health Data**
4. Confirm and wait (this can take a few minutes)
5. Share/save the resulting `export.zip` file to your Mac

### 2. Extract GPX Files

Unzip the export. Your workout GPS routes are in:

```
apple_health_export/workout-routes/*.gpx
```

### 3. Parse GPX to JSON

Make sure you have Node.js installed, then run the parser:

```bash
# Edit GPX_DIR in parse_gpx.js to point to your workout-routes folder
node parse_gpx.js > activities.json
```

The parser:
- Reads all `.gpx` files from the workout-routes directory
- Filters for running activities (distance > 500m, pace between ~2:23/km and ~11:00/km)
- Calculates distance, duration, and average speed
- Encodes routes as compressed polylines
- Outputs a JSON file with all activities

### 4. Deploy

Copy the updated `activities.json` into this repo and push:

```bash
cp activities.json /path/to/running_page/
cd /path/to/running_page/
git add activities.json
git commit -m "Update running data"
git push
```

The page is hosted on GitHub Pages and will update automatically.

## Tech Stack

- **Leaflet** + **CARTO dark tiles** (OpenStreetMap) - free, no API key needed
- **Google Polyline encoding** for compact route storage
- **Vanilla JS** - no build tools or frameworks required
- **GitHub Pages** - free hosting

## File Structure

```
index.html        - Single-page app (HTML + CSS + JS)
activities.json   - Running data (generated from GPX export)
parse_gpx.js      - GPX parser script
README.md         - This file
```
