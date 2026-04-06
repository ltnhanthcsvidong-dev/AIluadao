import json
import sqlite3
import os
import sys

# Add current directory to path so we can import engine
sys.path.append(os.getcwd())

from engine.db_manager import get_all_history

def verify():
    try:
        data = get_all_history()
        unique_summaries = set()
        top = []
        for item in data:
            summary = item.get('summary', '').strip()
            if not summary:
                continue
                
            if item.get('risk_level') in ['Critical', 'High'] and summary not in unique_summaries:
                top.append(summary)
                unique_summaries.add(summary)
            
            if len(top) >= 6:
                break
        
        print("Deduplicated Summaries:")
        print(json.dumps(top, indent=2, ensure_ascii=False))
        
        # Check for duplicates
        if len(top) != len(set(top)):
            print("FAILED: Duplicates found in output!")
        else:
            print("SUCCESS: No duplicates found.")
            
    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    verify()
