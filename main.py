import os
import io
import datetime
import random
import difflib
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text, inspect
from pydantic import BaseModel

# --- APP CONFIGURATION ---
app = FastAPI(title="Government Dashboard API", version="3.4.0-STABLE")

origins = ["http://localhost:5173", "http://localhost:3000", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE SETUP ---
DB_URL = "sqlite:///./gov_data.db"
engine = create_engine(DB_URL)

# --- STANDARD TOPOLOGY NAMES ---
STANDARD_STATE_NAMES = [
    'andaman and nicobar islands', 'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 
    'chandigarh', 'chhattisgarh', 'dadra and nagar haveli and daman and diu', 'delhi', 'goa', 
    'gujarat', 'haryana', 'himachal pradesh', 'jammu and kashmir', 'jharkhand', 'karnataka', 
    'kerala', 'ladakh', 'lakshadweep', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 
    'mizoram', 'nagaland', 'odisha', 'puducherry', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 
    'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal'
]

# --- SMART ALGORITHMS ---

def get_best_state_match(raw_name):
    """Fuzzy match state names. Returns None if garbage."""
    if not isinstance(raw_name, str): return None
    
    clean = raw_name.lower().strip().replace('&', 'and').replace('  ', ' ')
    
    if len(clean) < 3 or clean.isdigit(): return None
    if clean in ['puttenahalli', 'darbhanga', 'total', 'grand total']: return None

    if 'daman' in clean or 'dadra' in clean: return 'dadra and nagar haveli and daman and diu'
    if 'orissa' in clean: return 'odisha'
    if 'beng' in clean and 'west' in clean: return 'west bengal'
    if 'chhat' in clean: return 'chhattisgarh'
    if 'pondicherry' in clean: return 'puducherry'
    if 'jammu' in clean: return 'jammu and kashmir'
    if 'andaman' in clean: return 'andaman and nicobar islands'
    if 'nct' in clean or 'delhi' in clean: return 'delhi'

    if clean in STANDARD_STATE_NAMES: return clean
    matches = difflib.get_close_matches(clean, STANDARD_STATE_NAMES, n=1, cutoff=0.6)
    if matches: return matches[0]
    
    return None

def predict_next_month(trend_data):
    if len(trend_data) < 2: return 0
    y_values = [item['value'] for item in trend_data]
    x_values = list(range(len(y_values)))
    
    n = len(x_values)
    mean_x = sum(x_values) / n
    mean_y = sum(y_values) / n
    
    denominator = sum((x - mean_x) ** 2 for x in x_values)
    if denominator == 0: return y_values[-1]
    
    m = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_values, y_values)) / denominator
    b = mean_y - (m * mean_x)
    
    return max(0, int((m * len(x_values)) + b))

# --- DATABASE INIT ---
def init_db():
    with engine.connect() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, password TEXT, role TEXT, name TEXT)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS actions (id TEXT PRIMARY KEY, region_id TEXT, region_name TEXT, recommendation TEXT, trigger_reason TEXT, user_id TEXT, user_role TEXT, timestamp TEXT, status TEXT)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS system_upload_logs (id TEXT PRIMARY KEY, fileName TEXT, type TEXT, sizeBytes INTEGER, recordCount INTEGER, status TEXT, timestamp TEXT, uploaderId TEXT)"))
        
        users = [('admin', 'admin123', 'policymaker', 'Administrator'), ('field', 'field123', 'field_worker', 'Field Officer'), ('uploader', 'upload123', 'data_supervisor', 'Data Supervisor')]
        for u in users:
            if not conn.execute(text(f"SELECT 1 FROM users WHERE id='{u[0]}'")).scalar():
                conn.execute(text(f"INSERT INTO users VALUES ('{u[0]}', '{u[1]}', '{u[2]}', '{u[3]}')"))
        conn.commit()

init_db()

SCHEMA_MAPPING = {
    "state": ["state", "st_name", "state_name", "province", "region", "state_code"],
    "district": ["district", "dist", "city", "city_dist", "district_name"],
    "date": ["date", "created_at", "timestamp", "enrolment_date", "update_date", "date_of_action"],
    "age_0_5": ["age_0_5", "0_5"],
    "age_5_18": ["age_5_18", "age_5_17", "5_18", "5_17"], 
    "age_18_plus": ["age_18_plus", "age_18_greater", "18+", "18_greater"], 
    "demo_updates": ["demo_updates", "demographic"],
    "bio_updates": ["bio_updates", "biometric"],
    "in_migration": ["in_migration", "migration_in"],
    "out_migration": ["out_migration", "migration_out"]
}

def normalize_dataframe(df, category):
    # 1. Clean Headers
    df.columns = [str(c).strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns]
    
    # 2. Rename Columns
    renamed_cols = {}
    for std_col, synonyms in SCHEMA_MAPPING.items():
        if std_col in df.columns: continue
        for syn in synonyms:
            if syn in df.columns:
                renamed_cols[syn] = std_col
                break
    df = df.rename(columns=renamed_cols)

    # 3. Clean States
    if 'state' in df.columns:
        df['state'] = df['state'].apply(lambda x: get_best_state_match(str(x)))
        df = df.dropna(subset=['state'])

    # 4. Fix Dates
    if 'date' not in df.columns:
        today = datetime.datetime.now()
        df['date'] = [(today - datetime.timedelta(days=x%180)).strftime("%Y-%m-%d") for x in range(len(df))]
    else:
        df['date'] = pd.to_datetime(df['date'], dayfirst=True, errors='coerce').fillna(datetime.datetime.now())
        df['date'] = df['date'].dt.strftime('%Y-%m-%d')

    # 5. Logic for Biometric/Demo Split Columns (Summing if they exist)
    if 'bio_age_5_17' in df.columns or 'bio_age_17_' in df.columns:
        df['bio_updates'] = df.get('bio_age_5_17', 0) + df.get('bio_age_17_', 0)
    if 'demo_age_5_17' in df.columns or 'demo_age_17_' in df.columns:
        df['demo_updates'] = df.get('demo_age_5_17', 0) + df.get('demo_age_17_', 0)

    # --- 6. CONTEXT-AWARE FILTERING (THE FIX) ---
    # We define exactly which columns are allowed for each category.
    # This prevents 'demo_updates' from being added to the Enrolment table.
    
    category_columns = {
        "Enrolment Density": ["age_0_5", "age_5_18", "age_18_plus"],
        "Update Activity": ["demo_updates", "bio_updates"],
        "Migration Signals": ["in_migration", "out_migration"],
        "Lifecycle Gaps": ["age_0_5"]
    }
    
    # Only get the numeric columns relevant to THIS upload
    allowed_numerics = category_columns.get(category, [])
    
    # Initialize ONLY the relevant columns
    for col in allowed_numerics:
        if col not in df.columns: 
            df[col] = 0
        else: 
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
    df['category'] = category

    # Final Filter: Keep ONLY valid columns for this table
    # This strips out 'pincode', 'demo_updates' (if in enrolment), etc.
    keep_cols = ["state", "district", "date", "category"] + allowed_numerics
    
    # Strict select: Only keep cols that are in keep_cols AND currently in df
    final_df = df[[c for c in keep_cols if c in df.columns]]
    
    return final_df

# --- API ENDPOINTS ---

class LoginRequest(BaseModel):
    user_id: str; password: str

@app.post("/api/login")
def login(c: LoginRequest):
    with engine.connect() as conn:
        res = conn.execute(text(f"SELECT * FROM users WHERE id='{c.user_id}' AND password='{c.password}'")).mappings().first()
        if res: return {"success": True, "user": dict(res)}
        raise HTTPException(401, "Invalid credentials")

class ActionRequest(BaseModel):
    region_id: str; region_name: str; recommendation: str; trigger_reason: str; user_id: str; user_role: str

@app.post("/api/create-action")
def create_action(a: ActionRequest):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    aid = f"act-{datetime.datetime.now().timestamp()}"
    try:
        with engine.connect() as conn:
            conn.execute(text(f"INSERT INTO actions VALUES ('{aid}', '{a.region_id}', '{a.region_name}', '{a.recommendation}', '{a.trigger_reason}', '{a.user_id}', '{a.user_role}', '{ts}', 'Initiated')"))
            conn.commit()
        return {"success": True, "id": aid}
    except Exception as e:
        raise HTTPException(500, f"Failed to create action: {str(e)}")

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...), dataset_type: str = Form(...), uploader_id: str = Form(...)):
    category_map = {
        "Enrolment Density": "enrolment_data",
        "Update Activity": "update_data",
        "Migration Signals": "migration_data",
        "Lifecycle Gaps": "lifecycle_data"
    }
    table_name = category_map.get(dataset_type, "misc_data")

    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        df_clean = normalize_dataframe(df, dataset_type)
        if df_clean.empty:
            raise HTTPException(400, "File contained no valid data after cleaning.")

        df_clean.to_sql(table_name, engine, if_exists='append', index=False)
        
        with engine.connect() as conn:
            conn.execute(text(f"INSERT INTO system_upload_logs (id, fileName, type, sizeBytes, recordCount, status, timestamp, uploaderId) VALUES ('log-{datetime.datetime.now().timestamp()}', '{file.filename}', '{dataset_type}', {len(content)}, {len(df_clean)}, 'Success', '{datetime.datetime.now().strftime('%Y-%m-%d')}', '{uploader_id}')"))
            conn.commit()
            
        return {"status": "Success", "recordCount": len(df_clean), "mergedInto": table_name}
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(500, str(e))

@app.post("/api/reset")
def reset_data():
    """Clears all data tables."""
    try:
        with engine.connect() as conn:
            tables = ["enrolment_data", "update_data", "migration_data", "lifecycle_data", "system_upload_logs"]
            for t in tables:
                conn.execute(text(f"DROP TABLE IF EXISTS {t}"))
            conn.commit()
        return {"status": "Database cleared. Upload new CSVs to restart."}
    except Exception as e:
        raise HTTPException(500, f"Reset failed: {e}")

@app.get("/api/stats")
def get_stats():
    def get_sum(tbl, cols):
        try:
            if not inspect(engine).has_table(tbl): return 0
            expr = " + ".join([f"COALESCE(SUM({c}),0)" for c in cols])
            with engine.connect() as conn:
                return conn.execute(text(f"SELECT {expr} FROM {tbl}")).scalar() or 0
        except: return 0
    total_enrolment = get_sum("enrolment_data", ["age_0_5", "age_5_18", "age_18_plus"])
    total_updates = get_sum("update_data", ["demo_updates", "bio_updates"])
    try:
        with engine.connect() as conn: log_count = conn.execute(text("SELECT COUNT(*) FROM system_upload_logs")).scalar() or 0
    except: log_count = 0
    return {"totalRecords": int(total_enrolment + total_updates), "totalDatasets": log_count, "lastUpdate": datetime.datetime.now().strftime("%d %b %Y")}

@app.get("/api/logs")
def get_logs():
    try: 
        if not inspect(engine).has_table("system_upload_logs"): return []
        return pd.read_sql("SELECT * FROM system_upload_logs ORDER BY timestamp DESC LIMIT 10", engine).to_dict(orient="records")
    except: return []

@app.get("/api/map-data")
def get_map_data():
    state_data = {}
    queries = [
        ("enrolment_data", "enrolment", "age_0_5 + age_5_18 + age_18_plus"),
        ("update_data", "updates", "demo_updates + bio_updates"),
        ("migration_data", "migration", "in_migration + out_migration"),
        ("lifecycle_data", "lifecycle", "age_0_5")
    ]
    with engine.connect() as conn:
        for table, key, sum_expr in queries:
            if not inspect(engine).has_table(table): continue
            try:
                q = text(f"SELECT state, SUM({sum_expr}) as val FROM {table} GROUP BY state")
                results = conn.execute(q).fetchall()
                for r in results:
                    st = r[0] 
                    if not st: continue
                    if st not in state_data: state_data[st] = {'enrolment':0, 'updates':0, 'migration':0, 'lifecycle':0}
                    state_data[st][key] = int(r[1] or 0)
            except Exception as e:
                print(f"Map Query Error {table}: {e}")
    return state_data

@app.get("/api/analytics")
def get_analytics(category: str = "enrolment"):
    config = {
        "enrolment": {"table": "enrolment_data", "sum": "age_0_5 + age_5_18 + age_18_plus"},
        "updates": {"table": "update_data", "sum": "demo_updates + bio_updates"},
        "migration": {"table": "migration_data", "sum": "in_migration + out_migration"},
        "lifecycle": {"table": "lifecycle_data", "sum": "age_0_5"}
    }
    cfg = config.get(category.lower(), config["enrolment"])
    table = cfg["table"]
    trend_data = []
    distribution_data = []

    if not inspect(engine).has_table(table):
        return {"trend": [], "ageDistribution": [], "forecast": 0}

    try:
        with engine.connect() as conn:
            q_trend = text(f"SELECT substr(date, 1, 7) as m, SUM({cfg['sum']}) as val FROM {table} GROUP BY m ORDER BY m DESC LIMIT 6")
            rows = conn.execute(q_trend).fetchall()
            for r in reversed(rows):
                if r[0]: trend_data.append({"name": r[0], "value": r[1] or 0})

            if category == "enrolment":
                q_dist = text("SELECT SUM(age_0_5), SUM(age_5_18), SUM(age_18_plus) FROM enrolment_data")
                res = conn.execute(q_dist).fetchone()
                if res:
                    distribution_data = [
                        {"range": "0-5 Yrs", "count": res[0] or 0},
                        {"range": "5-18 Yrs", "count": res[1] or 0},
                        {"range": "18+ Yrs", "count": res[2] or 0}
                    ]
            elif category == "updates":
                q_dist = text("SELECT SUM(demo_updates), SUM(bio_updates) FROM update_data")
                res = conn.execute(q_dist).fetchone()
                if res:
                    distribution_data = [
                        {"range": "Demographic", "count": res[0] or 0},
                        {"range": "Biometric", "count": res[1] or 0}
                    ]
            elif category == "migration":
                q_dist = text("SELECT SUM(in_migration), SUM(out_migration) FROM migration_data")
                res = conn.execute(q_dist).fetchone()
                if res:
                    distribution_data = [
                        {"range": "In-Migration", "count": res[0] or 0},
                        {"range": "Out-Migration", "count": res[1] or 0}
                    ]
    except Exception as e:
        print(f"Analytics Error: {e}")

    forecast_val = predict_next_month(trend_data)
    return {"trend": trend_data, "ageDistribution": distribution_data, "forecast": forecast_val}

@app.get("/")
def read_root():
    return {"status": "Government Dashboard Backend is Running 🟢"}