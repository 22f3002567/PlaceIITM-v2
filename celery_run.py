from app import app
from extensions import celery

# Push app context so tasks can use db, mail, etc.
app.app_context().push()

# Importing tasks registers them with Celery
import tasks  # noqa: F401