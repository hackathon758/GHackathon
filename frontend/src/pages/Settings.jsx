import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Lock,
  Globe,
  Palette,
  Key,
  Mail,
  Building,
  Save,
  AlertTriangle
} from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    email_alerts: true,
    dashboard_alerts: true,
    threat_updates: true,
    weekly_digest: false,
    critical_only: false
  });
  const [security, setSecurity] = useState({
    two_factor: false,
    session_timeout: '60',
    api_access: true
  });

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="profile" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <Key className="w-4 h-4 mr-2" />
            API Access
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Profile Picture</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-2xl">
                    {getInitials(user?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" className="border-slate-600 text-slate-300">
                  Change Avatar
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Personal Information</CardTitle>
                <CardDescription className="text-slate-400">Update your profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Full Name</Label>
                    <Input
                      defaultValue={user?.full_name}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      data-testid="profile-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Email</Label>
                    <Input
                      defaultValue={user?.email}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      disabled
                      data-testid="profile-email-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Organization</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        defaultValue={user?.organization}
                        className="pl-10 bg-slate-700/50 border-slate-600 text-white"
                        data-testid="profile-org-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Role</Label>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-sm">
                      {user?.role?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Industry</Label>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                    {user?.industry?.toUpperCase()}
                  </Badge>
                </div>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="save-profile-btn">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Notification Preferences</CardTitle>
              <CardDescription className="text-slate-400">Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white font-medium">Email Alerts</p>
                    <p className="text-sm text-slate-400">Receive threat alerts via email</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.email_alerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email_alerts: checked })}
                  data-testid="email-alerts-switch"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white font-medium">Dashboard Alerts</p>
                    <p className="text-sm text-slate-400">Show alerts in the dashboard</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.dashboard_alerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, dashboard_alerts: checked })}
                  data-testid="dashboard-alerts-switch"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white font-medium">Critical Alerts Only</p>
                    <p className="text-sm text-slate-400">Only notify for critical severity threats</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.critical_only}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, critical_only: checked })}
                  data-testid="critical-only-switch"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white font-medium">Threat Intelligence Updates</p>
                    <p className="text-sm text-slate-400">Updates from federated learning network</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.threat_updates}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, threat_updates: checked })}
                  data-testid="threat-updates-switch"
                />
              </div>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="save-notifications-btn">
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Security Settings</CardTitle>
                <CardDescription className="text-slate-400">Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-white font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-slate-400">Add an extra layer of security</p>
                    </div>
                  </div>
                  <Switch
                    checked={security.two_factor}
                    onCheckedChange={(checked) => setSecurity({ ...security, two_factor: checked })}
                    data-testid="2fa-switch"
                  />
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-5 h-5 text-slate-400" />
                    <p className="text-white font-medium">Session Timeout</p>
                  </div>
                  <Select value={security.session_timeout} onValueChange={(v) => setSecurity({ ...security, session_timeout: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white" data-testid="session-timeout-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="15" className="text-white">15 minutes</SelectItem>
                      <SelectItem value="30" className="text-white">30 minutes</SelectItem>
                      <SelectItem value="60" className="text-white">1 hour</SelectItem>
                      <SelectItem value="240" className="text-white">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Current Password</Label>
                  <Input type="password" className="bg-slate-700/50 border-slate-600 text-white" data-testid="current-password-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">New Password</Label>
                  <Input type="password" className="bg-slate-700/50 border-slate-600 text-white" data-testid="new-password-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Confirm New Password</Label>
                  <Input type="password" className="bg-slate-700/50 border-slate-600 text-white" data-testid="confirm-password-input" />
                </div>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="change-password-btn">
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">API Access</CardTitle>
              <CardDescription className="text-slate-400">Manage your API keys for programmatic access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white font-medium">Enable API Access</p>
                    <p className="text-sm text-slate-400">Allow API integrations with your account</p>
                  </div>
                </div>
                <Switch
                  checked={security.api_access}
                  onCheckedChange={(checked) => setSecurity({ ...security, api_access: checked })}
                  data-testid="api-access-switch"
                />
              </div>
              {security.api_access && (
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-400 mb-2">Your API Key</p>
                  <div className="flex gap-2">
                    <Input
                      value="dctip_sk_live_••••••••••••••••••••••••"
                      className="bg-slate-800 border-slate-600 text-white font-mono"
                      readOnly
                      data-testid="api-key-display"
                    />
                    <Button variant="outline" className="border-slate-600 text-slate-300">
                      Reveal
                    </Button>
                    <Button variant="outline" className="border-slate-600 text-slate-300">
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">API Security Notice</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Keep your API key secure and never share it publicly. Regenerate immediately if compromised.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
