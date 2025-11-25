# NYC Transit Hub

A real-time NYC subway service status tracker with an interactive map, multi-language support, and dark mode. Built with React, Flask, and MTA GTFS real-time feeds.

## Features

✨ **Real-Time Data**
- Live MTA service alerts and status updates
- Real-time subway line information (A-Z, 1-7, S, SI)
- Trip updates and arrival predictions

🗺️ **Interactive Map**
- Full subway route visualization with all stations
- Color-coded lines per MTA convention
- Station markers with line information
- Parallel polylines for overlapping routes for clarity

🌐 **Multi-Language Support**
- English, Spanish (Español), and Chinese (中文)
- Persisted language preference

🎨 **Dark Mode**
- Toggle between light and dark themes
- Persisted theme preference
- High-contrast dark-mode styling

❤️ **Favorites & Alerts**
- Save favorite subway lines
- User authentication via Firebase
- Custom alert preferences

## Tech Stack

### Frontend
- **React** 18 + Vite
- **Tailwind CSS** for styling
- **Leaflet + react-leaflet** for interactive mapping
- **lucide-react** for icons
- **Axios** for API calls
- **Firebase** for authentication

### Backend
- **Python 3** + Flask
- **GTFS-realtime** parsing (google.transit.gtfs_realtime_pb2)
- **SQLite3** for caching and user data
- **Requests** for HTTP calls to MTA feeds

### Data Sources
- **MTA GTFS-RT Feeds** (real-time service information)
- **MTA Alerts Feed** (service disruptions and advisories)
- **GTFS Static Data** (station coordinates and route shapes)

## Project Structure

```
lcbc-transit_hub/
├── frontend/                      # React Vite app
│   ├── src/
│   │   ├── App.jsx               # Main app with tabs and service status display
│   │   ├── MapView.jsx           # Interactive Leaflet map component
│   │   ├── main.jsx
│   │   ├── index.css             # Global styles + dark mode overrides
│   │   ├── firebase-config.js    # Firebase configuration
│   │   └── services/
│   │       ├── ApiService.js     # Backend API client
│   │       └── AuthService.js    # Firebase auth wrapper
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── dist/                      # Built production files
│
├── backend/                       # Flask API server
│   ├── app.py                    # Main Flask app with all endpoints
│   ├── requirements.txt          # Python dependencies
│   ├── verify_mta_data.py        # Script to test MTA feeds
│   ├── tests/
│   │   └── test_api.py          # API tests
│   └── transit_hub.db           # SQLite database (cached data & users)
│
├── .gitignore
├── LICENSE
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 16+ (for frontend)
- Python 3.8+ (for backend)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/lcbc-transit_hub.git
   cd lcbc-transit_hub
   ```

2. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev    # Start development server at http://localhost:5173
   ```

3. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   python app.py  # Start Flask at http://localhost:5000
   ```

### Configuration

#### Firebase Setup (for authentication)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select an existing one
3. Register a web app
4. Copy your Firebase config
5. Add it to `frontend/src/firebase-config.js`:
   ```javascript
   export const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
6. Enable **Email/Password** authentication in Firebase Console

#### MTA API (optional)
- MTA feeds are publicly accessible and don't require an API key
- If you have an MTA API key, set it as an environment variable:
  ```bash
  export MTA_API_KEY=your_key_here
  ```

## Usage

### Running Locally

**Development Mode:**
```bash
# Terminal 1: Frontend (Vite dev server)
cd frontend
npm run dev

# Terminal 2: Backend (Flask)
cd backend
python app.py
```

Open http://localhost:5173 in your browser.

**Production Build:**
```bash
cd frontend
npm run build        # Creates dist/ folder
npm run preview      # Preview built app locally
```

### API Endpoints

- `GET /api/service-status` — Real-time service status for all lines
- `GET /api/stations` — List of major subway stations
- `GET /api/arrivals/<station_id>` — Next arriving trains at a station
- `GET /api/route-polylines` — Complete route geometries from GTFS static data
- `POST /api/users` — Create a new user (Firebase)
- `GET/POST/DELETE /api/favorites` — Manage favorite lines
- `GET/POST/DELETE /api/alerts` — Manage alert preferences
- `GET /api/health` — Health check

## Features Explained

### Real-Time Service Status
- Fetches MTA alerts feed every time the dashboard loads
- Classifies alerts as "good", "delay", or "service-change"
- Displays primary alert message with option to expand for all alerts

### Interactive Map
- Renders all ~470 NYC subway stations as small dots
- Draws colored polylines per route (using MTA line colors)
- When multiple routes share the same corridor, lines appear parallel (offset) instead of overlapping
- Hover over stations to see names and serving lines

### Multi-Language
- Supports English, Spanish, and Chinese
- Language preference persisted in browser localStorage
- All UI strings translated (translations object in App.jsx)

### Dark Mode
- Toggle with sun/moon icon in header
- Theme persisted in localStorage
- Uses Tailwind dark mode with CSS overrides for consistency

### User Authentication & Favorites
- Firebase Email/Password authentication
- Users can save favorite lines
- Users can set alert preferences (not yet fully implemented)

## Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Connect repository to [Vercel](https://vercel.com)
3. Vercel auto-detects Vite and builds `frontend/dist`
4. Add environment variables (Firebase config)
5. Auto-deploys on every push to main

### Backend (Render, Railway, or similar)
1. Create account on [Render.com](https://render.com) or [Railway.app](https://railway.app)
2. Connect GitHub repo
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `python app.py`
5. Add `PORT` environment variable if needed
6. Deploy and get a public API URL

### Connect Frontend to Deployed Backend
Update `frontend/src/services/ApiService.js`:
```javascript
const API_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';
```

Add `VITE_API_URL` to Vercel environment variables with your backend URL.

## Development

### Adding Translations
1. Open `frontend/src/App.jsx`
2. Find the `translations` object
3. Add new keys to `en`, `es`, and `zh` objects
4. Use `t.keyName` in JSX

Example:
```javascript
const translations = {
  en: { myNewKey: 'Hello' },
  es: { myNewKey: 'Hola' },
  zh: { myNewKey: '你好' },
};
```

### Testing the Backend
```bash
cd backend
python verify_mta_data.py  # Checks feed accessibility and parsing
python -m pytest tests/    # Run unit tests
```

### Modifying Map Rendering
- Edit `frontend/src/MapView.jsx` for map components
- Polyline rendering uses `offsetPolyline()` helper to separate overlapping routes
- Adjust `OFFSET_BASE` constant to control line separation distance

## Known Limitations

- Alert predictions are not yet fully accurate (API updates can be delayed)
- User alert preferences UI is incomplete
- Some accessibility features (elevator/escalator info) are static and not real-time
- Map doesn't show real-time vehicle positions yet

## Future Enhancements

- [ ] Real-time vehicle positions on map
- [ ] Accessibility information (elevators, escalators) integration
- [ ] Push notifications for alerts on favorite lines
- [ ] Trip planning (A to B routing)
- [ ] Offline mode with cached data
- [ ] More language support (French, Korean, etc.)
- [ ] Bus route data (currently subway-focused)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Data Attribution

- **MTA Data** — Real-time service information provided by the [Metropolitan Transportation Authority](https://new.mta.info/)
- **Map Data** — © [OpenStreetMap](https://www.openstreetmap.org/) contributors
- **Icons** — [Lucide React](https://lucide.dev/)

## Support

For issues, questions, or suggestions, please open an [issue](https://github.com/yourusername/lcbc-transit_hub/issues) on GitHub.

---

**Happy commuting! 🚇**
