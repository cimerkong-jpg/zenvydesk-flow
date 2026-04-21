from datetime import datetime
from pydantic import BaseModel


class ScheduleUpdate(BaseModel):
    scheduled_time: datetime
