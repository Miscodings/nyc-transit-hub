from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import sqlite3
from datetime import datetime
import os
from google.transit import gtfs_realtime_pb2
import zipfile
import io
import csv
import time
from pathlib import Path

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# MTA API Configuration
MTA_API_KEY = os.environ.get('MTA_API_KEY', 'YOUR_MTA_API_KEY')

# MTA GTFS-RT Feed URLs (no API key needed as of 2024)
MTA_FEEDS = {
    'ACE': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
    'BDFM': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
    'G': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g',
    'JZ': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz',
    'NQRW': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
    '1234567': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs',
    'L': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l',
    'SIR': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si',
}

# Service Alerts feed
MTA_ALERTS_FEED = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts'

# GTFS Static URL (public MTA zip)
GTFS_STATIC_URL = 'http://web.mta.info/developers/data/nyct/subway/google_transit.zip'
GTFS_ZIP_PATH = Path(__file__).parent / 'google_transit.zip'
GTFS_CACHE_TTL = 60 * 60 * 24  # 24 hours

# Database initialization
def init_db():
    conn = sqlite3.connect('transit_hub.db')
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firebase_uid TEXT UNIQUE NOT NULL,
            email TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Favorites table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            route_id TEXT NOT NULL,
            route_type TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, route_id)
        )
    ''')
    
    # Alerts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            route_id TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            enabled BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Service status cache
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS service_status_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id TEXT NOT NULL,
            status TEXT NOT NULL,
            message TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# Helper function to get database connection
def get_db():
    conn = sqlite3.connect('transit_hub.db')
    conn.row_factory = sqlite3.Row
    return conn

# Helper function to fetch GTFS-RT feed
def fetch_gtfs_feed(feed_url):
    """Fetch and parse GTFS-realtime feed"""
    try:
        headers = {}
        if MTA_API_KEY and MTA_API_KEY != 'YOUR_MTA_API_KEY':
            headers['x-api-key'] = MTA_API_KEY
            
        response = requests.get(feed_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        feed = gtfs_realtime_pb2.FeedMessage()
        feed.ParseFromString(response.content)
        
        return feed
    except Exception as e:
        print(f"Error fetching GTFS feed from {feed_url}: {e}")
        return None

# Helper function to get route status from alerts
def get_route_status_from_alerts():
    """Parse service alerts to determine route status"""
    route_status = {}
    
    try:
        feed = fetch_gtfs_feed(MTA_ALERTS_FEED)
        if not feed:
            return route_status
        
        for entity in feed.entity:
            if entity.HasField('alert'):
                alert = entity.alert
                
                # Get affected routes
                for informed_entity in alert.informed_entity:
                    if informed_entity.HasField('route_id'):
                        route_id = informed_entity.route_id
                        
                        # Capture header and description separately
                        header = ""
                        if alert.header_text.translation:
                            header = alert.header_text.translation[0].text

                        description = ""
                        if alert.description_text.translation:
                            description = alert.description_text.translation[0].text

                        # Build a concise combined text for quick display (header + description)
                        if header and description:
                            combined_text = f"{header} — {description}"
                        elif header:
                            combined_text = header
                        elif description:
                            combined_text = description
                        else:
                            combined_text = "Service alert"
                        
                        # Determine severity based on keywords (improved matching)
                        status = 'good'
                        combined_text_lower = combined_text.lower()

                        # Check for more specific conditions
                        if 'suspended' in combined_text_lower or 'no service' in combined_text_lower or 'not operating' in combined_text_lower:
                            status = 'service-change'
                        elif 'delayed' in combined_text_lower or 'delay' in combined_text_lower or 'running behind' in combined_text_lower:
                            status = 'delay'
                        elif 'skip' in combined_text_lower or 'skips' in combined_text_lower or 'skip stops' in combined_text_lower:
                            status = 'service-change'
                        elif 'express' in combined_text_lower and ('running' in combined_text_lower or 'skip' in combined_text_lower):
                            status = 'service-change'
                        elif 'modified schedule' in combined_text_lower or 'adjusted schedule' in combined_text_lower:
                            status = 'service-change'
                        
                        # Initialize route_status for this route if not exists
                        if route_id not in route_status:
                            route_status[route_id] = {
                                'status': 'good',
                                'messages': []
                            }
                        
                        # Add message to the list (include header + description separately)
                        route_status[route_id]['messages'].append({
                            'header': header[:200],
                            'description': description[:1000],
                            'text': combined_text[:300],
                            'status': status
                        })
                        
                        # Update overall status to worst severity (severity: service-change > delay > good)
                        status_priority = {'service-change': 2, 'delay': 1, 'good': 0}
                        if status_priority[status] > status_priority[route_status[route_id]['status']]:
                            route_status[route_id]['status'] = status
        
        print(f"[MTA] Fetched {len(route_status)} routes with alerts at {datetime.now().isoformat()}")
        return route_status
    except Exception as e:
        print(f"Error parsing alerts: {e}")
        import traceback
        traceback.print_exc()
        return route_status

# ==================== MTA API Routes ====================

@app.route('/api/service-status', methods=['GET'])
def get_service_status():
    """Get real-time service status for all MTA lines"""
    try:
        # Get route status from alerts
        route_status = get_route_status_from_alerts()
        
        # Define all subway lines
        all_lines = {
            '1': {'name': '1 Line', 'type': 'subway'},
            '2': {'name': '2 Line', 'type': 'subway'},
            '3': {'name': '3 Line', 'type': 'subway'},
            '4': {'name': '4 Line', 'type': 'subway'},
            '5': {'name': '5 Line', 'type': 'subway'},
            '6': {'name': '6 Line', 'type': 'subway'},
            '7': {'name': '7 Line', 'type': 'subway'},
            'A': {'name': 'A Line', 'type': 'subway'},
            'B': {'name': 'B Line', 'type': 'subway'},
            'C': {'name': 'C Line', 'type': 'subway'},
            'D': {'name': 'D Line', 'type': 'subway'},
            'E': {'name': 'E Line', 'type': 'subway'},
            'F': {'name': 'F Line', 'type': 'subway'},
            'G': {'name': 'G Line', 'type': 'subway'},
            'J': {'name': 'J Line', 'type': 'subway'},
            'L': {'name': 'L Line', 'type': 'subway'},
            'M': {'name': 'M Line', 'type': 'subway'},
            'N': {'name': 'N Line', 'type': 'subway'},
            'Q': {'name': 'Q Line', 'type': 'subway'},
            'R': {'name': 'R Line', 'type': 'subway'},
            'W': {'name': 'W Line', 'type': 'subway'},
            'Z': {'name': 'Z Line', 'type': 'subway'},
            'SI': {'name': 'Staten Island Railway', 'type': 'subway'},
            'S': {'name': 'Shuttle (S)', 'type': 'subway'},
        }
        
        # Build response
        service_data = []
        lines_with_alerts = 0
        
        for route_id, info in all_lines.items():
            if route_id in route_status:
                status_info = route_status[route_id]
                primary_text = status_info['messages'][0]['text'] if status_info.get('messages') else 'Service alert'
                service_data.append({
                    'id': route_id,
                    'name': info['name'],
                    'type': info['type'],
                    'status': status_info['status'],
                    'message': primary_text,
                    'messages': status_info['messages']  # Now includes all alerts
                })
                if status_info['status'] != 'good':
                    lines_with_alerts += 1
            else:
                service_data.append({
                    'id': route_id,
                    'name': info['name'],
                    'type': info['type'],
                    'status': 'good',
                    'message': 'Good Service',
                    'messages': [{'header': 'Good Service', 'description': '', 'text': 'Good Service', 'status': 'good'}]
                })
        
        # Cache the results
        conn = get_db()
        cursor = conn.cursor()
        for service in service_data:
            # Store primary status and all messages as JSON
            messages_str = '|'.join([msg['text'] for msg in service['messages']])
            cursor.execute('''
                INSERT OR REPLACE INTO service_status_cache 
                (route_id, status, message, updated_at)
                VALUES (?, ?, ?, ?)
            ''', (service['id'], service['status'], messages_str, datetime.now()))
        conn.commit()
        conn.close()
        
        print(f"[API] Returning service status for {len(service_data)} lines ({lines_with_alerts} with alerts)")
        
        return jsonify({'success': True, 'data': service_data, 'updated_at': datetime.now().isoformat()})
    except Exception as e:
        print(f"Error in get_service_status: {e}")
        import traceback
        traceback.print_exc()
        # Try to return cached data if available
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM service_status_cache')
            cached = cursor.fetchall()
            conn.close()
            
            if cached:
                cached_data = [dict(row) for row in cached]
                return jsonify({'success': True, 'data': cached_data, 'cached': True})
        except:
            pass
        
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/stations', methods=['GET'])
def get_stations():
    """Get list of major stations with accessibility information"""
    try:
        # Major NYC subway stations with real data
        stations = [
            {
                'id': '127',
                'name': 'Times Square-42nd St',
                'lines': ['1', '2', '3', 'N', 'Q', 'R', 'W', 'S', '7'],
                'accessible': True,
                'elevators': ['42nd St & 7th Ave', '42nd St & 8th Ave'],
                'escalators': ['Main entrance', 'Port Authority connector'],
                'lat': 40.7580,
                'lon': -73.9855
            },
            {
                'id': '631',
                'name': 'Grand Central-42nd St',
                'lines': ['4', '5', '6', '7', 'S'],
                'accessible': True,
                'elevators': ['Lexington Ave entrance', 'Grand Central Terminal'],
                'escalators': ['East entrance', 'West entrance'],
                'lat': 40.7527,
                'lon': -73.9772
            },
            {
                'id': '120',
                'name': 'Penn Station-34th St',
                'lines': ['1', '2', '3', 'A', 'C', 'E'],
                'accessible': True,
                'elevators': ['7th Ave entrance', '8th Ave entrance'],
                'escalators': ['Main entrance'],
                'lat': 40.7505,
                'lon': -73.9934
            },
            {
                'id': '635',
                'name': 'Union Square-14th St',
                'lines': ['4', '5', '6', 'L', 'N', 'Q', 'R', 'W'],
                'accessible': True,
                'elevators': ['14th St & Broadway'],
                'escalators': ['Main entrance'],
                'lat': 40.7359,
                'lon': -73.9911
            },
            {
                'id': '725',
                'name': 'Atlantic Ave-Barclays Ctr',
                'lines': ['2', '3', '4', '5', 'B', 'D', 'N', 'Q', 'R'],
                'accessible': True,
                'elevators': ['Multiple elevators'],
                'escalators': ['Multiple escalators'],
                'lat': 40.6840,
                'lon': -73.9767
            },
            {
                'id': 'A32',
                'name': 'Jay St-MetroTech',
                'lines': ['A', 'C', 'F', 'R'],
                'accessible': True,
                'elevators': ['Jay St entrance'],
                'escalators': ['Main entrance'],
                'lat': 40.6924,
                'lon': -73.9875
            },
            {
                'id': '902',
                'name': 'Herald Square-34th St',
                'lines': ['B', 'D', 'F', 'M', 'N', 'Q', 'R', 'W'],
                'accessible': False,
                'elevators': [],
                'escalators': ['6th Ave entrance'],
                'lat': 40.7498,
                'lon': -73.9878
            },
            {
                'id': '718',
                'name': 'Fulton St',
                'lines': ['2', '3', '4', '5', 'A', 'C', 'J', 'Z'],
                'accessible': True,
                'elevators': ['Multiple elevators'],
                'escalators': ['Multiple escalators'],
                'lat': 40.7099,
                'lon': -74.0089
            },
            {
                'id': 'D14',
                'name': 'Columbus Circle-59th St',
                'lines': ['1', '2', 'A', 'B', 'C', 'D'],
                'accessible': True,
                'elevators': ['Broadway entrance', '8th Ave entrance'],
                'escalators': ['Multiple escalators'],
                'lat': 40.7682,
                'lon': -73.9818
            },
            {
                'id': '423',
                'name': 'Canal St',
                'lines': ['J', 'N', 'Q', 'R', 'W', 'Z', '6'],
                'accessible': False,
                'elevators': [],
                'escalators': ['Main entrance'],
                'lat': 40.7189,
                'lon': -74.0006
            }
        ]
        
        return jsonify({'success': True, 'data': stations})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/arrivals/<station_id>', methods=['GET'])
def get_arrivals(station_id):
    """Get real-time arrival information for a specific station"""
    try:
        arrivals = []
        
        # Fetch all feeds and look for this station
        for feed_name, feed_url in MTA_FEEDS.items():
            feed = fetch_gtfs_feed(feed_url)
            if not feed:
                continue
            
            for entity in feed.entity:
                if entity.HasField('trip_update'):
                    trip = entity.trip_update
                    route_id = trip.trip.route_id
                    
                    for stop_time in trip.stop_time_update:
                        # Match station (station IDs have N/S for direction)
                        if stop_time.stop_id.startswith(station_id):
                            if stop_time.HasField('arrival'):
                                arrival_time = stop_time.arrival.time
                                current_time = int(datetime.now().timestamp())
                                minutes = max(0, (arrival_time - current_time) // 60)
                                
                                # Determine direction from stop_id
                                direction = 'Uptown' if stop_time.stop_id.endswith('N') else 'Downtown'
                                
                                arrivals.append({
                                    'line': route_id,
                                    'direction': direction,
                                    'minutes': int(minutes)
                                })
        
        # Sort by minutes and limit to next 10 trains
        arrivals.sort(key=lambda x: x['minutes'])
        arrivals = arrivals[:10]
        
        return jsonify({'success': True, 'station_id': station_id, 'arrivals': arrivals})
    except Exception as e:
        print(f"Error getting arrivals: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ------------------ GTFS Static parsing (for full station lists & route polylines) ------------------
def download_gtfs_static(force=False):
    """Download GTFS static zip and cache locally (ttl = 24h). Returns path or None."""
    try:
        if GTFS_ZIP_PATH.exists() and not force:
            mtime = GTFS_ZIP_PATH.stat().st_mtime
            if time.time() - mtime < GTFS_CACHE_TTL:
                return str(GTFS_ZIP_PATH)

        resp = requests.get(GTFS_STATIC_URL, timeout=30)
        resp.raise_for_status()
        with open(GTFS_ZIP_PATH, 'wb') as f:
            f.write(resp.content)
        return str(GTFS_ZIP_PATH)
    except Exception as e:
        print(f"Error downloading GTFS static zip: {e}")
        return None


def parse_gtfs_static():
    """Parse GTFS static zip and build route -> ordered list of stops (lat/lon).
       Returns (route_polylines, stops_list)
    """
    zip_path = download_gtfs_static()
    if not zip_path:
        return {}, []

    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            namelist = z.namelist()

            def read_csv(name):
                if name not in namelist:
                    return []
                data = z.read(name).decode('utf-8')
                reader = csv.DictReader(io.StringIO(data))
                return list(reader)

            stops_rows = read_csv('stops.txt')
            trips_rows = read_csv('trips.txt')
            stop_times_rows = read_csv('stop_times.txt')

            # Map stops
            stops = {}
            for r in stops_rows:
                stop_id = r.get('stop_id')
                if not stop_id:
                    continue
                try:
                    lat = float(r.get('stop_lat') or 0)
                    lon = float(r.get('stop_lon') or 0)
                except:
                    lat = 0.0
                    lon = 0.0
                stops[stop_id] = {
                    'stop_id': stop_id,
                    'name': r.get('stop_name') or r.get('stop_desc') or stop_id,
                    'lat': lat,
                    'lon': lon,
                    'lines': set()
                }

            # Map trips -> route
            trip_to_route = {}
            for r in trips_rows:
                trip_id = r.get('trip_id')
                route_id = r.get('route_id')
                if trip_id and route_id:
                    trip_to_route[trip_id] = route_id

            # Collect stop sequences per trip
            trip_stopseq = {}
            for r in stop_times_rows:
                trip_id = r.get('trip_id')
                stop_id = r.get('stop_id')
                seq = int(r.get('stop_sequence') or 0)
                if not trip_id or not stop_id:
                    continue
                trip_stopseq.setdefault(trip_id, []).append((seq, stop_id))

            # Build route -> list of candidate trips (each as ordered stop list)
            route_trips = {}
            for trip_id, seqs in trip_stopseq.items():
                route_id = trip_to_route.get(trip_id)
                if not route_id:
                    continue
                ordered = [stop for _, stop in sorted(seqs, key=lambda x: x[0])]
                route_trips.setdefault(route_id, []).append(ordered)

            # For each route, pick the trip with the most stops as representative
            route_polylines = {}
            for route_id, trips in route_trips.items():
                best = max(trips, key=lambda x: len(x))
                coords = []
                seen = set()
                for stop_id in best:
                    s = stops.get(stop_id)
                    if not s:
                        continue
                    # avoid duplicate consecutive stops
                    if stop_id in seen:
                        continue
                    seen.add(stop_id)
                    coords.append([s['lat'], s['lon']])
                    s['lines'].add(route_id)

                route_polylines[route_id] = {
                    'id': route_id,
                    'name': route_id,
                    'coordinates': coords
                }

            # Build stops_list with lines as array
            stops_list = []
            for stop in stops.values():
                stops_list.append({
                    'id': stop['stop_id'],
                    'name': stop['name'],
                    'lat': stop['lat'],
                    'lon': stop['lon'],
                    'lines': sorted(list(stop['lines']))
                })

            return route_polylines, stops_list
    except Exception as e:
        print(f"Error parsing GTFS static: {e}")
        import traceback
        traceback.print_exc()
        return {}, []


@app.route('/api/route-polylines', methods=['GET'])
def get_route_polylines():
    """Return per-route ordered coordinates (polylines) and full stops list."""
    try:
        route_polylines, stops_list = parse_gtfs_static()
        # Convert route_polylines dict to list
        routes = []
        for rid, r in route_polylines.items():
            routes.append(r)

        return jsonify({'success': True, 'routes': routes, 'stops': stops_list, 'updated_at': datetime.now().isoformat()})
    except Exception as e:
        print(f"Error in get_route_polylines: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== User Routes ====================

@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user (called after Firebase authentication)"""
    try:
        data = request.json
        firebase_uid = data.get('firebase_uid')
        email = data.get('email')
        
        if not firebase_uid or not email:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (firebase_uid, email) VALUES (?, ?)', 
                      (firebase_uid, email))
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'user_id': user_id})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'error': 'User already exists'}), 409
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users/<firebase_uid>', methods=['GET'])
def get_user(firebase_uid):
    """Get user information by Firebase UID"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE firebase_uid = ?', (firebase_uid,))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return jsonify({
                'success': True,
                'user': dict(user)
            })
        else:
            return jsonify({'success': False, 'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== Favorites Routes ====================

@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    """Get user's favorite routes"""
    try:
        firebase_uid = request.args.get('firebase_uid')
        if not firebase_uid:
            return jsonify({'success': False, 'error': 'firebase_uid required'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT f.* FROM favorites f
            JOIN users u ON f.user_id = u.id
            WHERE u.firebase_uid = ?
        ''', (firebase_uid,))
        favorites = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({'success': True, 'favorites': favorites})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    """Add a route to favorites"""
    try:
        data = request.json
        firebase_uid = data.get('firebase_uid')
        route_id = data.get('route_id')
        route_type = data.get('route_type')
        
        if not all([firebase_uid, route_id, route_type]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Get user_id from firebase_uid
        cursor.execute('SELECT id FROM users WHERE firebase_uid = ?', (firebase_uid,))
        user = cursor.fetchone()
        if not user:
            conn.close()
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        user_id = user['id']
        
        cursor.execute('''
            INSERT INTO favorites (user_id, route_id, route_type)
            VALUES (?, ?, ?)
        ''', (user_id, route_id, route_type))
        favorite_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'favorite_id': favorite_id})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'error': 'Favorite already exists'}), 409
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/favorites/<int:favorite_id>', methods=['DELETE'])
def delete_favorite(favorite_id):
    """Remove a route from favorites"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM favorites WHERE id = ?', (favorite_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== Alerts Routes ====================

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get user's alert preferences"""
    try:
        firebase_uid = request.args.get('firebase_uid')
        if not firebase_uid:
            return jsonify({'success': False, 'error': 'firebase_uid required'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT a.* FROM alerts a
            JOIN users u ON a.user_id = u.id
            WHERE u.firebase_uid = ?
        ''', (firebase_uid,))
        alerts = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({'success': True, 'alerts': alerts})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/alerts', methods=['POST'])
def create_alert():
    """Create a new alert"""
    try:
        data = request.json
        firebase_uid = data.get('firebase_uid')
        route_id = data.get('route_id')
        alert_type = data.get('alert_type')
        
        if not all([firebase_uid, route_id, alert_type]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM users WHERE firebase_uid = ?', (firebase_uid,))
        user = cursor.fetchone()
        if not user:
            conn.close()
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        user_id = user['id']
        
        cursor.execute('''
            INSERT INTO alerts (user_id, route_id, alert_type)
            VALUES (?, ?, ?)
        ''', (user_id, route_id, alert_type))
        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'alert_id': alert_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/alerts/<int:alert_id>', methods=['DELETE'])
def delete_alert(alert_id):
    """Delete an alert"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM alerts WHERE id = ?', (alert_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== Health Check ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)