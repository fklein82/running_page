const fs = require('fs');
const path = require('path');

const GPX_DIR = '/Users/fklein/Documents/apple_health_export/workout-routes';
const files = fs.readdirSync(GPX_DIR).filter(f => f.endsWith('.gpx')).sort();

console.error(`Processing ${files.length} GPX files...`);

// Google polyline encoder
function encodePolyline(coords) {
  let encoded = '';
  let prevLat = 0, prevLng = 0;
  for (const [lat, lng] of coords) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);
    encoded += encodeValue(latE5 - prevLat);
    encoded += encodeValue(lngE5 - prevLng);
    prevLat = latE5;
    prevLng = lngE5;
  }
  return encoded;
}

function encodeValue(value) {
  let v = value < 0 ? ~(value << 1) : (value << 1);
  let encoded = '';
  while (v >= 0x20) {
    encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  encoded += String.fromCharCode(v + 63);
  return encoded;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const activities = {};
let count = 0;

for (const file of files) {
  try {
    const xml = fs.readFileSync(path.join(GPX_DIR, file), 'utf-8');

    // Extract trackpoints with regex (fast, no XML parser needed)
    const points = [];
    const trkptRegex = /lat="([^"]+)"[^>]*>[^]*?<time>([^<]+)<\/time>(?:[^]*?<speed>([^<]+)<\/speed>)?/g;
    let match;
    // Simpler approach: extract all trkpt
    const ptRegex = /<trkpt\s+lon="([^"]+)"\s+lat="([^"]+)"[^]*?<time>([^<]+)<\/time>(?:[^]*?<speed>([^<]+)<\/speed>)?/g;

    while ((match = ptRegex.exec(xml)) !== null) {
      points.push({
        lat: parseFloat(match[2]),
        lon: parseFloat(match[1]),
        time: match[3],
        speed: match[4] ? parseFloat(match[4]) : 0
      });
    }

    if (points.length < 5) continue;

    // Calculate distance
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
      distance += haversine(points[i-1].lat, points[i-1].lon, points[i].lat, points[i].lon);
    }

    // Skip if too short (< 500m) - probably not a run
    if (distance < 500) continue;

    // Calculate moving time
    const startTime = new Date(points[0].time);
    const endTime = new Date(points[points.length - 1].time);
    const totalSeconds = (endTime - startTime) / 1000;

    if (totalSeconds < 120) continue; // skip < 2 min

    // Average speed
    const avgSpeed = distance / totalSeconds; // m/s

    // Skip if too slow (walking < 1.5 m/s ~ 11 min/km) or too fast (> 7 m/s ~ 2:23/km)
    if (avgSpeed < 1.5 || avgSpeed > 7) continue;

    // Simplify polyline (every Nth point)
    const step = Math.max(1, Math.floor(points.length / 200));
    const simplified = [];
    for (let i = 0; i < points.length; i += step) {
      simplified.push([points[i].lat, points[i].lon]);
    }
    if (simplified.length < 2) continue;

    // Average heart rate from speed points
    const speeds = points.filter(p => p.speed > 0).map(p => p.speed);
    const avgSpeedFromGPS = speeds.length > 0 ? speeds.reduce((a,b) => a+b, 0) / speeds.length : avgSpeed;

    // Format moving time
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    const movingTime = `${hours}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;

    // Format date
    const dateLocal = startTime.toISOString().replace('T', ' ').substring(0, 19);
    const dateStr = file.match(/route_(\d{4}-\d{2}-\d{2})/)?.[1] || startTime.toISOString().substring(0, 10);

    const runId = startTime.getTime();

    activities[runId] = {
      run_id: runId,
      name: 'Run',
      distance: distance,
      moving_time: movingTime,
      type: 'Run',
      start_date: startTime.toISOString().replace('T', ' ').substring(0, 19),
      start_date_local: dateLocal,
      location_country: '',
      summary_polyline: encodePolyline(simplified),
      average_heartrate: null,
      average_speed: avgSpeedFromGPS || avgSpeed,
      streak: 1
    };

    count++;
  } catch (e) {
    // Skip bad files
  }
}

console.error(`Generated ${count} running activities`);
console.log(JSON.stringify(activities));
