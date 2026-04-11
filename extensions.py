from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from celery import Celery
from flask_mail import Mail
from flask_caching import Cache

db = SQLAlchemy()
jwt = JWTManager()

cache = Cache()

mail = Mail()

cors = CORS()

celery = Celery()