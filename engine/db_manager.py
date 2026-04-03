import sqlite3
import json
import os
from datetime import datetime

DB_PATH = 'database.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            text_content TEXT,
            image_path TEXT,
            is_scam BOOLEAN,
            risk_level TEXT,
            summary TEXT,
            perspectives TEXT
        )
    ''')
    conn.commit()
    conn.close()

def save_scan(text, image_path, result):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO scan_history 
        (text_content, image_path, is_scam, risk_level, summary, perspectives)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        text, 
        image_path, 
        result.get('is_scam', False), 
        result.get('risk_level', 'Unknown'), 
        result.get('summary', ''), 
        json.dumps(result.get('perspectives', {}))
    ))
    conn.commit()
    last_id = cursor.lastrowid
    conn.close()
    return last_id

def get_all_history():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM scan_history ORDER BY timestamp DESC LIMIT 50')
    rows = cursor.fetchall()
    history = []
    for row in rows:
        item = dict(row)
        item['perspectives'] = json.loads(item['perspectives'])
        history.append(item)
    conn.close()
    return history

def get_scan_by_id(scan_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM scan_history WHERE id = ?', (scan_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        item = dict(row)
        item['perspectives'] = json.loads(item['perspectives'])
        return item
    return None

# Initialize on import
init_db()
