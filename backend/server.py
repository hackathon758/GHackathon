from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import random
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dctip-secret-key-change-in-production-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="DCTIP - Decentralized Cybersecurity Threat Intelligence Platform")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    organization: str
    role: str = "analyst"  # analyst, admin, incident_responder
    industry: str = "general"  # healthcare, finance, government, education, ecommerce, manufacturing, general

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    organization: str
    role: str
    industry: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

# Threat Models
class ThreatCreate(BaseModel):
    name: str
    description: str
    severity: str  # critical, high, medium, low
    category: str  # malware, phishing, ddos, intrusion, ransomware, data_breach, insider_threat
    source_ip: Optional[str] = None
    target_system: Optional[str] = None
    industry_tags: List[str] = []

class Threat(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    severity: str
    category: str
    source_ip: Optional[str] = None
    target_system: Optional[str] = None
    industry_tags: List[str] = []
    status: str = "active"  # active, mitigated, investigating, false_positive
    detected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    detected_by: str = "federated_model"  # federated_model, manual, ai_autonomous
    confidence_score: float = Field(default_factory=lambda: round(random.uniform(0.7, 0.99), 2))
    blockchain_hash: Optional[str] = None
    organization_id: Optional[str] = None

# Alert Models
class AlertConfigCreate(BaseModel):
    name: str
    severity_levels: List[str]  # critical, high, medium, low
    categories: List[str]
    notification_email: bool = True
    notification_dashboard: bool = True
    is_active: bool = True

class AlertConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    severity_levels: List[str]
    categories: List[str]
    notification_email: bool
    notification_dashboard: bool
    is_active: bool
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Alert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    threat_id: str
    user_id: str
    message: str
    severity: str
    category: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Incident Response Models
class IncidentResponseCreate(BaseModel):
    threat_id: str
    action_type: str  # block_ip, quarantine, alert_admin, firewall_rule, isolate_system
    description: str
    is_automated: bool = False

class IncidentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    threat_id: str
    action_type: str
    description: str
    is_automated: bool
    executed_by: str  # user_id or "autonomous_ai"
    status: str = "completed"  # pending, in_progress, completed, failed
    executed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    blockchain_hash: Optional[str] = None

# Federated Learning Models
class FederatedModelStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model_name: str
    model_type: str  # anomaly_detection, malware_detection, phishing_detection, intrusion_detection
    version: str
    participants_count: int
    accuracy: float
    last_aggregation: datetime
    status: str  # training, aggregating, deployed, idle
    training_rounds: int
    privacy_budget_remaining: float  # differential privacy budget

class FederatedContribution(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    organization_name: str
    model_id: str
    contribution_type: str  # model_update, data_stats, threat_signature
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reputation_score: float
    blockchain_hash: Optional[str] = None

# Blockchain Models
class BlockchainTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_hash: str
    block_number: int
    transaction_type: str  # threat_recorded, model_update, incident_response, reputation_update
    data_hash: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    organization_id: Optional[str] = None
    verified: bool = True

# Collaboration Models
class SharedIntelligence(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    threat_indicators: List[str]
    severity: str
    shared_by_org: str
    shared_by_user: str
    industry_relevance: List[str]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    blockchain_hash: Optional[str] = None
    upvotes: int = 0
    comments_count: int = 0

class SharedIntelligenceCreate(BaseModel):
    title: str
    description: str
    threat_indicators: List[str]
    severity: str
    industry_relevance: List[str]

# Dashboard Stats
class DashboardStats(BaseModel):
    total_threats: int
    active_threats: int
    mitigated_threats: int
    critical_alerts: int
    high_alerts: int
    medium_alerts: int
    low_alerts: int
    federated_models_active: int
    blockchain_transactions: int
    autonomous_responses_today: int
    system_health: float
    threats_by_category: Dict[str, int]
    threats_by_severity: Dict[str, int]
    recent_threats_trend: List[Dict[str, Any]]

# ============== HELPER FUNCTIONS ==============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def generate_blockchain_hash(data: str) -> str:
    """Simulate blockchain hash generation"""
    return hashlib.sha256(f"{data}{datetime.now().isoformat()}{random.random()}".encode()).hexdigest()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if user is None:
        raise credentials_exception
    return user

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_data.model_dump()
    password = user_dict.pop("password")
    user = User(**user_dict)
    
    # Store with hashed password
    doc = user.model_dump()
    doc["hashed_password"] = get_password_hash(password)
    doc["created_at"] = doc["created_at"].isoformat()
    await db.users.insert_one(doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    user_response = user.model_dump()
    user_response["created_at"] = user_response["created_at"].isoformat()
    
    return Token(access_token=access_token, user=user_response)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    # Remove sensitive data
    user.pop("_id", None)
    user.pop("hashed_password", None)
    
    return Token(access_token=access_token, user=user)

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ============== THREAT ROUTES ==============

@api_router.get("/threats", response_model=List[Threat])
async def get_threats(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    if category:
        query["category"] = category
    
    threats = await db.threats.find(query, {"_id": 0}).sort("detected_at", -1).limit(limit).to_list(limit)
    
    for threat in threats:
        if isinstance(threat.get('detected_at'), str):
            threat['detected_at'] = datetime.fromisoformat(threat['detected_at'])
    
    return threats

@api_router.post("/threats", response_model=Threat)
async def create_threat(threat_data: ThreatCreate, current_user: dict = Depends(get_current_user)):
    threat = Threat(**threat_data.model_dump())
    threat.organization_id = current_user.get("organization")
    threat.blockchain_hash = generate_blockchain_hash(f"threat:{threat.id}")
    
    doc = threat.model_dump()
    doc["detected_at"] = doc["detected_at"].isoformat()
    await db.threats.insert_one(doc)
    
    # Record blockchain transaction
    await record_blockchain_transaction("threat_recorded", threat.id, current_user.get("organization"))
    
    return threat

@api_router.put("/threats/{threat_id}/status")
async def update_threat_status(
    threat_id: str,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    result = await db.threats.update_one(
        {"id": threat_id},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Threat not found")
    return {"message": "Threat status updated", "status": status}

@api_router.get("/threats/{threat_id}", response_model=Threat)
async def get_threat(threat_id: str, current_user: dict = Depends(get_current_user)):
    threat = await db.threats.find_one({"id": threat_id}, {"_id": 0})
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    if isinstance(threat.get('detected_at'), str):
        threat['detected_at'] = datetime.fromisoformat(threat['detected_at'])
    return threat

# ============== ALERT ROUTES ==============

@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(
    is_read: Optional[bool] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if is_read is not None:
        query["is_read"] = is_read
    
    alerts = await db.alerts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for alert in alerts:
        if isinstance(alert.get('created_at'), str):
            alert['created_at'] = datetime.fromisoformat(alert['created_at'])
    
    return alerts

@api_router.put("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.alerts.update_one(
        {"id": alert_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "Alert marked as read"}

@api_router.put("/alerts/read-all")
async def mark_all_alerts_read(current_user: dict = Depends(get_current_user)):
    await db.alerts.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "All alerts marked as read"}

@api_router.get("/alert-configs", response_model=List[AlertConfig])
async def get_alert_configs(current_user: dict = Depends(get_current_user)):
    configs = await db.alert_configs.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    for config in configs:
        if isinstance(config.get('created_at'), str):
            config['created_at'] = datetime.fromisoformat(config['created_at'])
    return configs

@api_router.post("/alert-configs", response_model=AlertConfig)
async def create_alert_config(config_data: AlertConfigCreate, current_user: dict = Depends(get_current_user)):
    config = AlertConfig(**config_data.model_dump(), user_id=current_user["id"])
    doc = config.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.alert_configs.insert_one(doc)
    return config

# ============== INCIDENT RESPONSE ROUTES ==============

@api_router.get("/incidents", response_model=List[IncidentResponse])
async def get_incidents(
    is_automated: Optional[bool] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if is_automated is not None:
        query["is_automated"] = is_automated
    
    incidents = await db.incidents.find(query, {"_id": 0}).sort("executed_at", -1).limit(limit).to_list(limit)
    
    for incident in incidents:
        if isinstance(incident.get('executed_at'), str):
            incident['executed_at'] = datetime.fromisoformat(incident['executed_at'])
    
    return incidents

@api_router.post("/incidents", response_model=IncidentResponse)
async def create_incident(
    incident_data: IncidentResponseCreate,
    current_user: dict = Depends(get_current_user)
):
    incident = IncidentResponse(
        **incident_data.model_dump(),
        executed_by=current_user["id"] if not incident_data.is_automated else "autonomous_ai"
    )
    incident.blockchain_hash = generate_blockchain_hash(f"incident:{incident.id}")
    
    doc = incident.model_dump()
    doc["executed_at"] = doc["executed_at"].isoformat()
    await db.incidents.insert_one(doc)
    
    # Record blockchain transaction
    await record_blockchain_transaction("incident_response", incident.id, current_user.get("organization"))
    
    return incident

# ============== FEDERATED LEARNING ROUTES ==============

@api_router.get("/federated/models", response_model=List[FederatedModelStatus])
async def get_federated_models(current_user: dict = Depends(get_current_user)):
    models = await db.federated_models.find({}, {"_id": 0}).to_list(100)
    
    for model in models:
        if isinstance(model.get('last_aggregation'), str):
            model['last_aggregation'] = datetime.fromisoformat(model['last_aggregation'])
    
    # If no models exist, return simulated data
    if not models:
        models = generate_simulated_federated_models()
    
    return models

@api_router.get("/federated/contributions", response_model=List[FederatedContribution])
async def get_federated_contributions(limit: int = 50, current_user: dict = Depends(get_current_user)):
    contributions = await db.federated_contributions.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for contrib in contributions:
        if isinstance(contrib.get('timestamp'), str):
            contrib['timestamp'] = datetime.fromisoformat(contrib['timestamp'])
    
    # If no contributions exist, return simulated data
    if not contributions:
        contributions = generate_simulated_contributions()
    
    return contributions

# ============== BLOCKCHAIN ROUTES ==============

async def record_blockchain_transaction(tx_type: str, data_id: str, org_id: Optional[str] = None):
    """Record a transaction to the simulated blockchain"""
    tx = BlockchainTransaction(
        transaction_hash=generate_blockchain_hash(f"{tx_type}:{data_id}"),
        block_number=random.randint(1000000, 9999999),
        transaction_type=tx_type,
        data_hash=generate_blockchain_hash(data_id),
        organization_id=org_id
    )
    doc = tx.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.blockchain_transactions.insert_one(doc)
    return tx

@api_router.get("/blockchain/transactions", response_model=List[BlockchainTransaction])
async def get_blockchain_transactions(limit: int = 100, current_user: dict = Depends(get_current_user)):
    transactions = await db.blockchain_transactions.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for tx in transactions:
        if isinstance(tx.get('timestamp'), str):
            tx['timestamp'] = datetime.fromisoformat(tx['timestamp'])
    
    # If no transactions exist, return simulated data
    if not transactions:
        transactions = generate_simulated_blockchain_transactions()
    
    return transactions

@api_router.get("/blockchain/verify/{transaction_hash}")
async def verify_blockchain_transaction(transaction_hash: str, current_user: dict = Depends(get_current_user)):
    tx = await db.blockchain_transactions.find_one({"transaction_hash": transaction_hash}, {"_id": 0})
    if tx:
        return {"verified": True, "transaction": tx}
    return {"verified": False, "message": "Transaction not found on blockchain"}

# ============== COLLABORATION ROUTES ==============

@api_router.get("/collaboration/shared", response_model=List[SharedIntelligence])
async def get_shared_intelligence(
    industry: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if industry:
        query["industry_relevance"] = industry
    
    shared = await db.shared_intelligence.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for item in shared:
        if isinstance(item.get('timestamp'), str):
            item['timestamp'] = datetime.fromisoformat(item['timestamp'])
    
    # If no shared intelligence exists, return simulated data
    if not shared:
        shared = generate_simulated_shared_intelligence()
    
    return shared

@api_router.post("/collaboration/share", response_model=SharedIntelligence)
async def share_intelligence(
    intel_data: SharedIntelligenceCreate,
    current_user: dict = Depends(get_current_user)
):
    intel = SharedIntelligence(
        **intel_data.model_dump(),
        shared_by_org=current_user.get("organization", "Unknown"),
        shared_by_user=current_user["id"]
    )
    intel.blockchain_hash = generate_blockchain_hash(f"intel:{intel.id}")
    
    doc = intel.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.shared_intelligence.insert_one(doc)
    
    # Record blockchain transaction
    await record_blockchain_transaction("threat_recorded", intel.id, current_user.get("organization"))
    
    return intel

@api_router.post("/collaboration/{intel_id}/upvote")
async def upvote_intelligence(intel_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.shared_intelligence.update_one(
        {"id": intel_id},
        {"$inc": {"upvotes": 1}}
    )
    return {"message": "Upvoted successfully"}

# ============== DASHBOARD ROUTES ==============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Get threat counts
    total_threats = await db.threats.count_documents({})
    active_threats = await db.threats.count_documents({"status": "active"})
    mitigated_threats = await db.threats.count_documents({"status": "mitigated"})
    
    # Get alert counts by severity
    critical_alerts = await db.threats.count_documents({"severity": "critical", "status": "active"})
    high_alerts = await db.threats.count_documents({"severity": "high", "status": "active"})
    medium_alerts = await db.threats.count_documents({"severity": "medium", "status": "active"})
    low_alerts = await db.threats.count_documents({"severity": "low", "status": "active"})
    
    # Get other counts
    federated_models = await db.federated_models.count_documents({"status": "deployed"})
    blockchain_tx = await db.blockchain_transactions.count_documents({})
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    autonomous_responses = await db.incidents.count_documents({
        "is_automated": True,
        "executed_at": {"$gte": today_start.isoformat()}
    })
    
    # Threats by category
    categories = ["malware", "phishing", "ddos", "intrusion", "ransomware", "data_breach", "insider_threat"]
    threats_by_category = {}
    for cat in categories:
        threats_by_category[cat] = await db.threats.count_documents({"category": cat})
    
    # Threats by severity
    severities = ["critical", "high", "medium", "low"]
    threats_by_severity = {}
    for sev in severities:
        threats_by_severity[sev] = await db.threats.count_documents({"severity": sev})
    
    # Generate trend data (simulated for MVP)
    recent_threats_trend = []
    for i in range(7):
        date = (datetime.now(timezone.utc) - timedelta(days=6-i)).strftime("%Y-%m-%d")
        recent_threats_trend.append({
            "date": date,
            "count": random.randint(5, 25),
            "mitigated": random.randint(3, 20)
        })
    
    # Use simulated data if database is empty
    if total_threats == 0:
        return generate_simulated_dashboard_stats()
    
    return DashboardStats(
        total_threats=total_threats,
        active_threats=active_threats,
        mitigated_threats=mitigated_threats,
        critical_alerts=critical_alerts,
        high_alerts=high_alerts,
        medium_alerts=medium_alerts,
        low_alerts=low_alerts,
        federated_models_active=federated_models if federated_models > 0 else 4,
        blockchain_transactions=blockchain_tx if blockchain_tx > 0 else random.randint(100, 500),
        autonomous_responses_today=autonomous_responses if autonomous_responses > 0 else random.randint(5, 15),
        system_health=round(random.uniform(95, 99.9), 1),
        threats_by_category=threats_by_category if any(threats_by_category.values()) else generate_category_stats(),
        threats_by_severity=threats_by_severity if any(threats_by_severity.values()) else generate_severity_stats(),
        recent_threats_trend=recent_threats_trend
    )

# ============== SIMULATION DATA GENERATORS ==============

def generate_simulated_dashboard_stats() -> DashboardStats:
    return DashboardStats(
        total_threats=random.randint(150, 300),
        active_threats=random.randint(20, 50),
        mitigated_threats=random.randint(100, 250),
        critical_alerts=random.randint(2, 8),
        high_alerts=random.randint(10, 25),
        medium_alerts=random.randint(20, 40),
        low_alerts=random.randint(30, 60),
        federated_models_active=4,
        blockchain_transactions=random.randint(500, 2000),
        autonomous_responses_today=random.randint(8, 20),
        system_health=round(random.uniform(96, 99.9), 1),
        threats_by_category=generate_category_stats(),
        threats_by_severity=generate_severity_stats(),
        recent_threats_trend=[
            {"date": (datetime.now(timezone.utc) - timedelta(days=6-i)).strftime("%Y-%m-%d"),
             "count": random.randint(10, 35),
             "mitigated": random.randint(8, 30)}
            for i in range(7)
        ]
    )

def generate_category_stats() -> Dict[str, int]:
    return {
        "malware": random.randint(30, 60),
        "phishing": random.randint(40, 80),
        "ddos": random.randint(10, 30),
        "intrusion": random.randint(20, 45),
        "ransomware": random.randint(5, 20),
        "data_breach": random.randint(10, 25),
        "insider_threat": random.randint(5, 15)
    }

def generate_severity_stats() -> Dict[str, int]:
    return {
        "critical": random.randint(5, 15),
        "high": random.randint(25, 50),
        "medium": random.randint(50, 100),
        "low": random.randint(70, 150)
    }

def generate_simulated_federated_models() -> List[dict]:
    models = [
        {
            "id": str(uuid.uuid4()),
            "model_name": "AnomalyNet-v3",
            "model_type": "anomaly_detection",
            "version": "3.2.1",
            "participants_count": random.randint(15, 45),
            "accuracy": round(random.uniform(0.92, 0.98), 3),
            "last_aggregation": datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 12)),
            "status": "deployed",
            "training_rounds": random.randint(100, 500),
            "privacy_budget_remaining": round(random.uniform(0.3, 0.8), 2)
        },
        {
            "id": str(uuid.uuid4()),
            "model_name": "MalwareGuard-FL",
            "model_type": "malware_detection",
            "version": "2.8.0",
            "participants_count": random.randint(20, 60),
            "accuracy": round(random.uniform(0.94, 0.99), 3),
            "last_aggregation": datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 8)),
            "status": "deployed",
            "training_rounds": random.randint(200, 800),
            "privacy_budget_remaining": round(random.uniform(0.4, 0.9), 2)
        },
        {
            "id": str(uuid.uuid4()),
            "model_name": "PhishNet-Federated",
            "model_type": "phishing_detection",
            "version": "4.1.0",
            "participants_count": random.randint(25, 70),
            "accuracy": round(random.uniform(0.91, 0.97), 3),
            "last_aggregation": datetime.now(timezone.utc) - timedelta(hours=random.randint(2, 16)),
            "status": "training",
            "training_rounds": random.randint(150, 600),
            "privacy_budget_remaining": round(random.uniform(0.2, 0.7), 2)
        },
        {
            "id": str(uuid.uuid4()),
            "model_name": "IntrusionShield-AI",
            "model_type": "intrusion_detection",
            "version": "1.5.2",
            "participants_count": random.randint(10, 35),
            "accuracy": round(random.uniform(0.89, 0.96), 3),
            "last_aggregation": datetime.now(timezone.utc) - timedelta(hours=random.randint(4, 24)),
            "status": "aggregating",
            "training_rounds": random.randint(80, 300),
            "privacy_budget_remaining": round(random.uniform(0.5, 0.95), 2)
        }
    ]
    return models

def generate_simulated_contributions() -> List[dict]:
    orgs = [
        "HealthCare United", "FinanceSecure Corp", "GovDefense Agency",
        "EduProtect Network", "RetailGuard Inc", "ManufactureSafe Ltd"
    ]
    contribution_types = ["model_update", "data_stats", "threat_signature"]
    
    contributions = []
    for i in range(15):
        contributions.append({
            "id": str(uuid.uuid4()),
            "organization_id": str(uuid.uuid4()),
            "organization_name": random.choice(orgs),
            "model_id": str(uuid.uuid4()),
            "contribution_type": random.choice(contribution_types),
            "timestamp": datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72)),
            "reputation_score": round(random.uniform(0.7, 1.0), 2),
            "blockchain_hash": generate_blockchain_hash(f"contrib:{i}")
        })
    return contributions

def generate_simulated_blockchain_transactions() -> List[dict]:
    tx_types = ["threat_recorded", "model_update", "incident_response", "reputation_update"]
    
    transactions = []
    base_block = 8500000
    for i in range(25):
        transactions.append({
            "id": str(uuid.uuid4()),
            "transaction_hash": generate_blockchain_hash(f"tx:{i}"),
            "block_number": base_block + i,
            "transaction_type": random.choice(tx_types),
            "data_hash": generate_blockchain_hash(f"data:{i}"),
            "timestamp": datetime.now(timezone.utc) - timedelta(minutes=random.randint(5, 1440)),
            "organization_id": str(uuid.uuid4()) if random.random() > 0.3 else None,
            "verified": True
        })
    return transactions

def generate_simulated_shared_intelligence() -> List[dict]:
    industries = ["healthcare", "finance", "government", "education", "ecommerce", "manufacturing"]
    severities = ["critical", "high", "medium", "low"]
    orgs = [
        "CyberDefense Alliance", "ThreatWatch Network", "SecureOps Coalition",
        "GlobalSec Partners", "InfoGuard Consortium"
    ]
    
    intel_items = [
        {
            "title": "New Ransomware Variant Targeting Healthcare Systems",
            "description": "A sophisticated ransomware strain has been identified targeting hospital management systems. Uses encrypted C2 communications and double extortion tactics.",
            "threat_indicators": ["192.168.45.x", "malware.exe", "encrypted_payload.dll", "C2: evil-domain.com"],
            "severity": "critical",
            "industry_relevance": ["healthcare", "general"]
        },
        {
            "title": "Financial Sector Phishing Campaign - Q4 2024",
            "description": "Large-scale phishing campaign impersonating major banks. Utilizes lookalike domains and convincing email templates.",
            "threat_indicators": ["phish-bank.com", "secure-login-verify.net", "banking-alert@malicious.com"],
            "severity": "high",
            "industry_relevance": ["finance", "general"]
        },
        {
            "title": "DDoS Botnet Infrastructure Identified",
            "description": "New botnet leveraging IoT devices for DDoS attacks. Peak traffic observed: 2.5 Tbps.",
            "threat_indicators": ["10.0.0.0/8 range", "UDP flood pattern", "botnet_payload.bin"],
            "severity": "high",
            "industry_relevance": ["ecommerce", "finance", "general"]
        },
        {
            "title": "Government Systems Supply Chain Attack",
            "description": "Compromised software update mechanism in popular government contractor software. Backdoor installed during update process.",
            "threat_indicators": ["update-service.gov-contractor.com", "backdoor.dll", "persistence_module.sys"],
            "severity": "critical",
            "industry_relevance": ["government", "general"]
        },
        {
            "title": "Manufacturing OT/ICS Vulnerability Exploitation",
            "description": "Active exploitation of PLCs and SCADA systems in manufacturing environments. Targets Siemens and Rockwell devices.",
            "threat_indicators": ["PLC exploit code", "SCADA_malware.bin", "102.45.67.x"],
            "severity": "critical",
            "industry_relevance": ["manufacturing", "general"]
        }
    ]
    
    shared = []
    for i, item in enumerate(intel_items):
        shared.append({
            "id": str(uuid.uuid4()),
            "title": item["title"],
            "description": item["description"],
            "threat_indicators": item["threat_indicators"],
            "severity": item["severity"],
            "shared_by_org": random.choice(orgs),
            "shared_by_user": str(uuid.uuid4()),
            "industry_relevance": item["industry_relevance"],
            "timestamp": datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 168)),
            "blockchain_hash": generate_blockchain_hash(f"intel:{i}"),
            "upvotes": random.randint(5, 50),
            "comments_count": random.randint(0, 15)
        })
    return shared

# ============== SIMULATED THREATS GENERATOR ==============

@api_router.post("/simulate/threats")
async def simulate_threats(count: int = 10, current_user: dict = Depends(get_current_user)):
    """Generate simulated threat data for demo purposes"""
    threat_templates = [
        {"name": "Emotet Trojan Detected", "category": "malware", "severity": "critical"},
        {"name": "Suspicious SSH Brute Force", "category": "intrusion", "severity": "high"},
        {"name": "Phishing Email Campaign", "category": "phishing", "severity": "medium"},
        {"name": "DDoS Attack Detected", "category": "ddos", "severity": "high"},
        {"name": "Ransomware Encryption Started", "category": "ransomware", "severity": "critical"},
        {"name": "Unauthorized Data Access", "category": "data_breach", "severity": "high"},
        {"name": "Insider File Exfiltration", "category": "insider_threat", "severity": "medium"},
        {"name": "SQL Injection Attempt", "category": "intrusion", "severity": "medium"},
        {"name": "Zero-Day Exploit Detected", "category": "malware", "severity": "critical"},
        {"name": "Credential Stuffing Attack", "category": "phishing", "severity": "high"},
    ]
    
    industries = ["healthcare", "finance", "government", "education", "ecommerce", "manufacturing"]
    statuses = ["active", "active", "active", "mitigated", "investigating"]
    
    created_threats = []
    for _ in range(count):
        template = random.choice(threat_templates)
        threat = Threat(
            name=template["name"],
            description=f"Automated detection of {template['name'].lower()} activity on network segment.",
            severity=template["severity"],
            category=template["category"],
            source_ip=f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            target_system=f"server-{random.randint(1,50)}.internal",
            industry_tags=[random.choice(industries)],
            status=random.choice(statuses),
            detected_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 168)),
            blockchain_hash=generate_blockchain_hash(f"threat:{uuid.uuid4()}")
        )
        
        doc = threat.model_dump()
        doc["detected_at"] = doc["detected_at"].isoformat()
        await db.threats.insert_one(doc)
        created_threats.append(threat)
        
        # Record blockchain transaction
        await record_blockchain_transaction("threat_recorded", threat.id, current_user.get("organization"))
    
    return {"message": f"Created {count} simulated threats", "threats": created_threats}

@api_router.post("/simulate/autonomous-response")
async def simulate_autonomous_response(current_user: dict = Depends(get_current_user)):
    """Simulate autonomous AI response to active threats"""
    active_threats = await db.threats.find({"status": "active"}, {"_id": 0}).limit(5).to_list(5)
    
    if not active_threats:
        return {"message": "No active threats to respond to"}
    
    responses = []
    action_types = ["block_ip", "quarantine", "alert_admin", "firewall_rule", "isolate_system"]
    
    for threat in active_threats[:3]:
        action = random.choice(action_types)
        incident = IncidentResponse(
            threat_id=threat["id"],
            action_type=action,
            description=f"Autonomous AI executed {action} in response to {threat['name']}",
            is_automated=True,
            executed_by="autonomous_ai",
            blockchain_hash=generate_blockchain_hash(f"response:{uuid.uuid4()}")
        )
        
        doc = incident.model_dump()
        doc["executed_at"] = doc["executed_at"].isoformat()
        await db.incidents.insert_one(doc)
        
        # Update threat status
        await db.threats.update_one(
            {"id": threat["id"]},
            {"$set": {"status": "mitigated"}}
        )
        
        # Record blockchain transaction
        await record_blockchain_transaction("incident_response", incident.id)
        
        responses.append(incident)
    
    return {"message": f"Autonomous AI responded to {len(responses)} threats", "responses": responses}

# ============== INDUSTRY COMPLIANCE ==============

@api_router.get("/compliance/templates")
async def get_compliance_templates(current_user: dict = Depends(get_current_user)):
    """Get industry-specific compliance templates"""
    templates = {
        "healthcare": {
            "name": "HIPAA Compliance",
            "standards": ["HIPAA", "HITECH", "FDA 21 CFR Part 11"],
            "key_controls": [
                "PHI Access Monitoring",
                "Encryption at Rest & Transit",
                "Audit Trail Maintenance",
                "Breach Notification Protocol"
            ],
            "threat_priorities": ["ransomware", "data_breach", "insider_threat"]
        },
        "finance": {
            "name": "Financial Services Compliance",
            "standards": ["PCI-DSS", "SOX", "GLBA", "FFIEC"],
            "key_controls": [
                "Transaction Monitoring",
                "Fraud Detection",
                "Data Loss Prevention",
                "Access Control Management"
            ],
            "threat_priorities": ["phishing", "data_breach", "intrusion"]
        },
        "government": {
            "name": "Government Security Compliance",
            "standards": ["FISMA", "FedRAMP", "NIST 800-53", "CISA Guidelines"],
            "key_controls": [
                "Continuous Monitoring",
                "Incident Response",
                "Supply Chain Security",
                "Zero Trust Architecture"
            ],
            "threat_priorities": ["intrusion", "malware", "insider_threat"]
        },
        "education": {
            "name": "Education Sector Compliance",
            "standards": ["FERPA", "COPPA", "State Privacy Laws"],
            "key_controls": [
                "Student Data Protection",
                "Network Segmentation",
                "Endpoint Security",
                "Email Security"
            ],
            "threat_priorities": ["phishing", "ransomware", "data_breach"]
        },
        "ecommerce": {
            "name": "E-Commerce Security",
            "standards": ["PCI-DSS", "GDPR", "CCPA"],
            "key_controls": [
                "Payment Security",
                "Bot Protection",
                "DDoS Mitigation",
                "Customer Data Protection"
            ],
            "threat_priorities": ["ddos", "phishing", "data_breach"]
        },
        "manufacturing": {
            "name": "Manufacturing/ICS Security",
            "standards": ["IEC 62443", "NIST CSF", "ISO 27001"],
            "key_controls": [
                "OT/IT Segmentation",
                "SCADA Protection",
                "Supply Chain Security",
                "Physical Security Integration"
            ],
            "threat_priorities": ["intrusion", "malware", "insider_threat"]
        }
    }
    return templates

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "DCTIP API - Decentralized Cybersecurity Threat Intelligence Platform"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
