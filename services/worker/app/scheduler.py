"""
Scheduler module for checking and executing due schedules
"""
import sys
import os
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to import from api
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../api'))

from app.models.schedule import Schedule
from app.models.automation_rule import AutomationRule
from app.core.database import Base


class ScheduleChecker:
    """Checks for due schedules and triggers execution"""
    
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def get_due_schedules(self):
        """Get all schedules that are due for execution"""
        db = self.SessionLocal()
        try:
            now = datetime.utcnow()
            schedules = db.query(Schedule).filter(
                Schedule.is_active == True,
                Schedule.status == "pending",
                Schedule.next_run_at <= now
            ).all()
            return schedules
        finally:
            db.close()
    
    def execute_schedule(self, schedule_id: int):
        """Execute a schedule by running its automation rule"""
        db = self.SessionLocal()
        try:
            schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
            if not schedule:
                print(f"Schedule {schedule_id} not found")
                return False
            
            # Update status to running
            schedule.status = "running"
            db.commit()
            
            # Get automation rule
            rule = db.query(AutomationRule).filter(
                AutomationRule.id == schedule.automation_rule_id
            ).first()
            
            if not rule:
                print(f"Automation rule {schedule.automation_rule_id} not found")
                schedule.status = "failed"
                db.commit()
                return False
            
            print(f"Executing schedule {schedule_id} for rule '{rule.name}'")
            
            # TODO: Call automation runner API endpoint
            # For now, just mark as completed
            schedule.status = "completed"
            schedule.last_run_at = datetime.utcnow()
            
            # Calculate next run time (simple daily increment for now)
            from datetime import timedelta
            schedule.next_run_at = schedule.next_run_at + timedelta(days=1)
            schedule.status = "pending"  # Reset for next run
            
            db.commit()
            print(f"Schedule {schedule_id} completed successfully")
            return True
            
        except Exception as e:
            print(f"Error executing schedule {schedule_id}: {e}")
            schedule.status = "failed"
            db.commit()
            return False
        finally:
            db.close()
    
    def check_and_execute(self):
        """Check for due schedules and execute them"""
        schedules = self.get_due_schedules()
        
        if not schedules:
            print("No due schedules found")
            return 0
        
        print(f"Found {len(schedules)} due schedule(s)")
        executed = 0
        
        for schedule in schedules:
            if self.execute_schedule(schedule.id):
                executed += 1
        
        return executed
