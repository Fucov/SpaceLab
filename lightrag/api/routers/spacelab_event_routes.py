"""
Lightweight in-memory event bus for the SpaceLab demo screens.

This route is intentionally non-persistent: it only bridges currently connected
tablet and main-screen browsers for presentation/demo use.
"""

import asyncio
import json
from collections import deque
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field


class SpaceLabDemoEvent(BaseModel):
    eventId: str = Field(min_length=1)
    timestamp: int
    type: str = Field(min_length=1)
    source: str = Field(min_length=1)
    moduleId: str = Field(min_length=1)
    moduleName: str = Field(min_length=1)
    title: str = Field(min_length=1)
    steps: list[dict[str, Any]] = Field(default_factory=list)
    executionMode: str = Field(default="hybrid")
    gateSummary: str | None = None


EVENT_HISTORY: deque[dict[str, Any]] = deque(maxlen=100)
SUBSCRIBERS: set[asyncio.Queue[dict[str, Any]]] = set()


def create_spacelab_event_routes(api_key: str | None = None) -> APIRouter:
    _ = api_key
    router = APIRouter(prefix="/spacelab/events", tags=["spacelab-demo"])

    @router.post("")
    async def post_event(event: SpaceLabDemoEvent):
        payload = event.model_dump()
        EVENT_HISTORY.append(payload)
        stale_subscribers: list[asyncio.Queue[dict[str, Any]]] = []

        for queue in list(SUBSCRIBERS):
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                stale_subscribers.append(queue)

        for queue in stale_subscribers:
            SUBSCRIBERS.discard(queue)

        return {"status": "ok", "eventId": event.eventId}

    @router.get("/stream")
    async def stream_events(request: Request):
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=50)
        SUBSCRIBERS.add(queue)

        async def event_stream():
            try:
                for event in list(EVENT_HISTORY):
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

                while True:
                    if await request.is_disconnected():
                        break
                    try:
                        event = await asyncio.wait_for(queue.get(), timeout=20)
                        yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                    except asyncio.TimeoutError:
                        yield ": keepalive\n\n"
            finally:
                SUBSCRIBERS.discard(queue)

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    return router
