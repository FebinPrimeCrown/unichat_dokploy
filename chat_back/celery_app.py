import os
from celery import Celery
from celery.schedules import crontab
from datetime import datetime, timedelta

redis_url = os.getenv("REDIS_BROKER_URL", "redis://chat-redis:6379/0") 

celery_app = Celery(
    __name__,
    broker=redis_url,
    backend=redis_url,    # Optional: use Redis for result backend
    include=['app.tasks']
)

celery_app.conf.task_acks_late = True
celery_app.conf.task_reject_on_worker_lost = True
celery_app.conf.worker_state_db = None


celery_app.conf.timezone = 'UTC'
celery_app.conf.enable_utc = True


