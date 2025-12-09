import React, { useState, useEffect } from 'react';
import { complianceAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  FileText,
  RefreshCw,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Building,
  Stethoscope,
  Landmark,
  GraduationCap,
  ShoppingCart,
  Factory,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

const INDUSTRY_ICONS = {
  healthcare: Stethoscope,
  finance: Landmark,
  government: Building,
  education: GraduationCap,
  ecommerce: ShoppingCart,
  manufacturing: Factory
};

const INDUSTRY_COLORS = {
  healthcare: 'from-red-500 to-pink-600',
  finance: 'from-green-500 to-emerald-600',
  government: 'from-blue-500 to-indigo-600',
  education: 'from-purple-500 to-violet-600',
  ecommerce: 'from-orange-500 to-amber-600',
  manufacturing: 'from-cyan-500 to-teal-600'
};

const Compliance = () => {
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState('healthcare');
  const [complianceScore, setComplianceScore] = useState(null);
  const [controls, setControls] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [audits, setAudits] = useState([]);
  const [auditRunning, setAuditRunning] = useState(false);
  const [controlsModalOpen, setControlsModalOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [auditsModalOpen, setAuditsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Document upload state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    document_type: 'policy',
    compliance_standard: '',
    file_name: '',
    file_size: 0,
    file_content: '',
    tags: []
  });

  const fetchTemplates = async () => {
    try {
      const response = await complianceAPI.getTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch compliance templates:', error);
    }
  };

  const fetchComplianceScore = async () => {
    try {
      const response = await complianceAPI.getScore();
      setComplianceScore(response.data);
    } catch (error) {
      console.error('Failed to fetch compliance score:', error);
      toast({
        title: "Error",
        description: "Failed to fetch compliance score",
        variant: "destructive"
      });
    }
  };

  const fetchControls = async () => {
    try {
      const response = await complianceAPI.getControls();
      setControls(response.data.controls || []);
    } catch (error) {
      console.error('Failed to fetch controls:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await complianceAPI.getDocuments();
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const fetchAudits = async () => {
    try {
      const response = await complianceAPI.getAudits(10);
      setAudits(response.data.audits || []);
    } catch (error) {
      console.error('Failed to fetch audits:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTemplates(),
      fetchComplianceScore(),
      fetchControls(),
      fetchDocuments(),
      fetchAudits()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const runAudit = async () => {
    setAuditRunning(true);
    try {
      const response = await complianceAPI.runAudit();
      toast({
        title: "Audit Complete",
        description: `Compliance audit completed. Score: ${response.data.overall_score}%`,
      });
      await fetchComplianceScore();
      await fetchAudits();
    } catch (error) {
      console.error('Failed to run audit:', error);
      toast({
        title: "Audit Failed",
        description: "Failed to run compliance audit",
        variant: "destructive"
      });
    } finally {
      setAuditRunning(false);
    }
  };

  const updateControlStatus = async (controlId, status) => {
    try {
      await complianceAPI.updateControlStatus(controlId, status);
      toast({
        title: "Control Updated",
        description: "Control status updated successfully",
      });
      await fetchControls();
      await fetchComplianceScore();
    } catch (error) {
      console.error('Failed to update control:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update control status",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadForm({
          ...uploadForm,
          file_name: file.name,
          file_size: file.size,
          file_content: reader.result.split(',')[1] // base64
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadDocument = async () => {
    if (!uploadForm.title || !uploadForm.file_content) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields and select a file",
        variant: "destructive"
      });
      return;
    }

    try {
      await complianceAPI.uploadDocument(uploadForm);
      toast({
        title: "Document Uploaded",
        description: "Compliance document uploaded successfully",
      });
      await fetchDocuments();
      setDocumentsModalOpen(false);
      setUploadForm({
        title: '',
        description: '',
        document_type: 'policy',
        compliance_standard: '',
        file_name: '',
        file_size: 0,
        file_content: '',
        tags: []
      });
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload document",
        variant: "destructive"
      });
    }
  };

  const deleteDocument = async (docId) => {
    try {
      await complianceAPI.deleteDocument(docId);
      toast({
        title: "Document Deleted",
        description: "Compliance document deleted successfully",
      });
      await fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const downloadReport = async () => {
    try {
      const response = await complianceAPI.generateReport();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${new Date().toISOString()}.json`;
      a.click();
      toast({
        title: "Report Downloaded",
        description: "Compliance report downloaded successfully",
      });
    } catch (error) {
      console.error('Failed to download report:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download report",
        variant: "destructive"
      });
    }
  };

  const selectedTemplate = templates[selectedIndustry];
  const IndustryIcon = INDUSTRY_ICONS[selectedIndustry] || Shield;

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-yellow-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="compliance-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Compliance Center</h1>
          <p className="text-slate-400">Industry-specific security compliance management</p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadAllData} className="text-slate-400">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="audits">Audit History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Compliance Score Card */}
          {complianceScore && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      Compliance Score
                      {getTrendIcon(complianceScore.trend)}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Based on controls, threats, and audits
                    </CardDescription>
                  </div>
                  <div className="text-center">
                    <p className="text-5xl font-bold text-green-400">{complianceScore.overall_score}%</p>
                    <Badge className="mt-2 bg-slate-700 text-slate-300 capitalize">{complianceScore.trend}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Overall Compliance</span>
                      <span className="text-white">{complianceScore.overall_score}%</span>
                    </div>
                    <Progress value={complianceScore.overall_score} className="h-3 bg-slate-700" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-sm text-slate-400">Implemented</p>
                      <p className="text-2xl font-bold text-green-400">{complianceScore.controls_status.implemented}</p>
                    </div>
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-sm text-slate-400">Partial</p>
                      <p className="text-2xl font-bold text-yellow-400">{complianceScore.controls_status.partial}</p>
                    </div>
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-sm text-slate-400">Not Implemented</p>
                      <p className="text-2xl font-bold text-red-400">{complianceScore.controls_status.not_implemented}</p>
                    </div>
                  </div>

                  {/* Standards Breakdown */}
                  <div className="pt-4">
                    <h4 className="text-white font-semibold mb-3">Standards Compliance</h4>
                    <div className="space-y-3">
                      {Object.entries(complianceScore.scores_by_standard).map(([standard, score]) => (
                        <div key={standard}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-400">{standard}</span>
                            <span className="text-white">{score}%</span>
                          </div>
                          <Progress value={score} className="h-2 bg-slate-700" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <Shield className="w-8 h-8 text-cyan-400 mb-3" />
                <h3 className="text-white font-semibold mb-2">Run Audit</h3>
                <p className="text-sm text-slate-400 mb-4">Execute comprehensive compliance audit</p>
                <Button
                  onClick={runAudit}
                  disabled={auditRunning}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
                  data-testid="run-audit-btn"
                >
                  {auditRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Run Audit
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <Download className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="text-white font-semibold mb-2">Download Report</h3>
                <p className="text-sm text-slate-400 mb-4">Generate comprehensive compliance report</p>
                <Button
                  onClick={downloadReport}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300"
                  data-testid="download-report-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <FileText className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="text-white font-semibold mb-2">View Controls</h3>
                <p className="text-sm text-slate-400 mb-4">Manage security control implementation</p>
                <Button
                  onClick={() => setActiveTab('controls')}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300"
                  data-testid="view-controls-btn"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  View Controls
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Industry Templates */}
          {selectedTemplate && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Industry Compliance Framework</CardTitle>
                <CardDescription className="text-slate-400">
                  Standards and controls for your industry
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${INDUSTRY_COLORS[complianceScore?.industry || 'healthcare']} flex items-center justify-center`}>
                    <IndustryIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedTemplate.name}</h3>
                    <p className="text-slate-400 capitalize">{complianceScore?.industry || 'Industry'} Sector</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3">Applicable Standards</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.standards.map((standard, index) => (
                      <Badge key={index} className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                        <FileText className="w-3 h-3 mr-1" />
                        {standard}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Priority Threat Categories</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedTemplate.threat_priorities.map((threat, index) => (
                      <div key={threat} className="p-4 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl font-bold text-cyan-400">#{index + 1}</span>
                        </div>
                        <p className="text-white capitalize font-medium">{threat.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Controls Tab */}
        <TabsContent value="controls" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Security Controls</CardTitle>
              <CardDescription className="text-slate-400">
                Manage implementation status of security controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {controls.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No controls found. Controls will be generated based on your industry.</p>
              ) : (
                <div className="space-y-3">
                  {controls.map((control) => (
                    <div key={control.id} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-500/20 text-blue-400">{control.standard}</Badge>
                            <Badge className="bg-purple-500/20 text-purple-400 capitalize">{control.category}</Badge>
                          </div>
                          <h4 className="text-white font-semibold">{control.name}</h4>
                          <p className="text-sm text-slate-400 mt-1">{control.description}</p>
                        </div>
                        <div className="ml-4">
                          <Select
                            value={control.status}
                            onValueChange={(value) => updateControlStatus(control.id, value)}
                          >
                            <SelectTrigger className="w-40 bg-slate-800 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="implemented">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                  Implemented
                                </div>
                              </SelectItem>
                              <SelectItem value="partial">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-yellow-400" />
                                  Partial
                                </div>
                              </SelectItem>
                              <SelectItem value="not_implemented">
                                <div className="flex items-center gap-2">
                                  <XCircle className="w-4 h-4 text-red-400" />
                                  Not Implemented
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Compliance Documents</CardTitle>
                  <CardDescription className="text-slate-400">
                    Upload and manage compliance documentation
                  </CardDescription>
                </div>
                <Dialog open={documentsModalOpen} onOpenChange={setDocumentsModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 text-white">
                    <DialogHeader>
                      <DialogTitle>Upload Compliance Document</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Add a new compliance document to your repository
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Title *</Label>
                        <Input
                          value={uploadForm.title}
                          onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                          className="bg-slate-700 border-slate-600"
                          placeholder="Document title"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={uploadForm.description}
                          onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                          className="bg-slate-700 border-slate-600"
                          placeholder="Document description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Document Type *</Label>
                          <Select
                            value={uploadForm.document_type}
                            onValueChange={(value) => setUploadForm({ ...uploadForm, document_type: value })}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="policy">Policy</SelectItem>
                              <SelectItem value="procedure">Procedure</SelectItem>
                              <SelectItem value="certificate">Certificate</SelectItem>
                              <SelectItem value="audit_report">Audit Report</SelectItem>
                              <SelectItem value="risk_assessment">Risk Assessment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Compliance Standard</Label>
                          <Input
                            value={uploadForm.compliance_standard}
                            onChange={(e) => setUploadForm({ ...uploadForm, compliance_standard: e.target.value })}
                            className="bg-slate-700 border-slate-600"
                            placeholder="e.g., HIPAA"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>File *</Label>
                        <Input
                          type="file"
                          onChange={handleFileUpload}
                          className="bg-slate-700 border-slate-600"
                        />
                        {uploadForm.file_name && (
                          <p className="text-sm text-slate-400 mt-1">{uploadForm.file_name} ({(uploadForm.file_size / 1024).toFixed(2)} KB)</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={uploadDocument} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600">
                          Upload
                        </Button>
                        <Button variant="outline" onClick={() => setDocumentsModalOpen(false)} className="border-slate-600">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 bg-slate-700/50 rounded-lg flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <FileText className="w-8 h-8 text-cyan-400 flex-shrink-0" />
                        <div>
                          <h4 className="text-white font-semibold">{doc.title}</h4>
                          {doc.description && <p className="text-sm text-slate-400 mt-1">{doc.description}</p>}
                          <div className="flex gap-2 mt-2">
                            <Badge className="bg-blue-500/20 text-blue-400 text-xs capitalize">{doc.document_type.replace('_', ' ')}</Badge>
                            {doc.compliance_standard && (
                              <Badge className="bg-purple-500/20 text-purple-400 text-xs">{doc.compliance_standard}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{new Date(doc.uploaded_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDocument(doc.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audits Tab */}
        <TabsContent value="audits" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Audit History</CardTitle>
              <CardDescription className="text-slate-400">
                Review past compliance audit results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {audits.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No audits performed yet. Run your first compliance audit.</p>
              ) : (
                <div className="space-y-4">
                  {audits.map((audit) => (
                    <Card key={audit.id} className="bg-slate-700/50 border-slate-600">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-white text-lg">Audit #{audit.id.slice(0, 8)}</CardTitle>
                            <CardDescription className="text-slate-400">
                              {new Date(audit.audit_date).toLocaleString()}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-green-400">{audit.overall_score}%</p>
                            <Badge className="mt-1 bg-green-500/20 text-green-400">Completed</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-3 bg-slate-800/50 rounded">
                            <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-white">{audit.passed_controls}</p>
                            <p className="text-xs text-slate-400">Passed</p>
                          </div>
                          <div className="text-center p-3 bg-slate-800/50 rounded">
                            <XCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-white">{audit.failed_controls}</p>
                            <p className="text-xs text-slate-400">Failed</p>
                          </div>
                          <div className="text-center p-3 bg-slate-800/50 rounded">
                            <AlertTriangle className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-white">{audit.warnings}</p>
                            <p className="text-xs text-slate-400">Warnings</p>
                          </div>
                        </div>

                        {audit.findings && audit.findings.length > 0 && (
                          <div>
                            <h5 className="text-white font-semibold mb-2">Key Findings ({audit.findings.length})</h5>
                            <div className="space-y-2">
                              {audit.findings.slice(0, 3).map((finding, idx) => (
                                <div key={idx} className="p-2 bg-slate-800/50 rounded flex items-start gap-2">
                                  <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                                    finding.severity === 'critical' ? 'text-red-400' :
                                    finding.severity === 'high' ? 'text-orange-400' :
                                    'text-yellow-400'
                                  }`} />
                                  <p className="text-sm text-slate-300">{finding.message}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Compliance;
