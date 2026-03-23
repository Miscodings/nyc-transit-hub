import csv
import io
import time
import zipfile
from datetime import datetime

import requests
from flask import Blueprint, jsonify
from google.transit import gtfs_realtime_pb2

from config import (
    ALL_LINES,
    GTFS_CACHE_TTL,
    GTFS_STATIC_URL,
    GTFS_ZIP_PATH,
    MTA_ALERTS_FEED,
    MTA_API_KEY,
    MTA_FEEDS,
)

mta_bp = Blueprint('mta', __name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _mta_headers():
    h = {}
    if MTA_API_KEY:
        h['x-api-key'] = MTA_API_KEY
    return h


def fetch_gtfs_feed(url):
    """Fetch and parse a GTFS-RT protobuf feed. Returns FeedMessage or None."""
    try:
        resp = requests.get(url, headers=_mta_headers(), timeout=10)
        resp.raise_for_status()
        feed = gtfs_realtime_pb2.FeedMessage()
        feed.ParseFromString(resp.content)
        return feed
    except Exception as e:
        print(f"[MTA] Failed to fetch {url}: {e}")
        return None


def get_route_status_from_alerts():
    """Parse the MTA alerts feed into per-route status dicts."""
    route_status = {}
    feed = fetch_gtfs_feed(MTA_ALERTS_FEED)
    if not feed:
        return route_status

    priority = {'service-change': 2, 'delay': 1, 'good': 0}

    for entity in feed.entity:
        if not entity.HasField('alert'):
            continue
        alert = entity.alert

        header = alert.header_text.translation[0].text if alert.header_text.translation else ''
        description = alert.description_text.translation[0].text if alert.description_text.translation else ''

        if header and description:
            combined = f"{header} — {description}"
        else:
            combined = header or description or 'Service alert'

        combined_lower = combined.lower()
        status = 'good'
        if any(k in combined_lower for k in ('suspended', 'no service', 'not operating')):
            status = 'service-change'
        elif any(k in combined_lower for k in ('delayed', 'delay', 'running behind')):
            status = 'delay'
        elif any(k in combined_lower for k in ('skip', 'skips', 'skip stops', 'modified schedule', 'adjusted schedule')):
            status = 'service-change'
        elif 'express' in combined_lower and ('running' in combined_lower or 'skip' in combined_lower):
            status = 'service-change'

        for informed in alert.informed_entity:
            if not informed.HasField('route_id'):
                continue
            rid = informed.route_id
            if rid not in route_status:
                route_status[rid] = {'status': 'good', 'messages': []}

            route_status[rid]['messages'].append({
                'header':      header[:200],
                'description': description[:1000],
                'text':        combined[:300],
                'status':      status,
            })
            if priority[status] > priority[route_status[rid]['status']]:
                route_status[rid]['status'] = status

    print(f"[MTA] Alerts parsed: {len(route_status)} routes affected")
    return route_status


# ---------------------------------------------------------------------------
# GTFS Static parsing
# ---------------------------------------------------------------------------

def download_gtfs_static():
    """Download GTFS static zip, cache locally for 24 h. Returns path or None."""
    try:
        if GTFS_ZIP_PATH.exists():
            if time.time() - GTFS_ZIP_PATH.stat().st_mtime < GTFS_CACHE_TTL:
                return str(GTFS_ZIP_PATH)
        resp = requests.get(GTFS_STATIC_URL, timeout=30)
        resp.raise_for_status()
        GTFS_ZIP_PATH.write_bytes(resp.content)
        return str(GTFS_ZIP_PATH)
    except Exception as e:
        print(f"[GTFS] Download failed: {e}")
        return None


def parse_gtfs_static():
    """Return (route_polylines dict, stops list) using shapes.txt — memory efficient.

    shapes.txt is purpose-built for route geometry and orders of magnitude smaller
    than stop_times.txt, making it safe to use on free-tier hosts (512 MB RAM).
    stops list is intentionally empty — the frontend uses the hardcoded /api/stations.
    """
    zip_path = download_gtfs_static()
    if not zip_path:
        return {}, []

    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            names = z.namelist()

            def stream_csv(name):
                """Yield rows one at a time — never loads the whole file into RAM."""
                if name not in names:
                    return
                with z.open(name) as f:
                    yield from csv.DictReader(io.TextIOWrapper(f, 'utf-8'))

            # 1. trips.txt — pick one shape_id per route_id (first encountered)
            route_to_shape = {}
            for r in stream_csv('trips.txt'):
                rid      = r.get('route_id', '').strip()
                shape_id = r.get('shape_id', '').strip()
                if rid and shape_id and rid in ALL_LINES and rid not in route_to_shape:
                    route_to_shape[rid] = shape_id

            shape_to_route = {s: r for r, s in route_to_shape.items()}

            # 2. shapes.txt — collect ordered points for each needed shape
            shape_points = {}  # shape_id -> list of (sequence, lat, lon)
            for r in stream_csv('shapes.txt'):
                sid = r.get('shape_id', '').strip()
                if sid not in shape_to_route:
                    continue
                try:
                    lat = float(r['shape_pt_lat'])
                    lon = float(r['shape_pt_lon'])
                    seq = int(r['shape_pt_sequence'])
                except (KeyError, ValueError):
                    continue
                shape_points.setdefault(sid, []).append((seq, lat, lon))

            # 3. Build sorted polylines per route
            route_polylines = {}
            for shape_id, points in shape_points.items():
                rid    = shape_to_route[shape_id]
                coords = [[lat, lon] for _, lat, lon in sorted(points)]
                route_polylines[rid] = {'id': rid, 'name': rid, 'coordinates': coords}

        print(f"[GTFS] Built {len(route_polylines)} route polylines from shapes.txt")
        return route_polylines, []   # empty stops — frontend uses /api/stations

    except Exception as e:
        import traceback
        print(f"[GTFS] Parse failed: {e}")
        traceback.print_exc()
        return {}, []


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@mta_bp.route('/service-status')
def get_service_status():
    try:
        route_status = get_route_status_from_alerts()
        service_data = []

        for rid, info in ALL_LINES.items():
            if rid in route_status:
                rs = route_status[rid]
                service_data.append({
                    'id':       rid,
                    'name':     info['name'],
                    'type':     info['type'],
                    'status':   rs['status'],
                    'message':  rs['messages'][0]['text'] if rs['messages'] else 'Service alert',
                    'messages': rs['messages'],
                })
            else:
                service_data.append({
                    'id':       rid,
                    'name':     info['name'],
                    'type':     info['type'],
                    'status':   'good',
                    'message':  'Good Service',
                    'messages': [{'header': 'Good Service', 'description': '',
                                  'text': 'Good Service', 'status': 'good'}],
                })

        return jsonify({'success': True, 'data': service_data,
                        'updated_at': datetime.now().isoformat()})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@mta_bp.route('/stations')
def get_stations():
    # Hardcoded major stations — enriched by /route-polylines on the frontend
    stations = [
        {'id': '127',  'name': 'Times Square-42nd St',       'lines': ['1','2','3','N','Q','R','W','S','7'], 'accessible': True,  'elevators': ['42nd St & 7th Ave', '42nd St & 8th Ave'], 'escalators': ['Main entrance', 'Port Authority connector'], 'lat': 40.7580, 'lon': -73.9855},
        {'id': '631',  'name': 'Grand Central-42nd St',       'lines': ['4','5','6','7','S'],                 'accessible': True,  'elevators': ['Lexington Ave entrance', 'Grand Central Terminal'], 'escalators': ['East entrance', 'West entrance'], 'lat': 40.7527, 'lon': -73.9772},
        {'id': '120',  'name': 'Penn Station-34th St',        'lines': ['1','2','3','A','C','E'],             'accessible': True,  'elevators': ['7th Ave entrance', '8th Ave entrance'], 'escalators': ['Main entrance'], 'lat': 40.7505, 'lon': -73.9934},
        {'id': '635',  'name': 'Union Square-14th St',        'lines': ['4','5','6','L','N','Q','R','W'],     'accessible': True,  'elevators': ['14th St & Broadway'], 'escalators': ['Main entrance'], 'lat': 40.7359, 'lon': -73.9911},
        {'id': '725',  'name': 'Atlantic Ave-Barclays Ctr',   'lines': ['2','3','4','5','B','D','N','Q','R'], 'accessible': True,  'elevators': ['Multiple elevators'], 'escalators': ['Multiple escalators'], 'lat': 40.6840, 'lon': -73.9767},
        {'id': 'A32',  'name': 'Jay St-MetroTech',            'lines': ['A','C','F','R'],                     'accessible': True,  'elevators': ['Jay St entrance'], 'escalators': ['Main entrance'], 'lat': 40.6924, 'lon': -73.9875},
        {'id': '902',  'name': 'Herald Square-34th St',       'lines': ['B','D','F','M','N','Q','R','W'],     'accessible': False, 'elevators': [], 'escalators': ['6th Ave entrance'], 'lat': 40.7498, 'lon': -73.9878},
        {'id': '718',  'name': 'Fulton St',                   'lines': ['2','3','4','5','A','C','J','Z'],     'accessible': True,  'elevators': ['Multiple elevators'], 'escalators': ['Multiple escalators'], 'lat': 40.7099, 'lon': -74.0089},
        {'id': 'D14',  'name': 'Columbus Circle-59th St',     'lines': ['1','2','A','B','C','D'],             'accessible': True,  'elevators': ['Broadway entrance', '8th Ave entrance'], 'escalators': ['Multiple escalators'], 'lat': 40.7682, 'lon': -73.9818},
        {'id': '423',  'name': 'Canal St',                    'lines': ['J','N','Q','R','W','Z','6'],         'accessible': False, 'elevators': [], 'escalators': ['Main entrance'], 'lat': 40.7189, 'lon': -74.0006},
    ]
    return jsonify({'success': True, 'data': stations})


@mta_bp.route('/arrivals/<station_id>')
def get_arrivals(station_id):
    try:
        arrivals = []
        now = int(datetime.now().timestamp())

        for feed_url in MTA_FEEDS.values():
            feed = fetch_gtfs_feed(feed_url)
            if not feed:
                continue
            for entity in feed.entity:
                if not entity.HasField('trip_update'):
                    continue
                trip = entity.trip_update
                rid  = trip.trip.route_id
                for stu in trip.stop_time_update:
                    if not stu.stop_id.startswith(station_id):
                        continue
                    if not stu.HasField('arrival'):
                        continue
                    minutes   = max(0, (stu.arrival.time - now) // 60)
                    direction = 'Uptown' if stu.stop_id.endswith('N') else 'Downtown'
                    arrivals.append({'line': rid, 'direction': direction, 'minutes': int(minutes)})

        arrivals.sort(key=lambda x: x['minutes'])
        return jsonify({'success': True, 'station_id': station_id, 'arrivals': arrivals[:10]})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@mta_bp.route('/route-polylines')
def get_route_polylines():
    try:
        route_polylines, stops_list = parse_gtfs_static()
        return jsonify({
            'success':    True,
            'routes':     list(route_polylines.values()),
            'stops':      stops_list,
            'updated_at': datetime.now().isoformat(),
        })
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
