import time


def run_worker():
    """Worker entry function"""
    print("Worker started")
    
    while True:
        print("Worker running...")
        time.sleep(5)


if __name__ == "__main__":
    run_worker()
