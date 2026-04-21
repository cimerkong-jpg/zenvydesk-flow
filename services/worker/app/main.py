"""
Worker service for scheduled automation execution
Checks for due schedules and executes them
"""
import time
import os
from scheduler import ScheduleChecker


def run_worker():
    """Worker entry function"""
    # Get database URL from environment or use default
    database_url = os.getenv("DATABASE_URL", "sqlite:///../../api/zenvydesk.db")
    
    # Initialize scheduler
    checker = ScheduleChecker(database_url)
    
    print("Worker started - checking for due schedules every 60 seconds")
    
    while True:
        try:
            print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Checking for due schedules...")
            executed = checker.check_and_execute()
            print(f"Executed {executed} schedule(s)")
        except Exception as e:
            print(f"Error in worker loop: {e}")
        
        # Wait 60 seconds before next check
        time.sleep(60)


if __name__ == "__main__":
    run_worker()
