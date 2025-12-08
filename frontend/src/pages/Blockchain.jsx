import React, { useState, useEffect } from 'react';
import { blockchainAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Link2,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Hash,
  Database,
  Shield,
  FileText,
  Activity,
  Copy,
  ExternalLink
} from 'lucide-react';

const TX_TYPE_ICONS = {
  threat_recorded: Shield,
  model_update: Activity,
  incident_response: FileText,
  reputation_update: Database
};

const TX_TYPE_COLORS = {
  threat_recorded: 'bg-red-500/20 text-red-400 border-red-500/50',
  model_update: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  incident_response: 'bg-green-500/20 text-green-400 border-green-500/50',
  reputation_update: 'bg-purple-500/20 text-purple-400 border-purple-500/50'
};

const Blockchain = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchHash, setSearchHash] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await blockchainAPI.getTransactions();
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleVerify = async () => {
    if (!searchHash) return;
    setVerifying(true);
    try {
      const response = await blockchainAPI.verify(searchHash);
      setVerifyResult(response.data);
    } catch (error) {
      setVerifyResult({ verified: false, message: 'Verification failed' });
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const txByType = transactions.reduce((acc, tx) => {
    acc[tx.transaction_type] = (acc[tx.transaction_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="blockchain-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Blockchain Audit Trail</h1>
          <p className="text-slate-400">Immutable record of all security events and transactions</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchTransactions} className="text-slate-400" data-testid="refresh-blockchain-btn">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Transactions</p>
                <p className="text-3xl font-bold text-cyan-400">{transactions.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Link2 className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Threats Recorded</p>
                <p className="text-3xl font-bold text-red-400">{txByType.threat_recorded || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Model Updates</p>
                <p className="text-3xl font-bold text-blue-400">{txByType.model_update || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Incident Responses</p>
                <p className="text-3xl font-bold text-green-400">{txByType.incident_response || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verify Transaction */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="w-5 h-5" />
            Verify Transaction
          </CardTitle>
          <CardDescription className="text-slate-400">
            Enter a transaction hash to verify its authenticity on the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter transaction hash..."
                value={searchHash}
                onChange={(e) => setSearchHash(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white font-mono"
                data-testid="verify-hash-input"
              />
            </div>
            <Button 
              onClick={handleVerify} 
              disabled={verifying || !searchHash}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
              data-testid="verify-btn"
            >
              {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify'}
            </Button>
          </div>
          {verifyResult && (
            <div className={`mt-4 p-4 rounded-lg ${verifyResult.verified ? 'bg-green-500/10 border border-green-500/50' : 'bg-red-500/10 border border-red-500/50'}`}>
              <div className="flex items-center gap-2">
                {verifyResult.verified ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">Transaction Verified</span>
                  </>
                ) : (
                  <>
                    <span className="text-red-400 font-medium">{verifyResult.message}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Transaction History</CardTitle>
          <CardDescription className="text-slate-400">
            All recorded blockchain transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-700/50">
                <TableHead className="text-slate-400">Transaction</TableHead>
                <TableHead className="text-slate-400">Type</TableHead>
                <TableHead className="text-slate-400">Block</TableHead>
                <TableHead className="text-slate-400">Timestamp</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    No blockchain transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const TxIcon = TX_TYPE_ICONS[tx.transaction_type] || Link2;
                  return (
                    <TableRow key={tx.id} className="border-slate-700 hover:bg-slate-700/50" data-testid={`tx-row-${tx.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                            <Hash className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-cyan-400 font-mono text-sm truncate max-w-[150px]">
                              {tx.transaction_hash.substring(0, 16)}...
                            </p>
                            <p className="text-xs text-slate-500 font-mono truncate max-w-[150px]">
                              Data: {tx.data_hash.substring(0, 12)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={TX_TYPE_COLORS[tx.transaction_type]}>
                          <TxIcon className="w-3 h-3 mr-1" />
                          {tx.transaction_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-white font-mono">#{tx.block_number}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{formatDate(tx.timestamp)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-sm">Verified</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-white"
                            onClick={() => copyToClipboard(tx.transaction_hash)}
                            data-testid={`copy-hash-${tx.id}`}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-white"
                                onClick={() => setSelectedTx(tx)}
                                data-testid={`view-tx-${tx.id}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
                              <DialogHeader>
                                <DialogTitle className="text-white flex items-center gap-2">
                                  <Link2 className="w-5 h-5 text-cyan-400" />
                                  Transaction Details
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-1">
                                  <p className="text-sm text-slate-400">Transaction Hash</p>
                                  <p className="text-cyan-400 font-mono text-sm break-all">{selectedTx?.transaction_hash}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-slate-400">Data Hash</p>
                                  <p className="text-white font-mono text-sm break-all">{selectedTx?.data_hash}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-400">Block Number</p>
                                    <p className="text-white font-mono">#{selectedTx?.block_number}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-400">Type</p>
                                    <Badge className={TX_TYPE_COLORS[selectedTx?.transaction_type || 'threat_recorded']}>
                                      {selectedTx?.transaction_type?.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-slate-400">Timestamp</p>
                                  <p className="text-white">{formatDate(selectedTx?.timestamp)}</p>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/50">
                                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                                  <span className="text-green-400">Transaction verified on blockchain</span>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Blockchain;
