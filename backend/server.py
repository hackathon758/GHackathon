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

# Compliance Models
class ComplianceControl(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    control_id: str
    name: str
    description: str
    standard: str  # HIPAA, PCI-DSS, etc.
    category: str  # access_control, encryption, monitoring, etc.
    status: str = "not_implemented"  # implemented, not_implemented, partial
    implementation_date: Optional[datetime] = None
    last_verified: Optional[datetime] = None
    user_id: str
    organization_id: str
    industry: str

class ComplianceControlUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class ComplianceDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    document_type: str  # policy, procedure, certificate, audit_report, risk_assessment
    compliance_standard: str  # HIPAA, PCI-DSS, SOX, etc.
    file_name: str
    file_size: int
    file_path: str
    uploaded_by: str
    organization_id: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tags: List[str] = []
    blockchain_hash: Optional[str] = None

class ComplianceDocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    document_type: str
    compliance_standard: str
    file_name: str
    file_size: int
    file_content: str  # base64 encoded
    tags: List[str] = []

class ComplianceAudit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    audit_type: str  # full, partial, scheduled, on_demand
    industry: str
    standards_checked: List[str]
    overall_score: float
    passed_controls: int
    failed_controls: int
    warnings: int
    findings: List[Dict[str, Any]]
    recommendations: List[str]
    audited_by: str
    organization_id: str
    audit_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    blockchain_hash: Optional[str] = None
    status: str = "completed"  # in_progress, completed, failed

class ComplianceScore(BaseModel):
    overall_score: float
    industry: str
    scores_by_standard: Dict[str, float]
    controls_status: Dict[str, int]  # implemented, not_implemented, partial counts
    recent_audits: List[Dict[str, Any]]
    threat_impact: float
    trend: str  # improving, declining, stable
    last_calculated: datetime

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

# ============== EDGE DEVICE MODELS ==============

class EdgeDevice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    device_type: str  # gateway, sensor, firewall, router, iot_hub, endpoint
    ip_address: str
    location: str
    status: str = "online"  # online, offline, warning, critical
    last_heartbeat: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    cpu_usage: float = Field(default_factory=lambda: round(random.uniform(10, 90), 1))
    memory_usage: float = Field(default_factory=lambda: round(random.uniform(20, 85), 1))
    network_latency: float = Field(default_factory=lambda: round(random.uniform(1, 100), 2))
    threats_detected: int = Field(default_factory=lambda: random.randint(0, 50))
    threats_blocked: int = Field(default_factory=lambda: random.randint(0, 45))
    firmware_version: str = "2.4.1"
    organization_id: Optional[str] = None

class EdgeDeviceCreate(BaseModel):
    name: str
    device_type: str
    ip_address: str
    location: str

# ============== AI SUGGESTION MODELS ==============

class AISuggestion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    suggestion_type: str  # mitigation, prevention, investigation, configuration
    priority: str  # critical, high, medium, low
    confidence: float
    related_threats: List[str] = []
    recommended_actions: List[str] = []
    estimated_impact: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"  # pending, applied, dismissed

# ============== REPUTATION SYSTEM MODELS ==============

class OrganizationReputation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_name: str
    organization_id: str
    reputation_score: float
    contributions_count: int
    threats_shared: int
    models_contributed: int
    false_positive_rate: float
    response_time_avg: float  # in minutes
    trust_level: str  # platinum, gold, silver, bronze
    badges: List[str] = []
    last_contribution: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    rank: int = 0

# ============== NETWORK TOPOLOGY MODELS ==============

class NetworkNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    node_type: str  # server, firewall, router, switch, endpoint, edge_device, cloud
    ip_address: str
    status: str = "active"  # active, inactive, compromised, quarantined
    risk_level: str = "low"  # low, medium, high, critical
    connections: List[str] = []  # list of connected node IDs
    x_position: float = 0
    y_position: float = 0
    metrics: Dict[str, Any] = {}

class NetworkConnection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_id: str
    target_id: str
    connection_type: str  # normal, encrypted, suspicious, blocked
    bandwidth: float
    latency: float
    packet_loss: float

# ============== THREAT CORRELATION MODELS ==============

class ThreatCorrelation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pattern_name: str
    pattern_type: str  # attack_chain, campaign, apt, botnet, coordinated_attack
    threat_ids: List[str]
    correlation_score: float
    indicators: List[str]
    timeline_start: datetime
    timeline_end: datetime
    affected_systems: List[str]
    attack_vector: str
    recommendations: List[str]

# ============== GEOGRAPHIC THREAT MODELS ==============

class GeoThreat(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    country_code: str
    country_name: str
    latitude: float
    longitude: float
    threat_count: int
    severity_breakdown: Dict[str, int]
    top_categories: List[str]
    risk_score: float
    trend: str  # increasing, decreasing, stable

# ============== RISK SCORING MODELS ==============

class RiskScore(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: str  # organization, system, network, user
    entity_id: str
    overall_score: float  # 0-100
    threat_exposure: float
    vulnerability_score: float
    attack_surface: float
    compliance_score: float
    historical_incidents: int
    factors: Dict[str, float]
    recommendations: List[str]
    calculated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== EDGE DEVICE ROUTES ==============

@api_router.get("/edge-devices", response_model=List[EdgeDevice])
async def get_edge_devices(
    status: Optional[str] = None,
    device_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if device_type:
        query["device_type"] = device_type
    
    devices = await db.edge_devices.find(query, {"_id": 0}).to_list(100)
    
    for device in devices:
        if isinstance(device.get('last_heartbeat'), str):
            device['last_heartbeat'] = datetime.fromisoformat(device['last_heartbeat'])
    
    if not devices:
        devices = generate_simulated_edge_devices()
    
    return devices

@api_router.post("/edge-devices", response_model=EdgeDevice)
async def create_edge_device(
    device_data: EdgeDeviceCreate,
    current_user: dict = Depends(get_current_user)
):
    device = EdgeDevice(**device_data.model_dump())
    device.organization_id = current_user.get("organization")
    
    doc = device.model_dump()
    doc["last_heartbeat"] = doc["last_heartbeat"].isoformat()
    await db.edge_devices.insert_one(doc)
    
    return device

@api_router.get("/edge-devices/{device_id}", response_model=EdgeDevice)
async def get_edge_device(device_id: str, current_user: dict = Depends(get_current_user)):
    device = await db.edge_devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    if isinstance(device.get('last_heartbeat'), str):
        device['last_heartbeat'] = datetime.fromisoformat(device['last_heartbeat'])
    return device

@api_router.get("/edge-devices/metrics/summary")
async def get_edge_metrics_summary(current_user: dict = Depends(get_current_user)):
    """Get aggregated metrics from all edge devices"""
    devices = await db.edge_devices.find({}, {"_id": 0}).to_list(100)
    
    if not devices:
        devices = generate_simulated_edge_devices()
    
    total_devices = len(devices)
    online_count = sum(1 for d in devices if d.get("status") == "online")
    avg_cpu = sum(d.get("cpu_usage", 0) for d in devices) / total_devices if total_devices > 0 else 0
    avg_memory = sum(d.get("memory_usage", 0) for d in devices) / total_devices if total_devices > 0 else 0
    avg_latency = sum(d.get("network_latency", 0) for d in devices) / total_devices if total_devices > 0 else 0
    total_threats_detected = sum(d.get("threats_detected", 0) for d in devices)
    total_threats_blocked = sum(d.get("threats_blocked", 0) for d in devices)
    
    return {
        "total_devices": total_devices,
        "online_devices": online_count,
        "offline_devices": total_devices - online_count,
        "avg_cpu_usage": round(avg_cpu, 1),
        "avg_memory_usage": round(avg_memory, 1),
        "avg_network_latency": round(avg_latency, 2),
        "total_threats_detected": total_threats_detected,
        "total_threats_blocked": total_threats_blocked,
        "block_rate": round(total_threats_blocked / total_threats_detected * 100, 1) if total_threats_detected > 0 else 100
    }

# ============== AI SUGGESTIONS ROUTES ==============

@api_router.get("/ai/suggestions", response_model=List[AISuggestion])
async def get_ai_suggestions(
    priority: Optional[str] = None,
    suggestion_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get AI-generated security suggestions"""
    # Get current threats and patterns
    active_threats = await db.threats.find({"status": "active"}, {"_id": 0}).limit(20).to_list(20)
    
    suggestions = generate_ai_suggestions(active_threats)
    
    if priority:
        suggestions = [s for s in suggestions if s["priority"] == priority]
    if suggestion_type:
        suggestions = [s for s in suggestions if s["suggestion_type"] == suggestion_type]
    
    return suggestions

@api_router.post("/ai/analyze-threat")
async def analyze_threat_with_ai(threat_id: str, current_user: dict = Depends(get_current_user)):
    """Deep AI analysis of a specific threat"""
    threat = await db.threats.find_one({"id": threat_id}, {"_id": 0})
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    
    analysis = generate_threat_analysis(threat)
    return analysis

@api_router.put("/ai/suggestions/{suggestion_id}/status")
async def update_suggestion_status(
    suggestion_id: str,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    """Update suggestion status (applied/dismissed)"""
    return {"message": "Suggestion status updated", "status": status}

# ============== REPUTATION SYSTEM ROUTES ==============

@api_router.get("/reputation/leaderboard", response_model=List[OrganizationReputation])
async def get_reputation_leaderboard(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get organization reputation leaderboard"""
    reputations = await db.reputation.find({}, {"_id": 0}).sort("reputation_score", -1).limit(limit).to_list(limit)
    
    for rep in reputations:
        if isinstance(rep.get('last_contribution'), str):
            rep['last_contribution'] = datetime.fromisoformat(rep['last_contribution'])
    
    if not reputations:
        reputations = generate_simulated_reputation_data()
    
    # Add ranks
    for i, rep in enumerate(reputations):
        rep["rank"] = i + 1
    
    return reputations

@api_router.get("/reputation/{org_id}", response_model=OrganizationReputation)
async def get_organization_reputation(org_id: str, current_user: dict = Depends(get_current_user)):
    """Get reputation details for a specific organization"""
    rep = await db.reputation.find_one({"organization_id": org_id}, {"_id": 0})
    if not rep:
        # Return simulated data
        simulated = generate_simulated_reputation_data()
        if simulated:
            return simulated[0]
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if isinstance(rep.get('last_contribution'), str):
        rep['last_contribution'] = datetime.fromisoformat(rep['last_contribution'])
    return rep

@api_router.post("/reputation/contribute")
async def contribute_to_reputation(
    contribution_type: str,
    current_user: dict = Depends(get_current_user)
):
    """Record a contribution and update reputation"""
    # Contribution types: threat_share, model_update, intelligence_share, verification
    points = {
        "threat_share": 10,
        "model_update": 25,
        "intelligence_share": 15,
        "verification": 5
    }
    
    score_increase = points.get(contribution_type, 5)
    
    await db.reputation.update_one(
        {"organization_id": current_user.get("organization")},
        {
            "$inc": {"reputation_score": score_increase, "contributions_count": 1},
            "$set": {"last_contribution": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    return {"message": "Contribution recorded", "points_earned": score_increase}

# ============== NETWORK TOPOLOGY ROUTES ==============

@api_router.get("/network/topology")
async def get_network_topology(current_user: dict = Depends(get_current_user)):
    """Get complete network topology with nodes and connections"""
    nodes = await db.network_nodes.find({}, {"_id": 0}).to_list(100)
    connections = await db.network_connections.find({}, {"_id": 0}).to_list(200)
    
    if not nodes:
        topology = generate_simulated_network_topology()
        nodes = topology["nodes"]
        connections = topology["connections"]
    
    return {
        "nodes": nodes,
        "connections": connections,
        "stats": {
            "total_nodes": len(nodes),
            "active_nodes": sum(1 for n in nodes if n.get("status") == "active"),
            "compromised_nodes": sum(1 for n in nodes if n.get("status") == "compromised"),
            "total_connections": len(connections),
            "suspicious_connections": sum(1 for c in connections if c.get("connection_type") == "suspicious")
        }
    }

@api_router.get("/network/nodes", response_model=List[NetworkNode])
async def get_network_nodes(
    status: Optional[str] = None,
    node_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if node_type:
        query["node_type"] = node_type
    
    nodes = await db.network_nodes.find(query, {"_id": 0}).to_list(100)
    
    if not nodes:
        topology = generate_simulated_network_topology()
        nodes = topology["nodes"]
        if status:
            nodes = [n for n in nodes if n.get("status") == status]
        if node_type:
            nodes = [n for n in nodes if n.get("node_type") == node_type]
    
    return nodes

# ============== THREAT FEED ROUTES ==============

@api_router.get("/threat-feed/live")
async def get_live_threat_feed(
    limit: int = 30,
    since_minutes: int = 60,
    current_user: dict = Depends(get_current_user)
):
    """Get real-time threat feed"""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=since_minutes)
    
    threats = await db.threats.find(
        {"detected_at": {"$gte": cutoff.isoformat()}},
        {"_id": 0}
    ).sort("detected_at", -1).limit(limit).to_list(limit)
    
    for threat in threats:
        if isinstance(threat.get('detected_at'), str):
            threat['detected_at'] = datetime.fromisoformat(threat['detected_at'])
    
    if not threats:
        threats = generate_live_threat_feed(limit)
    
    return {
        "threats": threats,
        "total_count": len(threats),
        "time_range_minutes": since_minutes,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/threat-feed/generate")
async def generate_threat_feed(count: int = 5, current_user: dict = Depends(get_current_user)):
    """Generate new threat feed entries (for simulation)"""
    new_threats = []
    threat_templates = [
        {"name": "Port Scan Detected", "category": "intrusion", "severity": "medium"},
        {"name": "Suspicious DNS Query", "category": "malware", "severity": "high"},
        {"name": "Failed Login Attempt", "category": "intrusion", "severity": "low"},
        {"name": "Data Exfiltration Attempt", "category": "data_breach", "severity": "critical"},
        {"name": "Malware Signature Match", "category": "malware", "severity": "high"},
        {"name": "Phishing Link Clicked", "category": "phishing", "severity": "medium"},
        {"name": "Unusual Network Traffic", "category": "ddos", "severity": "high"},
        {"name": "Privilege Escalation", "category": "intrusion", "severity": "critical"},
    ]
    
    for _ in range(count):
        template = random.choice(threat_templates)
        threat = Threat(
            name=template["name"],
            description=f"Real-time detection: {template['name']}",
            severity=template["severity"],
            category=template["category"],
            source_ip=f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            target_system=f"system-{random.randint(1,100)}",
            detected_at=datetime.now(timezone.utc) - timedelta(seconds=random.randint(0, 300)),
            blockchain_hash=generate_blockchain_hash(f"feed:{uuid.uuid4()}")
        )
        
        doc = threat.model_dump()
        doc["detected_at"] = doc["detected_at"].isoformat()
        await db.threats.insert_one(doc)
        new_threats.append(threat)
    
    return {"generated": len(new_threats), "threats": new_threats}

# ============== THREAT CORRELATION ROUTES ==============

@api_router.get("/correlation/patterns", response_model=List[ThreatCorrelation])
async def get_threat_correlation_patterns(
    pattern_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get detected threat correlation patterns"""
    correlations = generate_threat_correlations()
    
    if pattern_type:
        correlations = [c for c in correlations if c["pattern_type"] == pattern_type]
    
    return correlations

@api_router.get("/correlation/clusters")
async def get_threat_clusters(current_user: dict = Depends(get_current_user)):
    """Get threat clustering analysis"""
    clusters = generate_threat_clusters()
    return clusters

@api_router.post("/correlation/analyze")
async def analyze_threat_correlation(
    threat_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Analyze correlation between specific threats"""
    # Simulated correlation analysis
    correlation_score = round(random.uniform(0.3, 0.95), 2)
    
    return {
        "threat_ids": threat_ids,
        "correlation_score": correlation_score,
        "likely_pattern": random.choice(["attack_chain", "campaign", "apt", "coordinated_attack"]),
        "shared_indicators": [
            f"IP: {random.randint(1,255)}.{random.randint(1,255)}.x.x",
            f"Domain: suspicious-{random.randint(100,999)}.com",
            f"Hash: {generate_blockchain_hash('indicator')[:16]}"
        ],
        "confidence": round(random.uniform(0.6, 0.95), 2)
    }

# ============== GEOGRAPHIC THREAT DATA ROUTES ==============

@api_router.get("/geo/threats", response_model=List[GeoThreat])
async def get_geo_threats(current_user: dict = Depends(get_current_user)):
    """Get geographic distribution of threats"""
    geo_data = generate_geo_threat_data()
    return geo_data

@api_router.get("/geo/heatmap")
async def get_threat_heatmap(current_user: dict = Depends(get_current_user)):
    """Get threat heatmap data for visualization"""
    heatmap_data = generate_threat_heatmap()
    return heatmap_data

@api_router.get("/geo/country/{country_code}")
async def get_country_threat_details(country_code: str, current_user: dict = Depends(get_current_user)):
    """Get detailed threat information for a specific country"""
    geo_data = generate_geo_threat_data()
    country_data = next((g for g in geo_data if g["country_code"] == country_code.upper()), None)
    
    if not country_data:
        raise HTTPException(status_code=404, detail="Country not found")
    
    # Add additional details
    country_data["recent_threats"] = [
        {
            "name": f"Threat-{random.randint(1000, 9999)}",
            "category": random.choice(["malware", "phishing", "intrusion"]),
            "severity": random.choice(["critical", "high", "medium"]),
            "timestamp": (datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48))).isoformat()
        }
        for _ in range(5)
    ]
    
    return country_data

# ============== RISK SCORING ROUTES ==============

@api_router.get("/risk/score")
async def get_overall_risk_score(current_user: dict = Depends(get_current_user)):
    """Calculate overall organizational risk score"""
    risk_score = calculate_risk_score()
    return risk_score

@api_router.get("/risk/analysis")
async def get_risk_analysis(current_user: dict = Depends(get_current_user)):
    """Get detailed risk analysis"""
    analysis = generate_risk_analysis()
    return analysis

@api_router.get("/risk/trends")
async def get_risk_trends(days: int = 30, current_user: dict = Depends(get_current_user)):
    """Get risk score trends over time"""
    trends = []
    for i in range(days):
        date = (datetime.now(timezone.utc) - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
        trends.append({
            "date": date,
            "risk_score": round(random.uniform(35, 75), 1),
            "threat_exposure": round(random.uniform(20, 60), 1),
            "vulnerability_score": round(random.uniform(25, 55), 1)
        })
    return trends

# ============== ADVANCED SIMULATION DATA GENERATORS ==============

def generate_simulated_edge_devices() -> List[dict]:
    """Generate simulated edge device data"""
    device_types = ["gateway", "sensor", "firewall", "router", "iot_hub", "endpoint"]
    locations = ["Data Center A", "Data Center B", "Branch Office 1", "Branch Office 2", "Cloud Region US", "Cloud Region EU", "Edge Location 1", "Edge Location 2"]
    statuses = ["online", "online", "online", "online", "warning", "offline"]
    
    devices = []
    for i in range(12):
        status = random.choice(statuses)
        devices.append({
            "id": str(uuid.uuid4()),
            "name": f"Edge-{device_types[i % len(device_types)].upper()}-{i+1:03d}",
            "device_type": device_types[i % len(device_types)],
            "ip_address": f"10.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
            "location": locations[i % len(locations)],
            "status": status,
            "last_heartbeat": (datetime.now(timezone.utc) - timedelta(minutes=random.randint(0, 30) if status == "online" else random.randint(60, 1440))),
            "cpu_usage": round(random.uniform(15, 85), 1),
            "memory_usage": round(random.uniform(25, 80), 1),
            "network_latency": round(random.uniform(1, 50) if status == "online" else random.uniform(100, 500), 2),
            "threats_detected": random.randint(10, 200),
            "threats_blocked": random.randint(8, 180),
            "firmware_version": f"2.{random.randint(0, 9)}.{random.randint(0, 20)}",
            "organization_id": None
        })
    return devices

def generate_ai_suggestions(active_threats: List[dict]) -> List[dict]:
    """Generate AI-driven security suggestions based on threat patterns"""
    suggestions = []
    
    suggestion_templates = [
        {
            "title": "Enable Enhanced DDoS Protection",
            "description": "Based on recent DDoS attack patterns, we recommend enabling enhanced mitigation on perimeter devices.",
            "suggestion_type": "prevention",
            "priority": "high",
            "recommended_actions": ["Enable rate limiting", "Configure traffic scrubbing", "Update firewall rules"],
            "estimated_impact": "Reduce DDoS attack success rate by 85%"
        },
        {
            "title": "Patch Critical Vulnerabilities",
            "description": "AI analysis detected exploitation attempts targeting known CVEs. Immediate patching recommended.",
            "suggestion_type": "mitigation",
            "priority": "critical",
            "recommended_actions": ["Apply security patches", "Restart affected services", "Verify patch application"],
            "estimated_impact": "Eliminate 12 known attack vectors"
        },
        {
            "title": "Investigate Suspicious Network Traffic",
            "description": "Anomalous traffic patterns detected from internal systems. Potential lateral movement identified.",
            "suggestion_type": "investigation",
            "priority": "high",
            "recommended_actions": ["Review network logs", "Isolate suspicious systems", "Conduct forensic analysis"],
            "estimated_impact": "Prevent potential data exfiltration"
        },
        {
            "title": "Update Email Security Policies",
            "description": "Phishing attempts have increased 40%. Strengthening email filters recommended.",
            "suggestion_type": "configuration",
            "priority": "medium",
            "recommended_actions": ["Enable advanced threat protection", "Update spam filters", "Implement DMARC"],
            "estimated_impact": "Block 95% of phishing attempts"
        },
        {
            "title": "Implement Network Segmentation",
            "description": "Current flat network architecture increases lateral movement risk. Segmentation recommended.",
            "suggestion_type": "prevention",
            "priority": "medium",
            "recommended_actions": ["Design network zones", "Implement VLANs", "Configure inter-zone firewalls"],
            "estimated_impact": "Contain breaches to single network segment"
        },
        {
            "title": "Enable Multi-Factor Authentication",
            "description": "Credential stuffing attacks detected. MFA will significantly reduce unauthorized access.",
            "suggestion_type": "prevention",
            "priority": "high",
            "recommended_actions": ["Deploy MFA solution", "Enforce for all users", "Configure backup methods"],
            "estimated_impact": "Prevent 99% of credential-based attacks"
        },
        {
            "title": "Review Privileged Access",
            "description": "Unusual privileged account activity detected. Access review recommended.",
            "suggestion_type": "investigation",
            "priority": "high",
            "recommended_actions": ["Audit privileged accounts", "Review access logs", "Revoke unnecessary privileges"],
            "estimated_impact": "Reduce insider threat risk by 60%"
        },
        {
            "title": "Update Endpoint Detection Rules",
            "description": "New malware signatures identified. EDR rules need updating.",
            "suggestion_type": "configuration",
            "priority": "medium",
            "recommended_actions": ["Update signature database", "Enable behavioral analysis", "Test detection rules"],
            "estimated_impact": "Detect 30 new malware variants"
        }
    ]
    
    for i, template in enumerate(suggestion_templates):
        suggestion = {
            "id": str(uuid.uuid4()),
            "title": template["title"],
            "description": template["description"],
            "suggestion_type": template["suggestion_type"],
            "priority": template["priority"],
            "confidence": round(random.uniform(0.75, 0.98), 2),
            "related_threats": [str(uuid.uuid4()) for _ in range(random.randint(1, 5))],
            "recommended_actions": template["recommended_actions"],
            "estimated_impact": template["estimated_impact"],
            "timestamp": datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 24)),
            "status": "pending"
        }
        suggestions.append(suggestion)
    
    return suggestions

def generate_threat_analysis(threat: dict) -> dict:
    """Generate AI-driven threat analysis"""
    return {
        "threat_id": threat.get("id"),
        "threat_name": threat.get("name"),
        "analysis_summary": f"Deep analysis of {threat.get('name')} reveals sophisticated attack patterns consistent with known threat actors.",
        "attack_chain": [
            {"stage": "Reconnaissance", "confidence": round(random.uniform(0.7, 0.95), 2), "details": "Initial scanning detected"},
            {"stage": "Weaponization", "confidence": round(random.uniform(0.6, 0.9), 2), "details": "Malware payload prepared"},
            {"stage": "Delivery", "confidence": round(random.uniform(0.8, 0.98), 2), "details": "Attack vector identified"},
            {"stage": "Exploitation", "confidence": round(random.uniform(0.7, 0.95), 2), "details": "Vulnerability exploited"},
            {"stage": "Installation", "confidence": round(random.uniform(0.5, 0.85), 2), "details": "Persistence mechanism detected"},
        ],
        "related_iocs": [
            {"type": "IP", "value": f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}", "confidence": 0.92},
            {"type": "Domain", "value": f"malicious-{random.randint(100, 999)}.com", "confidence": 0.88},
            {"type": "Hash", "value": generate_blockchain_hash("ioc")[:64], "confidence": 0.95}
        ],
        "threat_actor_profile": {
            "suspected_group": random.choice(["APT29", "Lazarus Group", "FIN7", "Unknown"]),
            "motivation": random.choice(["Financial", "Espionage", "Hacktivism", "Unknown"]),
            "sophistication": random.choice(["High", "Medium", "Low"])
        },
        "recommended_response": [
            "Isolate affected systems immediately",
            "Block identified IOCs at perimeter",
            "Conduct forensic investigation",
            "Notify relevant stakeholders",
            "Document incident for compliance"
        ],
        "risk_assessment": {
            "current_impact": random.choice(["Critical", "High", "Medium"]),
            "potential_impact": random.choice(["Critical", "High"]),
            "likelihood_of_spread": round(random.uniform(0.3, 0.9), 2)
        }
    }

def generate_simulated_reputation_data() -> List[dict]:
    """Generate simulated reputation leaderboard"""
    organizations = [
        {"name": "CyberDefense Alliance", "trust": "platinum"},
        {"name": "GlobalSec Partners", "trust": "platinum"},
        {"name": "ThreatWatch Network", "trust": "gold"},
        {"name": "SecureOps Coalition", "trust": "gold"},
        {"name": "InfoGuard Consortium", "trust": "gold"},
        {"name": "HealthCare United", "trust": "silver"},
        {"name": "FinanceSecure Corp", "trust": "silver"},
        {"name": "GovDefense Agency", "trust": "silver"},
        {"name": "EduProtect Network", "trust": "bronze"},
        {"name": "RetailGuard Inc", "trust": "bronze"},
        {"name": "ManufactureSafe Ltd", "trust": "bronze"},
        {"name": "TechShield Systems", "trust": "silver"},
    ]
    
    badges_pool = ["Early Adopter", "Top Contributor", "Threat Hunter", "Model Trainer", "Community Leader", "Rapid Responder", "Intelligence Sharer"]
    
    reputations = []
    base_score = 950
    for i, org in enumerate(organizations):
        score = base_score - (i * 35) + random.randint(-20, 20)
        reputations.append({
            "id": str(uuid.uuid4()),
            "organization_name": org["name"],
            "organization_id": str(uuid.uuid4()),
            "reputation_score": max(100, score),
            "contributions_count": random.randint(50, 500),
            "threats_shared": random.randint(20, 200),
            "models_contributed": random.randint(1, 15),
            "false_positive_rate": round(random.uniform(0.01, 0.15), 3),
            "response_time_avg": round(random.uniform(5, 45), 1),
            "trust_level": org["trust"],
            "badges": random.sample(badges_pool, k=random.randint(2, 5)),
            "last_contribution": datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72)),
            "rank": i + 1
        })
    
    return reputations

def generate_simulated_network_topology() -> dict:
    """Generate simulated network topology"""
    nodes = []
    connections = []
    
    # Define node templates
    node_templates = [
        {"name": "Core Firewall", "type": "firewall", "status": "active", "risk": "low"},
        {"name": "DMZ Router", "type": "router", "status": "active", "risk": "medium"},
        {"name": "Web Server Cluster", "type": "server", "status": "active", "risk": "medium"},
        {"name": "Database Server", "type": "server", "status": "active", "risk": "high"},
        {"name": "Application Server", "type": "server", "status": "active", "risk": "medium"},
        {"name": "Core Switch", "type": "switch", "status": "active", "risk": "low"},
        {"name": "Edge Gateway 1", "type": "edge_device", "status": "active", "risk": "low"},
        {"name": "Edge Gateway 2", "type": "edge_device", "status": "warning", "risk": "medium"},
        {"name": "Cloud Connector", "type": "cloud", "status": "active", "risk": "low"},
        {"name": "Endpoint Zone A", "type": "endpoint", "status": "active", "risk": "low"},
        {"name": "Endpoint Zone B", "type": "endpoint", "status": "active", "risk": "low"},
        {"name": "Compromised Host", "type": "endpoint", "status": "compromised", "risk": "critical"},
        {"name": "Quarantined System", "type": "server", "status": "quarantined", "risk": "high"},
        {"name": "IDS/IPS System", "type": "firewall", "status": "active", "risk": "low"},
        {"name": "VPN Gateway", "type": "router", "status": "active", "risk": "medium"},
    ]
    
    # Create nodes with positions
    for i, template in enumerate(node_templates):
        node_id = str(uuid.uuid4())
        row = i // 5
        col = i % 5
        nodes.append({
            "id": node_id,
            "name": template["name"],
            "node_type": template["type"],
            "ip_address": f"10.{row}.{col}.{random.randint(1, 254)}",
            "status": template["status"],
            "risk_level": template["risk"],
            "connections": [],
            "x_position": col * 200 + random.randint(-30, 30),
            "y_position": row * 150 + random.randint(-20, 20),
            "metrics": {
                "cpu": round(random.uniform(10, 80), 1),
                "memory": round(random.uniform(20, 75), 1),
                "network": round(random.uniform(100, 1000), 0)
            }
        })
    
    # Create connections
    connection_pairs = [
        (0, 1), (0, 5), (1, 2), (1, 3), (2, 4), (3, 4),
        (5, 6), (5, 7), (5, 9), (5, 10), (4, 8), (0, 13),
        (13, 14), (11, 5), (12, 5)
    ]
    
    for source_idx, target_idx in connection_pairs:
        if source_idx < len(nodes) and target_idx < len(nodes):
            conn_type = "normal"
            if nodes[source_idx]["status"] == "compromised" or nodes[target_idx]["status"] == "compromised":
                conn_type = "suspicious"
            elif nodes[source_idx]["status"] == "quarantined" or nodes[target_idx]["status"] == "quarantined":
                conn_type = "blocked"
            
            connections.append({
                "id": str(uuid.uuid4()),
                "source_id": nodes[source_idx]["id"],
                "target_id": nodes[target_idx]["id"],
                "connection_type": conn_type,
                "bandwidth": round(random.uniform(100, 10000), 0),
                "latency": round(random.uniform(1, 50), 2),
                "packet_loss": round(random.uniform(0, 0.5), 3)
            })
            
            # Add connection references to nodes
            nodes[source_idx]["connections"].append(nodes[target_idx]["id"])
            nodes[target_idx]["connections"].append(nodes[source_idx]["id"])
    
    return {"nodes": nodes, "connections": connections}

def generate_live_threat_feed(limit: int) -> List[dict]:
    """Generate live threat feed data"""
    threat_types = [
        {"name": "Brute Force Attack", "category": "intrusion", "severity": "high"},
        {"name": "SQL Injection Attempt", "category": "intrusion", "severity": "high"},
        {"name": "Malware Download", "category": "malware", "severity": "critical"},
        {"name": "Port Scanning", "category": "intrusion", "severity": "low"},
        {"name": "Phishing Email Detected", "category": "phishing", "severity": "medium"},
        {"name": "DDoS Traffic Spike", "category": "ddos", "severity": "high"},
        {"name": "Ransomware Behavior", "category": "ransomware", "severity": "critical"},
        {"name": "Data Exfiltration", "category": "data_breach", "severity": "critical"},
        {"name": "Suspicious Login", "category": "intrusion", "severity": "medium"},
        {"name": "Certificate Warning", "category": "phishing", "severity": "low"},
    ]
    
    threats = []
    for i in range(limit):
        template = random.choice(threat_types)
        threats.append({
            "id": str(uuid.uuid4()),
            "name": template["name"],
            "description": f"Live detection: {template['name']}",
            "severity": template["severity"],
            "category": template["category"],
            "source_ip": f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            "target_system": f"system-{random.randint(1, 100)}",
            "status": "active",
            "detected_at": datetime.now(timezone.utc) - timedelta(seconds=i * random.randint(10, 60)),
            "confidence_score": round(random.uniform(0.7, 0.99), 2),
            "blockchain_hash": generate_blockchain_hash(f"live:{i}")
        })
    
    return threats

def generate_threat_correlations() -> List[dict]:
    """Generate threat correlation patterns"""
    patterns = [
        {
            "pattern_name": "Coordinated Phishing Campaign",
            "pattern_type": "campaign",
            "attack_vector": "Email",
            "recommendations": ["Block sender domains", "Update email filters", "User awareness training"]
        },
        {
            "pattern_name": "Lateral Movement Chain",
            "pattern_type": "attack_chain",
            "attack_vector": "Internal Network",
            "recommendations": ["Network segmentation", "Enhanced monitoring", "Credential rotation"]
        },
        {
            "pattern_name": "APT Activity Pattern",
            "pattern_type": "apt",
            "attack_vector": "Multiple",
            "recommendations": ["Engage threat intelligence", "Forensic investigation", "Executive briefing"]
        },
        {
            "pattern_name": "Botnet C2 Communication",
            "pattern_type": "botnet",
            "attack_vector": "Network",
            "recommendations": ["Block C2 IPs", "Clean infected systems", "Update signatures"]
        },
        {
            "pattern_name": "Ransomware Precursor Activity",
            "pattern_type": "attack_chain",
            "attack_vector": "Endpoint",
            "recommendations": ["Isolate systems", "Backup verification", "Incident response activation"]
        }
    ]
    
    correlations = []
    for pattern in patterns:
        correlations.append({
            "id": str(uuid.uuid4()),
            "pattern_name": pattern["pattern_name"],
            "pattern_type": pattern["pattern_type"],
            "threat_ids": [str(uuid.uuid4()) for _ in range(random.randint(3, 8))],
            "correlation_score": round(random.uniform(0.7, 0.98), 2),
            "indicators": [
                f"IP: {random.randint(1,255)}.{random.randint(1,255)}.x.x",
                f"Domain: threat-{random.randint(100, 999)}.com",
                f"Port: {random.choice([22, 443, 3389, 445, 8080])}"
            ],
            "timeline_start": datetime.now(timezone.utc) - timedelta(days=random.randint(1, 7)),
            "timeline_end": datetime.now(timezone.utc),
            "affected_systems": [f"system-{random.randint(1, 50)}" for _ in range(random.randint(2, 6))],
            "attack_vector": pattern["attack_vector"],
            "recommendations": pattern["recommendations"]
        })
    
    return correlations

def generate_threat_clusters() -> dict:
    """Generate threat clustering analysis"""
    return {
        "clusters": [
            {
                "cluster_id": str(uuid.uuid4()),
                "name": "Malware Family A",
                "threat_count": random.randint(15, 45),
                "common_attributes": ["same_hash_prefix", "similar_behavior", "common_c2"],
                "risk_level": "high"
            },
            {
                "cluster_id": str(uuid.uuid4()),
                "name": "Phishing Wave",
                "threat_count": random.randint(25, 80),
                "common_attributes": ["similar_domains", "same_template", "common_targets"],
                "risk_level": "medium"
            },
            {
                "cluster_id": str(uuid.uuid4()),
                "name": "Scanning Activity",
                "threat_count": random.randint(50, 150),
                "common_attributes": ["sequential_ports", "same_source_range", "recon_pattern"],
                "risk_level": "low"
            },
            {
                "cluster_id": str(uuid.uuid4()),
                "name": "Data Theft Attempts",
                "threat_count": random.randint(5, 20),
                "common_attributes": ["large_transfers", "unusual_hours", "sensitive_data"],
                "risk_level": "critical"
            }
        ],
        "unclustered_count": random.randint(10, 30),
        "analysis_timestamp": datetime.now(timezone.utc).isoformat()
    }

def generate_geo_threat_data() -> List[dict]:
    """Generate geographic threat distribution data"""
    countries = [
        {"code": "US", "name": "United States", "lat": 37.0902, "lon": -95.7129},
        {"code": "CN", "name": "China", "lat": 35.8617, "lon": 104.1954},
        {"code": "RU", "name": "Russia", "lat": 61.5240, "lon": 105.3188},
        {"code": "BR", "name": "Brazil", "lat": -14.2350, "lon": -51.9253},
        {"code": "IN", "name": "India", "lat": 20.5937, "lon": 78.9629},
        {"code": "DE", "name": "Germany", "lat": 51.1657, "lon": 10.4515},
        {"code": "GB", "name": "United Kingdom", "lat": 55.3781, "lon": -3.4360},
        {"code": "FR", "name": "France", "lat": 46.2276, "lon": 2.2137},
        {"code": "JP", "name": "Japan", "lat": 36.2048, "lon": 138.2529},
        {"code": "KR", "name": "South Korea", "lat": 35.9078, "lon": 127.7669},
        {"code": "AU", "name": "Australia", "lat": -25.2744, "lon": 133.7751},
        {"code": "NL", "name": "Netherlands", "lat": 52.1326, "lon": 5.2913},
        {"code": "UA", "name": "Ukraine", "lat": 48.3794, "lon": 31.1656},
        {"code": "IR", "name": "Iran", "lat": 32.4279, "lon": 53.6880},
        {"code": "KP", "name": "North Korea", "lat": 40.3399, "lon": 127.5101},
    ]
    
    categories = ["malware", "phishing", "intrusion", "ddos", "ransomware"]
    
    geo_threats = []
    for country in countries:
        threat_count = random.randint(50, 500)
        geo_threats.append({
            "id": str(uuid.uuid4()),
            "country_code": country["code"],
            "country_name": country["name"],
            "latitude": country["lat"],
            "longitude": country["lon"],
            "threat_count": threat_count,
            "severity_breakdown": {
                "critical": random.randint(5, 30),
                "high": random.randint(20, 80),
                "medium": random.randint(30, 150),
                "low": random.randint(50, 200)
            },
            "top_categories": random.sample(categories, k=3),
            "risk_score": round(random.uniform(20, 95), 1),
            "trend": random.choice(["increasing", "decreasing", "stable"])
        })
    
    # Sort by threat count
    geo_threats.sort(key=lambda x: x["threat_count"], reverse=True)
    
    return geo_threats

def generate_threat_heatmap() -> dict:
    """Generate heatmap data for threat visualization"""
    # Generate points around the world
    points = []
    for _ in range(200):
        points.append({
            "lat": round(random.uniform(-60, 70), 4),
            "lon": round(random.uniform(-180, 180), 4),
            "intensity": round(random.uniform(0.1, 1.0), 2)
        })
    
    return {
        "points": points,
        "max_intensity": 1.0,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

def calculate_risk_score() -> dict:
    """Calculate comprehensive risk score"""
    # Multi-factor risk calculation
    threat_exposure = round(random.uniform(20, 70), 1)
    vulnerability_score = round(random.uniform(15, 60), 1)
    attack_surface = round(random.uniform(25, 65), 1)
    compliance_score = round(random.uniform(70, 95), 1)
    
    # Weighted calculation
    overall_score = round(
        (threat_exposure * 0.3 +
         vulnerability_score * 0.25 +
         attack_surface * 0.25 +
         (100 - compliance_score) * 0.2),
        1
    )
    
    return {
        "id": str(uuid.uuid4()),
        "entity_type": "organization",
        "entity_id": str(uuid.uuid4()),
        "overall_score": overall_score,
        "risk_level": "critical" if overall_score > 70 else "high" if overall_score > 50 else "medium" if overall_score > 30 else "low",
        "threat_exposure": threat_exposure,
        "vulnerability_score": vulnerability_score,
        "attack_surface": attack_surface,
        "compliance_score": compliance_score,
        "historical_incidents": random.randint(5, 50),
        "factors": {
            "unpatched_systems": round(random.uniform(0, 30), 1),
            "exposed_services": round(random.uniform(0, 25), 1),
            "policy_violations": round(random.uniform(0, 20), 1),
            "user_risk": round(random.uniform(0, 35), 1),
            "third_party_risk": round(random.uniform(0, 25), 1)
        },
        "recommendations": [
            "Prioritize patching critical vulnerabilities",
            "Reduce attack surface by closing unnecessary ports",
            "Implement stronger access controls",
            "Conduct security awareness training",
            "Review third-party vendor security"
        ],
        "calculated_at": datetime.now(timezone.utc)
    }

def generate_risk_analysis() -> dict:
    """Generate detailed risk analysis"""
    return {
        "summary": "Current risk posture indicates elevated threat exposure with moderate vulnerability profile.",
        "top_risks": [
            {
                "risk": "Unpatched Critical CVEs",
                "severity": "critical",
                "affected_systems": random.randint(5, 20),
                "recommendation": "Immediate patching required"
            },
            {
                "risk": "Exposed Administrative Interfaces",
                "severity": "high",
                "affected_systems": random.randint(2, 8),
                "recommendation": "Restrict access to internal networks"
            },
            {
                "risk": "Weak Authentication Policies",
                "severity": "high",
                "affected_systems": random.randint(10, 50),
                "recommendation": "Implement MFA and strong password policies"
            },
            {
                "risk": "Outdated Security Signatures",
                "severity": "medium",
                "affected_systems": random.randint(15, 40),
                "recommendation": "Update security definitions"
            }
        ],
        "attack_surface_breakdown": {
            "external_facing": random.randint(10, 50),
            "internal_services": random.randint(50, 200),
            "cloud_resources": random.randint(20, 100),
            "endpoints": random.randint(100, 1000)
        },
        "historical_comparison": {
            "last_week": round(random.uniform(40, 60), 1),
            "last_month": round(random.uniform(35, 55), 1),
            "last_quarter": round(random.uniform(45, 65), 1)
        },
        "industry_benchmark": {
            "your_score": round(random.uniform(40, 60), 1),
            "industry_average": round(random.uniform(45, 55), 1),
            "top_performers": round(random.uniform(20, 35), 1)
        }
    }

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

@api_router.get("/compliance/score")
async def get_compliance_score(current_user: dict = Depends(get_current_user)):
    """Calculate dynamic compliance score based on actual security posture"""
    user_id = current_user["id"]
    org_id = current_user.get("organization", "default")
    industry = current_user.get("industry", "general")
    
    # Get threats data
    total_threats = await db.threats.count_documents({"organization_id": org_id})
    active_threats = await db.threats.count_documents({"organization_id": org_id, "status": "active"})
    mitigated_threats = await db.threats.count_documents({"organization_id": org_id, "status": "mitigated"})
    critical_threats = await db.threats.count_documents({"organization_id": org_id, "severity": "critical", "status": "active"})
    
    # Get controls data
    controls = await db.compliance_controls.find({"user_id": user_id}, {"_id": 0}).to_list(length=1000)
    total_controls = len(controls)
    implemented_controls = len([c for c in controls if c.get("status") == "implemented"])
    partial_controls = len([c for c in controls if c.get("status") == "partial"])
    not_implemented = len([c for c in controls if c.get("status") == "not_implemented"])
    
    # Get recent audits
    recent_audits = await db.compliance_audits.find(
        {"organization_id": org_id}, {"_id": 0}
    ).sort("audit_date", -1).limit(5).to_list(length=5)
    
    # Calculate overall score (0-100)
    base_score = 100.0
    
    # Deduct for active threats
    if total_threats > 0:
        threat_penalty = (active_threats / max(total_threats, 1)) * 30
        base_score -= threat_penalty
    
    # Deduct for critical threats
    critical_penalty = min(critical_threats * 5, 20)
    base_score -= critical_penalty
    
    # Add points for implemented controls
    if total_controls > 0:
        control_bonus = (implemented_controls / total_controls) * 25
        partial_bonus = (partial_controls / total_controls) * 10
        base_score = base_score * 0.7 + control_bonus + partial_bonus
    
    # Ensure score is between 0-100
    overall_score = max(0, min(100, base_score))
    
    # Calculate scores by standard (industry-specific)
    standards_map = {
        "healthcare": ["HIPAA", "HITECH", "FDA 21 CFR Part 11"],
        "finance": ["PCI-DSS", "SOX", "GLBA"],
        "government": ["FISMA", "FedRAMP", "NIST 800-53"],
        "education": ["FERPA", "COPPA"],
        "ecommerce": ["PCI-DSS", "GDPR", "CCPA"],
        "manufacturing": ["IEC 62443", "NIST CSF", "ISO 27001"]
    }
    
    standards = standards_map.get(industry, ["ISO 27001", "NIST CSF"])
    scores_by_standard = {}
    for standard in standards:
        # Calculate per-standard score based on controls
        standard_controls = [c for c in controls if c.get("standard") == standard]
        if standard_controls:
            implemented = len([c for c in standard_controls if c.get("status") == "implemented"])
            total = len(standard_controls)
            scores_by_standard[standard] = round((implemented / total) * 100, 1)
        else:
            scores_by_standard[standard] = round(overall_score + random.uniform(-5, 5), 1)
    
    # Determine trend
    if len(recent_audits) >= 2:
        latest_score = recent_audits[0].get("overall_score", overall_score)
        previous_score = recent_audits[1].get("overall_score", overall_score)
        if latest_score > previous_score + 5:
            trend = "improving"
        elif latest_score < previous_score - 5:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "stable"
    
    # Calculate threat impact
    threat_impact = round((active_threats / max(total_threats, 1)) * 100 if total_threats > 0 else 0, 1)
    
    # Format recent audits
    audits_summary = []
    for audit in recent_audits[:3]:
        audits_summary.append({
            "id": audit.get("id"),
            "date": audit.get("audit_date"),
            "score": audit.get("overall_score"),
            "status": audit.get("status")
        })
    
    return ComplianceScore(
        overall_score=round(overall_score, 1),
        industry=industry,
        scores_by_standard=scores_by_standard,
        controls_status={
            "implemented": implemented_controls,
            "not_implemented": not_implemented,
            "partial": partial_controls
        },
        recent_audits=audits_summary,
        threat_impact=threat_impact,
        trend=trend,
        last_calculated=datetime.now(timezone.utc)
    )

@api_router.post("/compliance/audit")
async def run_compliance_audit(current_user: dict = Depends(get_current_user)):
    """Run a comprehensive compliance audit"""
    user_id = current_user["id"]
    org_id = current_user.get("organization", "default")
    industry = current_user.get("industry", "general")
    
    # Get industry standards
    standards_map = {
        "healthcare": ["HIPAA", "HITECH", "FDA 21 CFR Part 11"],
        "finance": ["PCI-DSS", "SOX", "GLBA"],
        "government": ["FISMA", "FedRAMP", "NIST 800-53"],
        "education": ["FERPA", "COPPA"],
        "ecommerce": ["PCI-DSS", "GDPR", "CCPA"],
        "manufacturing": ["IEC 62443", "NIST CSF", "ISO 27001"]
    }
    standards = standards_map.get(industry, ["ISO 27001", "NIST CSF"])
    
    # Get controls
    controls = await db.compliance_controls.find({"user_id": user_id}, {"_id": 0}).to_list(length=1000)
    
    # Get threats
    active_threats = await db.threats.find({"organization_id": org_id, "status": "active"}, {"_id": 0}).to_list(length=100)
    critical_threats = [t for t in active_threats if t.get("severity") == "critical"]
    high_threats = [t for t in active_threats if t.get("severity") == "high"]
    
    # Run audit checks
    findings = []
    recommendations = []
    passed_controls = 0
    failed_controls = 0
    warnings = 0
    
    # Check 1: Control Implementation
    for control in controls:
        if control.get("status") == "implemented":
            passed_controls += 1
        elif control.get("status") == "not_implemented":
            failed_controls += 1
            findings.append({
                "severity": "high",
                "type": "control_not_implemented",
                "control": control.get("name"),
                "standard": control.get("standard"),
                "message": f"Control '{control.get('name')}' is not implemented"
            })
            recommendations.append(f"Implement {control.get('name')} to meet {control.get('standard')} requirements")
        else:  # partial
            warnings += 1
            findings.append({
                "severity": "medium",
                "type": "control_partial",
                "control": control.get("name"),
                "standard": control.get("standard"),
                "message": f"Control '{control.get('name')}' is partially implemented"
            })
    
    # Check 2: Active Threats
    if len(critical_threats) > 0:
        failed_controls += 1
        findings.append({
            "severity": "critical",
            "type": "active_critical_threats",
            "count": len(critical_threats),
            "message": f"{len(critical_threats)} critical threats detected and not mitigated"
        })
        recommendations.append("Immediately address all critical security threats")
    
    if len(high_threats) > 3:
        warnings += 1
        findings.append({
            "severity": "high",
            "type": "active_high_threats",
            "count": len(high_threats),
            "message": f"{len(high_threats)} high-severity threats require attention"
        })
        recommendations.append("Prioritize mitigation of high-severity threats")
    
    # Check 3: Documents
    documents = await db.compliance_documents.find({"organization_id": org_id}).to_list(length=100)
    if len(documents) < 3:
        warnings += 1
        findings.append({
            "severity": "medium",
            "type": "insufficient_documentation",
            "message": "Insufficient compliance documentation uploaded"
        })
        recommendations.append("Upload required compliance policies and procedures")
    
    # Check 4: Incident Response
    incidents = await db.incidents.find({"organization_id": org_id}).to_list(length=100)
    if len(incidents) == 0 and len(active_threats) > 0:
        warnings += 1
        findings.append({
            "severity": "medium",
            "type": "no_incident_response",
            "message": "Active threats detected but no incident responses recorded"
        })
        recommendations.append("Document incident response procedures and actions")
    
    # Calculate overall score
    total_checks = passed_controls + failed_controls + warnings
    if total_checks > 0:
        overall_score = round((passed_controls / total_checks) * 100, 1)
    else:
        overall_score = 50.0
    
    # Create audit record
    audit = ComplianceAudit(
        audit_type="on_demand",
        industry=industry,
        standards_checked=standards,
        overall_score=overall_score,
        passed_controls=passed_controls,
        failed_controls=failed_controls,
        warnings=warnings,
        findings=findings,
        recommendations=recommendations[:10],  # Top 10 recommendations
        audited_by=user_id,
        organization_id=org_id,
        blockchain_hash=generate_blockchain_hash(f"audit_{org_id}_{datetime.now().isoformat()}"),
        status="completed"
    )
    
    # Save to database
    audit_dict = audit.model_dump()
    audit_dict["audit_date"] = audit_dict["audit_date"].isoformat()
    await db.compliance_audits.insert_one(audit_dict)
    
    # Record blockchain transaction
    await record_blockchain_transaction("compliance_audit", audit.id)
    
    return audit

@api_router.get("/compliance/audits")
async def get_compliance_audits(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get compliance audit history"""
    org_id = current_user.get("organization", "default")
    
    audits = await db.compliance_audits.find(
        {"organization_id": org_id}
    ).sort("audit_date", -1).limit(limit).to_list(length=limit)
    
    return {"audits": audits, "count": len(audits)}

@api_router.get("/compliance/controls")
async def get_compliance_controls(current_user: dict = Depends(get_current_user)):
    """Get all compliance controls for the user's industry"""
    user_id = current_user["id"]
    org_id = current_user.get("organization", "default")
    industry = current_user.get("industry", "general")
    
    # Check if controls already exist for this user
    existing_controls = await db.compliance_controls.find({"user_id": user_id}).to_list(length=1000)
    
    if not existing_controls:
        # Initialize default controls based on industry
        default_controls = []
        
        if industry == "healthcare":
            default_controls = [
                {"control_id": "HIPAA-001", "name": "PHI Access Control", "description": "Implement role-based access control for Protected Health Information", "standard": "HIPAA", "category": "access_control"},
                {"control_id": "HIPAA-002", "name": "Data Encryption", "description": "Encrypt PHI at rest and in transit", "standard": "HIPAA", "category": "encryption"},
                {"control_id": "HIPAA-003", "name": "Audit Logging", "description": "Maintain comprehensive audit trails", "standard": "HIPAA", "category": "monitoring"},
                {"control_id": "HIPAA-004", "name": "Breach Notification", "description": "Implement breach notification procedures", "standard": "HIPAA", "category": "incident_response"},
                {"control_id": "HITECH-001", "name": "Risk Assessment", "description": "Conduct regular risk assessments", "standard": "HITECH", "category": "risk_management"},
            ]
        elif industry == "finance":
            default_controls = [
                {"control_id": "PCI-001", "name": "Firewall Configuration", "description": "Install and maintain firewall configuration", "standard": "PCI-DSS", "category": "network_security"},
                {"control_id": "PCI-002", "name": "Default Passwords", "description": "Change vendor-supplied defaults", "standard": "PCI-DSS", "category": "access_control"},
                {"control_id": "PCI-003", "name": "Cardholder Data Protection", "description": "Protect stored cardholder data", "standard": "PCI-DSS", "category": "data_protection"},
                {"control_id": "SOX-001", "name": "Financial Controls", "description": "Implement financial reporting controls", "standard": "SOX", "category": "financial_controls"},
                {"control_id": "GLBA-001", "name": "Customer Privacy", "description": "Protect customer financial information", "standard": "GLBA", "category": "privacy"},
            ]
        elif industry == "government":
            default_controls = [
                {"control_id": "NIST-001", "name": "Access Control", "description": "Limit system access to authorized users", "standard": "NIST 800-53", "category": "access_control"},
                {"control_id": "NIST-002", "name": "Incident Response", "description": "Establish incident response capability", "standard": "NIST 800-53", "category": "incident_response"},
                {"control_id": "FISMA-001", "name": "Continuous Monitoring", "description": "Implement continuous monitoring", "standard": "FISMA", "category": "monitoring"},
                {"control_id": "FedRAMP-001", "name": "Security Assessment", "description": "Conduct security assessments", "standard": "FedRAMP", "category": "assessment"},
            ]
        else:
            # Generic controls
            default_controls = [
                {"control_id": "ISO-001", "name": "Information Security Policy", "description": "Establish information security policies", "standard": "ISO 27001", "category": "policy"},
                {"control_id": "ISO-002", "name": "Access Control", "description": "Implement access control measures", "standard": "ISO 27001", "category": "access_control"},
                {"control_id": "ISO-003", "name": "Cryptography", "description": "Use cryptographic controls", "standard": "ISO 27001", "category": "encryption"},
                {"control_id": "NIST-001", "name": "Risk Assessment", "description": "Conduct risk assessments", "standard": "NIST CSF", "category": "risk_management"},
            ]
        
        # Create control documents
        for ctrl in default_controls:
            control = ComplianceControl(
                control_id=ctrl["control_id"],
                name=ctrl["name"],
                description=ctrl["description"],
                standard=ctrl["standard"],
                category=ctrl["category"],
                status="not_implemented",
                user_id=user_id,
                organization_id=org_id,
                industry=industry
            )
            control_dict = control.model_dump()
            await db.compliance_controls.insert_one(control_dict)
        
        # Fetch newly created controls
        existing_controls = await db.compliance_controls.find({"user_id": user_id}).to_list(length=1000)
    
    return {"controls": existing_controls, "count": len(existing_controls)}

@api_router.put("/compliance/controls/{control_id}/status")
async def update_control_status(
    control_id: str,
    update: ComplianceControlUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update compliance control implementation status"""
    user_id = current_user["id"]
    
    control = await db.compliance_controls.find_one({"id": control_id, "user_id": user_id})
    if not control:
        raise HTTPException(status_code=404, detail="Control not found")
    
    update_data = {"status": update.status}
    if update.status == "implemented":
        update_data["implementation_date"] = datetime.now(timezone.utc).isoformat()
        update_data["last_verified"] = datetime.now(timezone.utc).isoformat()
    
    await db.compliance_controls.update_one(
        {"id": control_id},
        {"$set": update_data}
    )
    
    # Record blockchain transaction
    await record_blockchain_transaction("control_update", control_id)
    
    updated_control = await db.compliance_controls.find_one({"id": control_id})
    return updated_control

@api_router.post("/compliance/documents")
async def upload_compliance_document(
    document: ComplianceDocumentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Upload a compliance document"""
    import base64
    
    user_id = current_user["id"]
    org_id = current_user.get("organization", "default")
    
    # In a real implementation, you would save the file to storage
    # For now, we'll simulate by storing metadata
    file_path = f"/compliance_docs/{org_id}/{document.file_name}"
    
    doc = ComplianceDocument(
        title=document.title,
        description=document.description,
        document_type=document.document_type,
        compliance_standard=document.compliance_standard,
        file_name=document.file_name,
        file_size=document.file_size,
        file_path=file_path,
        uploaded_by=user_id,
        organization_id=org_id,
        tags=document.tags,
        blockchain_hash=generate_blockchain_hash(f"doc_{document.file_name}_{datetime.now().isoformat()}")
    )
    
    doc_dict = doc.model_dump()
    doc_dict["uploaded_at"] = doc_dict["uploaded_at"].isoformat()
    await db.compliance_documents.insert_one(doc_dict)
    
    # Record blockchain transaction
    await record_blockchain_transaction("document_upload", doc.id)
    
    return doc

@api_router.get("/compliance/documents")
async def get_compliance_documents(
    current_user: dict = Depends(get_current_user)
):
    """Get all compliance documents"""
    org_id = current_user.get("organization", "default")
    
    documents = await db.compliance_documents.find(
        {"organization_id": org_id}
    ).sort("uploaded_at", -1).to_list(length=1000)
    
    return {"documents": documents, "count": len(documents)}

@api_router.delete("/compliance/documents/{document_id}")
async def delete_compliance_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a compliance document"""
    org_id = current_user.get("organization", "default")
    
    document = await db.compliance_documents.find_one(
        {"id": document_id, "organization_id": org_id}
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.compliance_documents.delete_one({"id": document_id})
    
    # Record blockchain transaction
    await record_blockchain_transaction("document_deletion", document_id)
    
    return {"message": "Document deleted successfully"}

@api_router.get("/compliance/report")
async def generate_compliance_report(current_user: dict = Depends(get_current_user)):
    """Generate comprehensive compliance report"""
    user_id = current_user["id"]
    org_id = current_user.get("organization", "default")
    industry = current_user.get("industry", "general")
    
    # Get compliance score
    score_response = await get_compliance_score(current_user)
    
    # Get latest audit
    latest_audit = await db.compliance_audits.find_one(
        {"organization_id": org_id},
        sort=[("audit_date", -1)]
    )
    
    # Get controls summary
    controls = await db.compliance_controls.find({"user_id": user_id}).to_list(length=1000)
    controls_summary = {
        "total": len(controls),
        "implemented": len([c for c in controls if c.get("status") == "implemented"]),
        "partial": len([c for c in controls if c.get("status") == "partial"]),
        "not_implemented": len([c for c in controls if c.get("status") == "not_implemented"])
    }
    
    # Get documents summary
    documents = await db.compliance_documents.find({"organization_id": org_id}).to_list(length=1000)
    
    # Get threats summary
    active_threats = await db.threats.count_documents({"organization_id": org_id, "status": "active"})
    mitigated_threats = await db.threats.count_documents({"organization_id": org_id, "status": "mitigated"})
    
    report = {
        "report_id": str(uuid.uuid4()),
        "organization_id": org_id,
        "industry": industry,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": user_id,
        "compliance_score": score_response.model_dump(),
        "latest_audit": latest_audit,
        "controls_summary": controls_summary,
        "documents_count": len(documents),
        "threats_summary": {
            "active": active_threats,
            "mitigated": mitigated_threats
        },
        "recommendations": latest_audit.get("recommendations", []) if latest_audit else []
    }
    
    return report

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
