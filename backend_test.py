#!/usr/bin/env python3
"""
DCTIP Backend API Testing Suite
Tests all backend APIs for the Decentralized Cybersecurity Threat Intelligence Platform
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://fix-compliance-hub.preview.emergentagent.com/api"
TEST_USER = {
    "email": "security.analyst@cyberdefense.org",
    "password": "SecurePass2024!",
    "full_name": "Sarah Chen",
    "organization": "CyberDefense Alliance",
    "role": "analyst",
    "industry": "cybersecurity"
}

class DCTIPTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.user_id = None
        self.test_results = []
        self.created_resources = []  # Track created resources for cleanup
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
    def make_request(self, method, endpoint, data=None, params=None, auth_required=True):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth_required and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, params=params, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, params=params, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def test_auth_register(self):
        """Test user registration"""
        response = self.make_request("POST", "/auth/register", TEST_USER, auth_required=False)
        
        if response and response.status_code in [200, 201]:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_result("Auth Registration", True, "User registered successfully", data)
                return True
        elif response and response.status_code == 400:
            # User might already exist, try login
            return self.test_auth_login()
        
        self.log_result("Auth Registration", False, f"Registration failed: {response.status_code if response else 'No response'}")
        return False

    def test_auth_login(self):
        """Test user login"""
        login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
        response = self.make_request("POST", "/auth/login", login_data, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_result("Auth Login", True, "Login successful", data)
                return True
                
        self.log_result("Auth Login", False, f"Login failed: {response.status_code if response else 'No response'}")
        return False

    def test_auth_me(self):
        """Test get current user"""
        response = self.make_request("GET", "/auth/me")
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "email" in data:
                self.log_result("Auth Me", True, "User profile retrieved successfully", data)
                return True
                
        self.log_result("Auth Me", False, f"Get user failed: {response.status_code if response else 'No response'}")
        return False

    def test_threats_get_all(self):
        """Test get all threats"""
        response = self.make_request("GET", "/threats")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Get All Threats", True, f"Retrieved {len(data)} threats")
                return True
                
        self.log_result("Get All Threats", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_threats_create(self):
        """Test create threat"""
        threat_data = {
            "name": "Advanced Persistent Threat Campaign",
            "description": "Sophisticated multi-stage attack targeting financial institutions with custom malware and social engineering tactics",
            "severity": "critical",
            "category": "malware",
            "source_ip": "185.220.101.42",
            "target_system": "core-banking-system-prod",
            "industry_tags": ["finance", "banking"]
        }
        
        response = self.make_request("POST", "/threats", threat_data)
        
        if response and response.status_code in [200, 201]:
            data = response.json()
            if "id" in data:
                self.created_resources.append(("threat", data["id"]))
                self.log_result("Create Threat", True, f"Threat created with ID: {data['id']}")
                return data["id"]
                
        self.log_result("Create Threat", False, f"Failed: {response.status_code if response else 'No response'}")
        return None

    def test_threats_get_specific(self, threat_id):
        """Test get specific threat"""
        response = self.make_request("GET", f"/threats/{threat_id}")
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and data["id"] == threat_id:
                self.log_result("Get Specific Threat", True, f"Retrieved threat {threat_id}")
                return True
                
        self.log_result("Get Specific Threat", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_threats_update_status(self, threat_id):
        """Test update threat status"""
        response = self.make_request("PUT", f"/threats/{threat_id}/status", params={"status": "investigating"})
        
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data:
                self.log_result("Update Threat Status", True, "Threat status updated successfully")
                return True
                
        self.log_result("Update Threat Status", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_edge_devices_get_all(self):
        """Test get all edge devices"""
        response = self.make_request("GET", "/edge-devices")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Get All Edge Devices", True, f"Retrieved {len(data)} edge devices")
                return True
                
        self.log_result("Get All Edge Devices", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_edge_devices_create(self):
        """Test create edge device"""
        device_data = {
            "name": "Security Gateway Alpha",
            "device_type": "gateway",
            "ip_address": "10.0.1.100",
            "location": "Data Center Primary - Rack A7"
        }
        
        response = self.make_request("POST", "/edge-devices", device_data)
        
        if response and response.status_code in [200, 201]:
            data = response.json()
            if "id" in data:
                self.created_resources.append(("edge_device", data["id"]))
                self.log_result("Create Edge Device", True, f"Edge device created with ID: {data['id']}")
                return data["id"]
                
        self.log_result("Create Edge Device", False, f"Failed: {response.status_code if response else 'No response'}")
        return None

    def test_edge_devices_metrics_summary(self):
        """Test get edge devices metrics summary"""
        response = self.make_request("GET", "/edge-devices/metrics/summary")
        
        if response and response.status_code == 200:
            data = response.json()
            if "total_devices" in data and "online_devices" in data:
                self.log_result("Edge Devices Metrics Summary", True, f"Retrieved metrics for {data['total_devices']} devices")
                return True
                
        self.log_result("Edge Devices Metrics Summary", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_ai_suggestions(self):
        """Test get AI suggestions"""
        response = self.make_request("GET", "/ai/suggestions")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("AI Suggestions", True, f"Retrieved {len(data)} AI suggestions")
                return True
                
        self.log_result("AI Suggestions", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_ai_analyze_threat(self, threat_id):
        """Test AI threat analysis"""
        response = self.make_request("POST", "/ai/analyze-threat", params={"threat_id": threat_id})
        
        if response and response.status_code == 200:
            data = response.json()
            if "threat_id" in data and "analysis_summary" in data:
                self.log_result("AI Analyze Threat", True, "AI threat analysis completed successfully")
                return True
                
        self.log_result("AI Analyze Threat", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_reputation_leaderboard(self):
        """Test get reputation leaderboard"""
        response = self.make_request("GET", "/reputation/leaderboard")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Reputation Leaderboard", True, f"Retrieved {len(data)} organizations in leaderboard")
                return True
                
        self.log_result("Reputation Leaderboard", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_reputation_contribute(self):
        """Test record reputation contribution"""
        response = self.make_request("POST", "/reputation/contribute", params={"contribution_type": "threat_share"})
        
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data and "points_earned" in data:
                self.log_result("Reputation Contribute", True, f"Contribution recorded, earned {data['points_earned']} points")
                return True
                
        self.log_result("Reputation Contribute", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_network_topology(self):
        """Test get network topology"""
        response = self.make_request("GET", "/network/topology")
        
        if response and response.status_code == 200:
            data = response.json()
            if "nodes" in data and "connections" in data and "stats" in data:
                self.log_result("Network Topology", True, f"Retrieved topology with {len(data['nodes'])} nodes and {len(data['connections'])} connections")
                return True
                
        self.log_result("Network Topology", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_threat_feed_live(self):
        """Test get live threat feed"""
        response = self.make_request("GET", "/threat-feed/live")
        
        if response and response.status_code == 200:
            data = response.json()
            if "threats" in data and "total_count" in data:
                self.log_result("Live Threat Feed", True, f"Retrieved {data['total_count']} live threats")
                return True
                
        self.log_result("Live Threat Feed", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_threat_feed_generate(self):
        """Test generate threat feed"""
        response = self.make_request("POST", "/threat-feed/generate", params={"count": 3})
        
        if response and response.status_code == 200:
            data = response.json()
            if "generated" in data and "threats" in data:
                self.log_result("Generate Threat Feed", True, f"Generated {data['generated']} new threats")
                return True
                
        self.log_result("Generate Threat Feed", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_correlation_patterns(self):
        """Test get threat correlation patterns"""
        response = self.make_request("GET", "/correlation/patterns")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Threat Correlation Patterns", True, f"Retrieved {len(data)} correlation patterns")
                return True
                
        self.log_result("Threat Correlation Patterns", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_correlation_clusters(self):
        """Test get threat clusters"""
        response = self.make_request("GET", "/correlation/clusters")
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_result("Threat Clusters", True, "Retrieved threat clustering analysis")
            return True
                
        self.log_result("Threat Clusters", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_geo_threats(self):
        """Test get geographic threats"""
        response = self.make_request("GET", "/geo/threats")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Geographic Threats", True, f"Retrieved geographic data for {len(data)} countries")
                return True
                
        self.log_result("Geographic Threats", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_geo_heatmap(self):
        """Test get threat heatmap"""
        response = self.make_request("GET", "/geo/heatmap")
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_result("Threat Heatmap", True, "Retrieved threat heatmap data")
            return True
                
        self.log_result("Threat Heatmap", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_risk_score(self):
        """Test get overall risk score"""
        response = self.make_request("GET", "/risk/score")
        
        if response and response.status_code == 200:
            data = response.json()
            if "overall_score" in data:
                self.log_result("Risk Score", True, f"Retrieved overall risk score: {data['overall_score']}")
                return True
                
        self.log_result("Risk Score", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_risk_analysis(self):
        """Test get risk analysis"""
        response = self.make_request("GET", "/risk/analysis")
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_result("Risk Analysis", True, "Retrieved detailed risk analysis")
            return True
                
        self.log_result("Risk Analysis", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_risk_trends(self):
        """Test get risk trends"""
        response = self.make_request("GET", "/risk/trends")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Risk Trends", True, f"Retrieved {len(data)} days of risk trend data")
                return True
                
        self.log_result("Risk Trends", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_dashboard_stats(self):
        """Test get dashboard statistics"""
        response = self.make_request("GET", "/dashboard/stats")
        
        if response and response.status_code == 200:
            data = response.json()
            if "total_threats" in data and "active_threats" in data:
                self.log_result("Dashboard Stats", True, f"Retrieved dashboard stats: {data['total_threats']} total threats")
                return True
                
        self.log_result("Dashboard Stats", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_blockchain_transactions(self):
        """Test get blockchain transactions"""
        response = self.make_request("GET", "/blockchain/transactions")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Blockchain Transactions", True, f"Retrieved {len(data)} blockchain transactions")
                return True
                
        self.log_result("Blockchain Transactions", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_federated_models(self):
        """Test get federated models"""
        response = self.make_request("GET", "/federated/models")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Federated Models", True, f"Retrieved {len(data)} federated learning models")
                return True
                
        self.log_result("Federated Models", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_federated_contributions(self):
        """Test get federated contributions"""
        response = self.make_request("GET", "/federated/contributions")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Federated Contributions", True, f"Retrieved {len(data)} federated contributions")
                return True
                
        self.log_result("Federated Contributions", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    # ============== COMPLIANCE CENTER TESTS ==============

    def test_compliance_score(self):
        """Test GET /api/compliance/score - Dynamic compliance scoring"""
        response = self.make_request("GET", "/compliance/score")
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["overall_score", "industry", "scores_by_standard", "controls_status", 
                             "recent_audits", "threat_impact", "trend", "last_calculated"]
            
            if all(field in data for field in required_fields):
                self.log_result("Compliance Score", True, 
                              f"Retrieved compliance score: {data['overall_score']} for {data['industry']} industry")
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_result("Compliance Score", False, f"Missing required fields: {missing}")
                return False
                
        self.log_result("Compliance Score", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_compliance_audit(self):
        """Test POST /api/compliance/audit - Run compliance audit"""
        response = self.make_request("POST", "/compliance/audit")
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["id", "audit_type", "industry", "overall_score", "findings", 
                             "recommendations", "blockchain_hash"]
            
            if all(field in data for field in required_fields):
                audit_id = data["id"]
                self.created_resources.append(("compliance_audit", audit_id))
                self.log_result("Compliance Audit", True, 
                              f"Audit completed with score: {data['overall_score']}, {len(data['findings'])} findings")
                return audit_id
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_result("Compliance Audit", False, f"Missing required fields: {missing}")
                return None
                
        self.log_result("Compliance Audit", False, f"Failed: {response.status_code if response else 'No response'}")
        return None

    def test_compliance_audits_history(self):
        """Test GET /api/compliance/audits - Get audit history"""
        response = self.make_request("GET", "/compliance/audits", params={"limit": 10})
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Compliance Audits History", True, f"Retrieved {len(data)} audit records")
                return True
            else:
                self.log_result("Compliance Audits History", False, "Response is not a list")
                return False
                
        self.log_result("Compliance Audits History", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_compliance_controls(self):
        """Test GET /api/compliance/controls - Get compliance controls"""
        response = self.make_request("GET", "/compliance/controls")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check structure of first control
                control = data[0]
                required_fields = ["id", "control_id", "name", "description", "standard", 
                                 "category", "status"]
                
                if all(field in control for field in required_fields):
                    self.log_result("Compliance Controls", True, 
                                  f"Retrieved {len(data)} controls, auto-generated for user's industry")
                    return data[0]["id"]  # Return first control ID for status update test
                else:
                    missing = [f for f in required_fields if f not in control]
                    self.log_result("Compliance Controls", False, f"Control missing fields: {missing}")
                    return None
            else:
                self.log_result("Compliance Controls", False, "No controls returned or invalid format")
                return None
                
        self.log_result("Compliance Controls", False, f"Failed: {response.status_code if response else 'No response'}")
        return None

    def test_compliance_control_status_update(self, control_id):
        """Test PUT /api/compliance/controls/{control_id}/status - Update control status"""
        if not control_id:
            self.log_result("Update Control Status", False, "No control ID provided")
            return False
            
        update_data = {
            "status": "implemented",
            "notes": "Successfully implemented multi-factor authentication across all systems"
        }
        
        response = self.make_request("PUT", f"/compliance/controls/{control_id}/status", update_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data and "blockchain_hash" in data:
                self.log_result("Update Control Status", True, 
                              f"Control status updated to 'implemented' with blockchain hash")
                return True
            else:
                self.log_result("Update Control Status", False, "Missing message or blockchain_hash in response")
                return False
                
        self.log_result("Update Control Status", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_compliance_document_upload(self):
        """Test POST /api/compliance/documents - Upload document"""
        # Create sample base64 content (simulating a small text file)
        import base64
        sample_content = "This is a sample compliance policy document for testing purposes."
        base64_content = base64.b64encode(sample_content.encode()).decode()
        
        document_data = {
            "title": "Information Security Policy v2.1",
            "description": "Comprehensive information security policy covering access controls, data protection, and incident response procedures",
            "document_type": "policy",
            "compliance_standard": "ISO27001",
            "file_name": "info_security_policy_v2.1.txt",
            "file_size": len(sample_content),
            "file_content": base64_content,
            "tags": ["security", "policy", "iso27001", "access_control"]
        }
        
        response = self.make_request("POST", "/compliance/documents", document_data)
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["id", "title", "file_name", "blockchain_hash", "uploaded_at"]
            
            if all(field in data for field in required_fields):
                document_id = data["id"]
                self.created_resources.append(("compliance_document", document_id))
                self.log_result("Upload Compliance Document", True, 
                              f"Document '{data['title']}' uploaded with blockchain hash")
                return document_id
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_result("Upload Compliance Document", False, f"Missing required fields: {missing}")
                return None
                
        self.log_result("Upload Compliance Document", False, f"Failed: {response.status_code if response else 'No response'}")
        return None

    def test_compliance_documents_list(self):
        """Test GET /api/compliance/documents - Get documents list"""
        response = self.make_request("GET", "/compliance/documents")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Compliance Documents List", True, f"Retrieved {len(data)} compliance documents")
                return True
            else:
                self.log_result("Compliance Documents List", False, "Response is not a list")
                return False
                
        self.log_result("Compliance Documents List", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_compliance_document_delete(self, document_id):
        """Test DELETE /api/compliance/documents/{document_id} - Delete document"""
        if not document_id:
            self.log_result("Delete Compliance Document", False, "No document ID provided")
            return False
            
        response = self.make_request("DELETE", f"/compliance/documents/{document_id}")
        
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data and "blockchain_hash" in data:
                self.log_result("Delete Compliance Document", True, 
                              "Document deleted successfully with blockchain transaction recorded")
                return True
            else:
                self.log_result("Delete Compliance Document", False, "Missing message or blockchain_hash in response")
                return False
                
        self.log_result("Delete Compliance Document", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def test_compliance_report(self):
        """Test GET /api/compliance/report - Generate compliance report"""
        response = self.make_request("GET", "/compliance/report")
        
        if response and response.status_code == 200:
            data = response.json()
            required_sections = ["compliance_score", "latest_audit", "controls_summary", 
                               "documents_summary", "generated_at"]
            
            if all(section in data for section in required_sections):
                controls_count = data["controls_summary"]["total_controls"]
                docs_count = data["documents_summary"]["total_documents"]
                self.log_result("Compliance Report", True, 
                              f"Generated comprehensive report: {controls_count} controls, {docs_count} documents")
                return True
            else:
                missing = [s for s in required_sections if s not in data]
                self.log_result("Compliance Report", False, f"Missing required sections: {missing}")
                return False
                
        self.log_result("Compliance Report", False, f"Failed: {response.status_code if response else 'No response'}")
        return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting DCTIP Backend API Testing Suite")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication Tests
        print("\n🔐 Authentication Tests")
        if not self.test_auth_register():
            print("❌ Authentication failed - stopping tests")
            return False
            
        self.test_auth_me()
        
        # Core Threat Management Tests
        print("\n🛡️ Threat Management Tests")
        self.test_threats_get_all()
        threat_id = self.test_threats_create()
        if threat_id:
            self.test_threats_get_specific(threat_id)
            self.test_threats_update_status(threat_id)
            
        # Edge Device Tests
        print("\n📡 Edge Device Tests")
        self.test_edge_devices_get_all()
        device_id = self.test_edge_devices_create()
        self.test_edge_devices_metrics_summary()
        
        # AI and Analytics Tests
        print("\n🤖 AI and Analytics Tests")
        self.test_ai_suggestions()
        if threat_id:
            self.test_ai_analyze_threat(threat_id)
            
        # Reputation System Tests
        print("\n🏆 Reputation System Tests")
        self.test_reputation_leaderboard()
        self.test_reputation_contribute()
        
        # Network and Topology Tests
        print("\n🌐 Network Topology Tests")
        self.test_network_topology()
        
        # Threat Feed Tests
        print("\n📊 Threat Feed Tests")
        self.test_threat_feed_live()
        self.test_threat_feed_generate()
        
        # Correlation and Analysis Tests
        print("\n🔗 Threat Correlation Tests")
        self.test_correlation_patterns()
        self.test_correlation_clusters()
        
        # Geographic Tests
        print("\n🗺️ Geographic Threat Tests")
        self.test_geo_threats()
        self.test_geo_heatmap()
        
        # Risk Analysis Tests
        print("\n⚠️ Risk Analysis Tests")
        self.test_risk_score()
        self.test_risk_analysis()
        self.test_risk_trends()
        
        # Dashboard and Reporting Tests
        print("\n📈 Dashboard Tests")
        self.test_dashboard_stats()
        
        # Blockchain Tests
        print("\n⛓️ Blockchain Tests")
        self.test_blockchain_transactions()
        
        # Federated Learning Tests
        print("\n🤝 Federated Learning Tests")
        self.test_federated_models()
        self.test_federated_contributions()
        
        # Print Summary
        self.print_summary()
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📊 Total: {len(self.test_results)}")
        print(f"📈 Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print(f"\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print("\n🎯 Test completed!")

if __name__ == "__main__":
    tester = DCTIPTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)