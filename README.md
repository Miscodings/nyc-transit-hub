# NYC Transit Hub

A comprehensive web application providing real-time updates, schedules, and transit information for New York City's public transportation system.

## Features

- **Real-time Service Status Dashboard**: Monitor the status of all MTA subway and bus lines
- **Interactive Transit Map**: Visualize subway and bus routes with station information
- **Favorites Management**: Save and track your most-used routes and stations
- **Service Alerts**: Get notified about delays and service changes
- **Accessibility Information**: View elevator and escalator availability at stations
- **Multilingual Support**: Available in English, Spanish, and Chinese
- **User Authentication**: Secure account creation via Firebase

## Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Authentication**: Firebase Auth

### Backend
- **Framework**: Flask (Python)
- **Database**: SQLite
- **API Integration**: MTA API
- **CORS**: Flask-CORS

### Testing
- **Frontend**: Jest + React Testing Library
- **Backend**: PyTest

### Deployment
- **Frontend**: Netlify or Vercel
- **Backend**: Can be deployed to Heroku, Railway, or similar platforms

## Project Structure

```
nyc-transit-hub/
├── backend/
│   ├── app.py                  # Flask application
│   ├── requirements.txt        # Python dependencies
│   ├── transit_hub.db          # SQLite database (auto-generated)
│   └── tests/
│       └── test_api.py         # Backend tests
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main React component
│   │   ├── firebase-config.js  # Firebase configuration
│   │   ├── services/
│   │   │   ├── ApiService.js   # API service layer
│   │   │   └── AuthService.js  # Authentication service
│   │   └── components/         # React components
│   ├── package.json            # Node dependencies
│   ├── vite.config.js          # Vite configuration
│   ├── tailwind.config.js      # Tailwind configuration
│   └── index.html              # HTML entry point
├── .env.example                # Environment variables template
└── README.md                   # Project documentation
```

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 18+
- Firebase project (create at https://console.firebase.google.com)

### Backend Setup

1. **Navigate to the backend directory**:
   ```
   cd backend
   ```

2. **Create a virtual environment**:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```
   cp ../.env.example .env
   ```

5. **Run the Flask server**:
   ```
   python app.py
   ```
   The backend will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```
   cd frontend
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Set up environment variables**:
   ```
   cp ../.env.example .env.local
   # Edit .env.local and add your Firebase credentials
   ```

4. **Update Firebase configuration**:
   - Edit `src/firebase-config.js` with your Firebase project credentials

5. **Run the development server**:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

## Running Tests

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

## API Endpoints

### Service Status
- `GET /api/service-status` - Get real-time status of all MTA services
- `GET /api/stations` - Get list of all stations with accessibility info
- `GET /api/arrivals/:stationId` - Get arrival times for a specific station

### User Management
- `POST /api/users` - Create a new user
- `GET /api/users/:firebaseUid` - Get user information

### Favorites
- `GET /api/favorites?firebase_uid=:uid` - Get user's favorites
- `POST /api/favorites` - Add a route to favorites
- `DELETE /api/favorites/:id` - Remove a favorite

### Alerts
- `GET /api/alerts?firebase_uid=:uid` - Get user's alert preferences
- `POST /api/alerts` - Create a new alert
- `DELETE /api/alerts/:id` - Delete an alert

### Health Check
- `GET /api/health` - Check API health status

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Favorites Table
```sql
CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    route_id TEXT NOT NULL,
    route_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, route_id)
);
```

### Alerts Table
```sql
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    route_id TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## Deployment

### Frontend (Netlify/Vercel)

1. **Build the frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify**:
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variables in Netlify dashboard

3. **Deploy to Vercel**:
   - Install Vercel CLI: `npm i -g vercel`
   - Run: `vercel`
   - Follow the prompts

### Backend (Heroku/Railway)

1. **Create a `Procfile`**:
   ```
   web: python app.py
   ```

2. **Deploy to Heroku**:
   ```bash
   heroku create your-app-name
   heroku config:set MTA_API_KEY=your_key
   git push heroku main
   ```

3. **Deploy to Railway**:
   - Connect your GitHub repository
   - Add environment variables in Railway dashboard
   - Deploy automatically on push

## Security Considerations

- API keys are stored in environment variables, never in code
- User authentication is handled by Firebase
- CORS is configured to only allow requests from your frontend domain
- SQL injection is prevented using parameterized queries
- User input is validated on both frontend and backend

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the MTA API documentation: https://api.mta.info
- Review Firebase documentation: https://firebase.google.com/docs

## Acknowledgments

- MTA for providing the public transit API
- Firebase for authentication services
- All contributors to this project
