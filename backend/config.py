import os
from pathlib import Path

# MTA API key (optional as of 2024 — feeds are public)
MTA_API_KEY = os.environ.get('MTA_API_KEY', '')

# GTFS-RT feed URLs
MTA_FEEDS = {
    'ACE':     'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
    'BDFM':    'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
    'G':       'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g',
    'JZ':      'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz',
    'NQRW':    'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
    '1234567': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs',
    'L':       'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l',
    'SIR':     'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si',
}

MTA_ALERTS_FEED = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts'

# GTFS static (route shapes / all stops)
GTFS_STATIC_URL = 'http://web.mta.info/developers/data/nyct/subway/google_transit.zip'
GTFS_ZIP_PATH   = Path(__file__).parent / 'google_transit.zip'
GTFS_CACHE_TTL  = 60 * 60 * 24  # 24 hours

# All MTA subway lines
ALL_LINES = {
    '1':  {'name': '1 Line',              'type': 'subway'},
    '2':  {'name': '2 Line',              'type': 'subway'},
    '3':  {'name': '3 Line',              'type': 'subway'},
    '4':  {'name': '4 Line',              'type': 'subway'},
    '5':  {'name': '5 Line',              'type': 'subway'},
    '6':  {'name': '6 Line',              'type': 'subway'},
    '7':  {'name': '7 Line',              'type': 'subway'},
    'A':  {'name': 'A Line',              'type': 'subway'},
    'B':  {'name': 'B Line',              'type': 'subway'},
    'C':  {'name': 'C Line',              'type': 'subway'},
    'D':  {'name': 'D Line',              'type': 'subway'},
    'E':  {'name': 'E Line',              'type': 'subway'},
    'F':  {'name': 'F Line',              'type': 'subway'},
    'G':  {'name': 'G Line',              'type': 'subway'},
    'J':  {'name': 'J Line',              'type': 'subway'},
    'L':  {'name': 'L Line',              'type': 'subway'},
    'M':  {'name': 'M Line',              'type': 'subway'},
    'N':  {'name': 'N Line',              'type': 'subway'},
    'Q':  {'name': 'Q Line',              'type': 'subway'},
    'R':  {'name': 'R Line',              'type': 'subway'},
    'W':  {'name': 'W Line',              'type': 'subway'},
    'Z':  {'name': 'Z Line',              'type': 'subway'},
    'SI': {'name': 'Staten Island Railway','type': 'subway'},
    'S':  {'name': 'Shuttle (S)',          'type': 'subway'},
}
