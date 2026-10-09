import sys
sys.path.append(r'D:\crm-action-hub\python_scripts')
from sync_kanban import AbsenkuScraper
import json

import os

scraper = AbsenkuScraper(os.environ.get("ABSENKU_USERNAME", ""), os.environ.get("ABSENKU_PASSWORD", ""))
if scraper.login():
    data = scraper.fetch_kanban_data("2026-08", "2026-08")
    print(json.dumps(data[:2], indent=2))
else:
    print("Login failed")
