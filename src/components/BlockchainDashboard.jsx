// components/BlockchainDashboard.jsx - LM_OFFICER Blockchain Dashboard
import { useState, useEffect, useMemo } from 'react';
import { FaLink, FaCube, FaShieldAlt, FaClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const MOCK_BLOCKCHAIN_DATA = {
  chainId: "TAMPERCHAIN-001",
  latestBlock: 1247,
  networkStatus: "SECURE",
  totalTransactions: 8472,
  avgBlockTime: "12.4s",
  consensus: "99.8%",
  recentBlocks: [
    {
      blockHash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef12",
      blockNumber: 1247,
      timestamp: "2025-12-12T08:47:22Z",
      transactions: 14,
      tamperEvents: 2,
      validator: "LM_OFFICER_NODE_01",
      status: "VALIDATED"
    },
    {
      blockHash: "0x9f8e7d6c5b4a3210fedcba9876543210fedcba9876543210fedcba98",
      blockNumber: 1246,
      timestamp: "2025-12-12T08:46:58Z", 
      transactions: 12,
      tamperEvents: 1,
      validator: "LM_OFFICER_NODE_02",
      status: "VALIDATED"
    },
    {
      blockHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
      blockNumber: 1245,
      timestamp: "2025-12-12T08:46:34Z",
      transactions: 16,
      tamperEvents: 3,
      validator: "LM_OFFICER_NODE_01",
      status: "VALIDATED"
    }
  ],
  pendingTransactions: [
    {
      txHash: "0xpending1234567890abcdef1234567890abcdef12",
      deviceId: "UNO-ESP32-529",
      event: "TAMPER_DETECTED",
      tamperType: "MAGNETIC",
      timestamp: "2025-12-12T08:47:45Z",
      status: "PENDING"
    },
    {
      txHash: "0xpending9876543210fedcba9876543210fedcba",
      deviceId: "UNO-ESP32-147",
      event: "TAMPER_DETECTED", 
      tamperType: "TILT",
      timestamp: "2025-12-12T08:47:42Z",
      status: "PENDING"
    }
  ],
  tamperTransactions: [
    {
      txHash: "0xtx1a2b3c4d5e6f7890abcdef1234567890",
      blockNumber: 1247,
      deviceId: "UNO-ESP32-529",
      tamperType: "MAGNETIC",
      weight: "0.000 kg",
      timestamp: "2025-12-12T08:47:22Z",
      status: "CONFIRMED"
    },
    {
      txHash: "0xtx9f8e7d6c5b4a3210fedcba9876543210",
      blockNumber: 1246,
      deviceId: "UNO-ESP32-147",
      tamperType: "VIBRATION", 
      weight: "0.250 kg",
      timestamp: "2025-12-12T08:46:58Z",
      status: "CONFIRMED"
    }
  ]
};

export default function BlockchainDashboard({ currentUser, todayTamperLogs, mqttConnected }) {
  const [blockchainData, setBlockchainData] = useState(MOCK_BLOCKCHAIN_DATA);
  const [expandedTx, setExpandedTx] = useState(null);

  const isLmOfficer = currentUser?.role?.toUpperCase() === 'LM_OFFICER';

  // Simulate blockchain updates
  useEffect(() => {
    const interval = setInterval(() => {
      setBlockchainData(prev => ({
        ...prev,
        latestBlock: prev.latestBlock + 1,
        totalTransactions: prev.totalTransactions + Math.floor(Math.random() * 5) + 1,
        recentBlocks: [
          {
            ...prev.recentBlocks[0],
            blockNumber: prev.latestBlock + 1,
            timestamp: new Date().toISOString(),
            transactions: Math.floor(Math.random() * 20) + 5,
            tamperEvents: Math.floor(Math.random() * 5),
            status: "MINING"
          },
          ...prev.recentBlocks.slice(0, 1)
        ]
      }));
    }, 15000); // New block every 15s

    return () => clearInterval(interval);
  }, []);

  // Convert tamper logs to blockchain transactions
  const blockchainTxs = useMemo(() => {
    if (!todayTamperLogs) return [];
    
    return todayTamperLogs.map(log => ({
      txHash: `0x${Math.random().toString(16).substr(2, 32)}`,
      blockNumber: blockchainData.latestBlock,
      deviceId: log.device,
      tamperType: log.tamperType || 'UNKNOWN',
      weight: log.value || 'N/A',
      timestamp: new Date(log.timestamp).toISOString(),
      status: 'CONFIRMED',
      immutable: true,
      officerVerified: log.tamperType === 'Tilt' ? 'LM_OFFICER_01' : null
    })).slice(0, 10);
  }, [todayTamperLogs, blockchainData.latestBlock]);

  if (!isLmOfficer) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent mb-4">
              🛡️ TamperChain Dashboard
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
              Immutable blockchain ledger for tamper events. Every detection is permanently recorded 
              and cryptographically verified by LM Officer nodes.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/20">
              <FaLink className="text-emerald-400" />
              <span className="font-mono text-emerald-300">Chain ID: {blockchainData.chainId}</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono text-sm ${
              blockchainData.networkStatus === 'SECURE' 
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' 
                : 'bg-red-500/20 border-red-500/50 text-red-300'
            }`}>
              <FaShieldAlt />
              {blockchainData.networkStatus}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 px-4 mb-12">
        {/* Chain Stats */}
        <div className="lg:col-span-2 xl:col-span-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500/20 via-purple-600/30 to-pink-500/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <FaCube className="w-16 h-16 text-white/80 mb-4 mx-auto opacity-75 group-hover:opacity-100 transition-all" />
              <div className="text-center relative z-10">
                <div className="text-4xl md:text-5xl font-black text-white mb-2">
                  {blockchainData.latestBlock.toLocaleString()}
                </div>
                <div className="text-slate-200 font-mono text-sm uppercase tracking-wider">Latest Block</div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/20 via-emerald-600/30 to-teal-500/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <FaCheckCircle className="w-16 h-16 text-white/80 mb-4 mx-auto opacity-75 group-hover:opacity-100 transition-all" />
              <div className="text-center relative z-10">
                <div className="text-4xl md:text-5xl font-black text-white mb-2">
                  {blockchainData.totalTransactions.toLocaleString()}
                </div>
                <div className="text-slate-200 font-mono text-sm uppercase tracking-wider">Total Txs</div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-orange-500/20 via-orange-600/30 to-red-500/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <FaExclamationTriangle className="w-16 h-16 text-white/80 mb-4 mx-auto opacity-75 group-hover:opacity-100 transition-all" />
              <div className="text-center relative z-10">
                <div className="text-4xl md:text-5xl font-black text-white mb-2">
                  {blockchainTxs.length}
                </div>
                <div className="text-slate-200 font-mono text-sm uppercase tracking-wider">Tamper Events</div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500/20 via-blue-600/30 to-indigo-500/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <FaClock className="w-16 h-16 text-white/80 mb-4 mx-auto opacity-75 group-hover:opacity-100 transition-all" />
              <div className="text-center relative z-10">
                <div className="text-4xl md:text-5xl font-black text-white mb-2">
                  {blockchainData.avgBlockTime}
                </div>
                <div className="text-slate-200 font-mono text-sm uppercase tracking-wider">Block Time</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Blocks */}
        <div className="lg:col-span-2">
          <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-white/10">
              <h3 className="text-2xl font-black text-white flex items-center gap-3 mb-2">
                <FaCube className="text-3xl text-purple-300" />
                Recent Blocks
              </h3>
              <p className="text-slate-400 text-sm">Latest validated blocks containing tamper transactions</p>
            </div>
            <div className="divide-y divide-white/10">
              {blockchainData.recentBlocks.slice(0, 5).map((block, idx) => (
                <div key={block.blockHash} className="p-6 hover:bg-white/5 transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse" />
                      <div>
                        <div className="font-mono text-lg font-black text-white">#{block.blockNumber}</div>
                        <div className="font-mono text-xs text-slate-400 truncate max-w-xs" title={block.blockHash}>
                          {block.blockHash.slice(0, 16)}...
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        block.status === 'VALIDATED' 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 border' 
                          : 'bg-orange-500/20 text-orange-300 border-orange-500/50 border animate-pulse'
                      }`}>
                        {block.status}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <FaClock className="text-slate-500" />
                      <span>{new Date(block.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center font-mono text-xs">
                        {block.transactions}
                      </span>
                      <span>Txs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center font-mono text-xs">
                        {block.tamperEvents}
                      </span>
                      <span>Tamper Events</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-xs bg-white/10 px-2 py-1 rounded-full">By</span>
                      <span className="font-mono truncate">{block.validator}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tamper Transactions */}
        <div className="space-y-6">
          {/* Pending Transactions */}
          <div>
            <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10 bg-orange-500/10">
                <h4 className="text-xl font-black text-white flex items-center gap-2">
                  <FaClock className="text-orange-400" />
                  Pending Transactions ({blockchainData.pendingTransactions.length})
                </h4>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {blockchainData.pendingTransactions.map(tx => (
                  <div key={tx.txHash} className="p-4 border-b border-white/5 last:border-b-0 hover:bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-mono text-sm font-bold text-orange-400 truncate max-w-xs" title={tx.txHash}>
                        {tx.txHash.slice(0, 12)}...
                      </div>
                      <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs font-bold rounded-full animate-pulse">
                        PENDING
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">Device:</span>
                        <span className="font-semibold">{tx.deviceId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">Event:</span>
                        <span className="font-semibold text-orange-400">{tx.event}</span>
                      </div>
                      <div className="text-xs text-slate-500">{new Date(tx.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Confirmed Tamper Txs */}
          <div>
            <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10 bg-emerald-500/10">
                <h4 className="text-xl font-black text-white flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-400" />
                  Confirmed Tamper Transactions ({blockchainTxs.length})
                </h4>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {blockchainTxs.map(tx => (
                  <div 
                    key={tx.txHash} 
                    className="p-4 border-b border-white/5 last:border-b-0 hover:bg-white/5 group cursor-pointer"
                    onClick={() => setExpandedTx(expandedTx === tx.txHash ? null : tx.txHash)}
                  >
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <div className="font-mono text-sm font-bold text-emerald-400 truncate" title={tx.txHash}>
                          {tx.txHash.slice(0, 16)}...
                        </div>
                        <div className="hidden md:block text-xs text-slate-400 font-mono">
                          #{tx.blockNumber}
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full whitespace-nowrap">
                        IMMUTABLE
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300 pl-8">
                      <div>
                        <span className="font-mono text-xs">Device ID:</span>
                        <div className="font-semibold truncate">{tx.deviceId}</div>
                      </div>
                      <div>
                        <span className="font-mono text-xs">Tamper Type:</span>
                        <div className={`font-semibold px-2 py-1 rounded-full text-xs ${
                          tx.tamperType === 'MAGNETIC' ? 'bg-purple-500/20 text-purple-300' :
                          tx.tamperType === 'TILT' ? 'bg-pink-500/20 text-pink-300' :
                          tx.tamperType === 'VIBRATION' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {tx.tamperType}
                        </div>
                      </div>
                      <div>
                        <span className="font-mono text-xs">Weight:</span>
                        <div className="font-mono">{tx.weight}</div>
                      </div>
                      <div>
                        <span className="font-mono text-xs">Time:</span>
                        <div>{new Date(tx.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    {expandedTx === tx.txHash && (
                      <div className="mt-4 pt-4 border-t border-white/10 bg-white/5 rounded-2xl p-4 text-xs">
                        <div className="font-mono text-emerald-300 bg-black/20 p-3 rounded-xl">
                          <strong>Immutable Record:</strong> This tamper event is permanently etched into 
                          the blockchain. Cannot be altered or deleted. Verified by LM Officer consensus.
                        </div>
                        {tx.officerVerified && (
                          <div className="mt-3 flex items-center gap-2 text-emerald-400">
                            <FaShieldAlt />
                            <span>Officer Verified: {tx.officerVerified}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
