import sqlite3
import json
import os
import logging
from datetime import datetime

# Setup logging
logger = logging.getLogger(__name__)

DB_PATH = 'database.db'

def init_db():
    """Initialize database with required tables"""
    try:
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
        
        # Create indexes for better query performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON scan_history(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_risk_level ON scan_history(risk_level)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_is_scam ON scan_history(is_scam)')
        
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise

def save_scan(text, image_path, result):
    """Save scan result to database"""
    conn = None
    try:
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
        logger.info(f"Scan saved with ID: {last_id}")
        return last_id
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error saving scan: {str(e)}")
        raise
    finally:
        if conn:
            conn.close()

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

def get_stats():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # scam_ratio: Count is_scam 1 (True) vs 0 (False)
    cursor.execute('SELECT is_scam, COUNT(*) as count FROM scan_history GROUP BY is_scam')
    scam_data = {str(row['is_scam']): row['count'] for row in cursor.fetchall()}
    
    # risk_dist: Distribution across levels
    cursor.execute('SELECT risk_level, COUNT(*) as count FROM scan_history GROUP BY risk_level')
    risk_data = {row['risk_level']: row['count'] for row in cursor.fetchall()}
    
    # total: Total number of scans
    cursor.execute('SELECT COUNT(*) as total FROM scan_history')
    total_row = cursor.fetchone()
    total = total_row['total'] if total_row else 0
    
    conn.close()
    return {
        "scam_ratio": scam_data,
        "risk_dist": risk_data,
        "total": total
    }

def get_daily_trends():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 7 days trend
    trends = []
    # from datetime import timedelta - already in script? Let's check imports
    from datetime import datetime, timedelta

    for i in range(6, -1, -1):
        date_str = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
        
        cursor.execute('''
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_scam = 1 THEN 1 ELSE 0 END) as scams
            FROM scan_history 
            WHERE DATE(timestamp) = ?
        ''', (date_str,))
        
        row = cursor.fetchone()
        trends.append({
            "date": date_str,
            "total": row['total'] or 0,
            "scams": row['scams'] or 0
        })
    
    conn.close()
    return trends

# Initialize on import
init_db()
