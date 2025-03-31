import os
import logging
from flask import Flask
from routes.views import views
from routes.api import api
from scheduler import start_scheduler

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "mikrotik_monitoring_secret")

# Register blueprints
app.register_blueprint(views)
app.register_blueprint(api, url_prefix='/api')

# Start scheduler for data collection
with app.app_context():
    start_scheduler()

logger.info("Mikrotik Monitoring application initialized")
