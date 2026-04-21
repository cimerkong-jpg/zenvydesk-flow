"""
Tests for Schedule model
Verifies schedule creation and basic functionality
"""
import pytest
from datetime import datetime, timedelta

from app.models.schedule import Schedule
from app.models.automation_rule import AutomationRule


def test_schedule_creation(test_db, test_user, test_page):
    """Test creating a schedule"""
    # Create automation rule
    rule = AutomationRule(
        user_id=test_user.id,
        page_id=test_page.id,
        name="Test Schedule Rule",
        content_type="promotion",
        auto_post=False,
        scheduled_time="daily",
        is_active=True
    )
    test_db.add(rule)
    test_db.commit()
    test_db.refresh(rule)
    
    # Create schedule
    next_run = datetime.utcnow() + timedelta(hours=1)
    schedule = Schedule(
        automation_rule_id=rule.id,
        next_run_at=next_run,
        is_active=True,
        status="pending"
    )
    test_db.add(schedule)
    test_db.commit()
    test_db.refresh(schedule)
    
    # Verify schedule
    assert schedule.id is not None
    assert schedule.automation_rule_id == rule.id
    assert schedule.is_active is True
    assert schedule.status == "pending"
    assert schedule.last_run_at is None
    
    print(f"\n✓ TEST PASS: Schedule created successfully")
    print(f"  Schedule ID: {schedule.id}")
    print(f"  Rule ID: {rule.id}")
    print(f"  Next run: {schedule.next_run_at}")


def test_schedule_query_due(test_db, test_user, test_page):
    """Test querying due schedules"""
    # Create automation rule
    rule = AutomationRule(
        user_id=test_user.id,
        page_id=test_page.id,
        name="Due Schedule Rule",
        content_type="engagement",
        auto_post=False,
        scheduled_time="daily",
        is_active=True
    )
    test_db.add(rule)
    test_db.commit()
    test_db.refresh(rule)
    
    # Create past schedule (due)
    past_time = datetime.utcnow() - timedelta(hours=1)
    schedule_due = Schedule(
        automation_rule_id=rule.id,
        next_run_at=past_time,
        is_active=True,
        status="pending"
    )
    test_db.add(schedule_due)
    
    # Create future schedule (not due)
    future_time = datetime.utcnow() + timedelta(hours=1)
    schedule_future = Schedule(
        automation_rule_id=rule.id,
        next_run_at=future_time,
        is_active=True,
        status="pending"
    )
    test_db.add(schedule_future)
    test_db.commit()
    
    # Query due schedules
    now = datetime.utcnow()
    due_schedules = test_db.query(Schedule).filter(
        Schedule.is_active == True,
        Schedule.status == "pending",
        Schedule.next_run_at <= now
    ).all()
    
    # Verify only past schedule is returned
    assert len(due_schedules) == 1
    assert due_schedules[0].id == schedule_due.id
    
    print(f"\n✓ TEST PASS: Due schedule query works correctly")
    print(f"  Found {len(due_schedules)} due schedule(s)")


def test_schedule_status_update(test_db, test_user, test_page):
    """Test updating schedule status"""
    # Create automation rule
    rule = AutomationRule(
        user_id=test_user.id,
        page_id=test_page.id,
        name="Status Update Rule",
        content_type="product_intro",
        auto_post=False,
        scheduled_time="daily",
        is_active=True
    )
    test_db.add(rule)
    test_db.commit()
    test_db.refresh(rule)
    
    # Create schedule
    schedule = Schedule(
        automation_rule_id=rule.id,
        next_run_at=datetime.utcnow(),
        is_active=True,
        status="pending"
    )
    test_db.add(schedule)
    test_db.commit()
    test_db.refresh(schedule)
    
    # Update to running
    schedule.status = "running"
    test_db.commit()
    test_db.refresh(schedule)
    assert schedule.status == "running"
    
    # Update to completed with last_run_at
    schedule.status = "completed"
    schedule.last_run_at = datetime.utcnow()
    test_db.commit()
    test_db.refresh(schedule)
    
    assert schedule.status == "completed"
    assert schedule.last_run_at is not None
    
    print(f"\n✓ TEST PASS: Schedule status updates work correctly")
    print(f"  Final status: {schedule.status}")
    print(f"  Last run: {schedule.last_run_at}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
