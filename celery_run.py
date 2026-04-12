# from app import app as flask_app
# from extensions import celery

# # Push app context so tasks can use db, mail, etc.
# flask_app.app_context().push()

# # Importing tasks registers them with Celery
# import tasks  # noqa: F401


"""
celery_run.py
Entry point for the Celery worker and Celery Beat scheduler.

 Previous version used flask_app.app_context().push() which only
pushed context to the MAIN thread. Worker threads/processes had no context
and db/mail calls failed with RuntimeError: Working outside application context.

The ContextTask pattern (set in create_app) wraps every task call
inside a fresh app_context - this is the correct approach.

HOW TO RUN (Windows 3 separate terminals, venv activated):
    Terminal 1:  python run.py
    Terminal 2:  celery -A celery_run worker --loglevel=info --pool=solo
    Terminal 3:  celery -A celery_run beat   --loglevel=info

"""
from app import create_app
from extensions import celery

# Create the Flask app so ContextTask is registered
flask_app = create_app()

# Import tasks so Celery discovers and registers them
import tasks  # noqa: F401
