from dotenv import load_dotenv
from fastapi import FastAPI

from app.routers import battery, health

load_dotenv()

app = FastAPI(title="Bluetti Powerstation API", version="0.1.0")

app.include_router(health.router)
app.include_router(battery.router)
