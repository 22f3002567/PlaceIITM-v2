from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from celery import Celery
from flask_mail import Mail

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()
mail = Mail()


celery = Celery()