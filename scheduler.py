import logging
import time
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from typing import Dict, Any

from mikrotik import mikrotik_api
from models import DataStore, Device
import config

logger = logging.getLogger(__name__)

# Create scheduler
scheduler = BackgroundScheduler()

def collect_device_data(device_id: str) -> None:
    """Collect data from a device"""
    device = DataStore.devices.get(device_id)
    if not device or not device.enabled:
        logger.debug(f"Skipping disabled or missing device: {device_id}")
        return
    
    logger.debug(f"Collecting data from device: {device.name} ({device.host})")
    result = mikrotik_api.collect_all_data(device_id)
    
    if not result.get("success", False):
        error_message = result.get("error", "Unknown error")
        logger.error(f"Failed to collect data from {device.name}: {error_message}")
        
        # Update device status
        device.error_message = error_message
        DataStore.devices[device_id] = device
    else:
        logger.debug(f"Successfully collected data from {device.name}")
        
        # Update device status
        device.last_connected = datetime.now()
        device.error_message = None
        DataStore.devices[device_id] = device

def schedule_device_collection() -> None:
    """Schedule data collection for configured devices"""
    # Clear existing jobs
    scheduler.remove_all_jobs()
    
    # Get refresh interval
    refresh_interval = config.get_refresh_interval()
    
    # Schedule data collection for each device
    devices = config.get_devices()
    for device_data in devices:
        device_id = device_data['id']
        
        # Create or update device in data store
        device = Device(
            id=device_id,
            name=device_data['name'],
            host=device_data['host'],
            port=device_data.get('port', 8728),
            username=device_data.get('username', 'admin'),
            password=device_data.get('password', ''),
            enabled=device_data.get('enabled', True)
        )
        DataStore.devices[device_id] = device
        
        # Schedule data collection
        if device.enabled:
            job_id = f"collect_data_{device_id}"
            trigger = IntervalTrigger(seconds=refresh_interval)
            scheduler.add_job(
                collect_device_data, 
                trigger=trigger, 
                id=job_id,
                args=[device_id],
                replace_existing=True
            )
            logger.info(f"Scheduled data collection for {device.name} every {refresh_interval} seconds")
            
            # Collect data immediately
            scheduler.add_job(
                collect_device_data,
                args=[device_id],
                id=f"initial_collect_{device_id}",
                next_run_time=datetime.now()
            )

def cleanup_alerts() -> None:
    """Clean up old resolved alerts"""
    current_time = datetime.now()
    # Keep alerts that are either active or resolved within the last 24 hours
    DataStore.alerts = [
        alert for alert in DataStore.alerts
        if alert.active or (alert.resolved_time and (current_time - alert.resolved_time).total_seconds() < 86400)
    ]

def start_scheduler() -> None:
    """Start the background scheduler"""
    if scheduler.running:
        logger.warning("Scheduler already running")
        return
    
    # Schedule device data collection
    schedule_device_collection()
    
    # Schedule alert cleanup every hour
    scheduler.add_job(
        cleanup_alerts,
        IntervalTrigger(hours=1),
        id="cleanup_alerts",
        replace_existing=True
    )
    
    # Schedule configuration refresh every 5 minutes
    scheduler.add_job(
        schedule_device_collection,
        IntervalTrigger(minutes=5),
        id="refresh_config",
        replace_existing=True
    )
    
    # Start the scheduler
    scheduler.start()
    logger.info("Started background scheduler")

def stop_scheduler() -> None:
    """Stop the background scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Stopped background scheduler")
