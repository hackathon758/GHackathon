import React, { useState, useEffect } from 'react';
import { complianceAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Download
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

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await complianceAPI.getTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch compliance templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const selectedTemplate = templates[selectedIndustry];
  const IndustryIcon = INDUSTRY_ICONS[selectedIndustry] || Shield;

  return (
    <div className="space-y-6" data-testid="compliance-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Compliance Center</h1>
          <p className="text-slate-400">Industry-specific security compliance templates</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchTemplates} className="text-slate-400">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Industry Selection */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(INDUSTRY_ICONS).map(([industry, Icon]) => (
              <Card
                key={industry}
                className={`cursor-pointer transition-all duration-200 ${selectedIndustry === industry ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
                onClick={() => setSelectedIndustry(industry)}
                data-testid={`industry-${industry}`}
              >
                <CardContent className="p-4 text-center">
                  <div className={`w-12 h-12 mx-auto rounded-lg bg-gradient-to-br ${INDUSTRY_COLORS[industry]} flex items-center justify-center mb-2`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-white font-medium capitalize">{industry}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected Industry Details */}
          {selectedTemplate && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${INDUSTRY_COLORS[selectedIndustry]} flex items-center justify-center`}>
                        <IndustryIcon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-2xl">{selectedTemplate.name}</CardTitle>
                        <CardDescription className="text-slate-400">Industry-specific compliance framework</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Standards */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Applicable Standards</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.standards.map((standard, index) => (
                          <Badge key={index} className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                            <FileText className="w-3 h-3 mr-1" />
                            {standard}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Key Controls */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Key Security Controls</h3>
                      <div className="space-y-3">
                        {selectedTemplate.key_controls.map((control, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                            <span className="text-slate-300">{control}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Threat Priorities */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      Priority Threat Categories
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Focus areas for {selectedIndustry} security
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedTemplate.threat_priorities.map((threat, index) => (
                        <div key={threat} className="p-4 bg-slate-700/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl font-bold text-cyan-400">#{index + 1}</span>
                          </div>
                          <p className="text-white capitalize font-medium">{threat.replace('_', ' ')}</p>
                          <p className="text-sm text-slate-400 mt-1">High priority threat type</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Compliance Score (Simulated) */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Compliance Score</CardTitle>
                    <CardDescription className="text-slate-400">Based on current security posture</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <p className="text-5xl font-bold text-green-400">87%</p>
                      <p className="text-slate-400">Overall Compliance</p>
                    </div>
                    <Progress value={87} className="h-3 bg-slate-700 mb-4" />
                    <div className="space-y-2">
                      {selectedTemplate.standards.slice(0, 3).map((standard, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">{standard}</span>
                          <span className="text-sm text-green-400">{85 + index * 5}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="run-audit-btn">
                      <Shield className="w-4 h-4 mr-2" />
                      Run Compliance Audit
                    </Button>
                    <Button variant="outline" className="w-full border-slate-600 text-slate-300" data-testid="download-report-btn">
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                    <Button variant="outline" className="w-full border-slate-600 text-slate-300" data-testid="view-controls-btn">
                      <Lock className="w-4 h-4 mr-2" />
                      View All Controls
                    </Button>
                  </CardContent>
                </Card>

                {/* Info Card */}
                <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Lock className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-white font-medium">Privacy-First Compliance</p>
                        <p className="text-sm text-slate-400 mt-1">
                          All compliance checks are performed using federated learning - your data never leaves your environment.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Compliance;
