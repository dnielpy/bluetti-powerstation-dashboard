from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

from app import db
from app.routers import battery, data, health, power, update

load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await db.dispose_engine()


app = FastAPI(title="Bluetti Powerstation API", version="0.1.0", lifespan=lifespan)

app.include_router(health.router)
app.include_router(battery.router)
app.include_router(power.router)
app.include_router(data.router)
app.include_router(update.router)
