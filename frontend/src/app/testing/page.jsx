import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// 合約 ABI
const PROXY_FACTORY_ABI = [
  "function deployProxy(address implementation) external returns (address)",
  "event ProxyDeployed(address indexed proxy, address indexed implementation)"
];

const META_TRANSACTION_PROXY_ABI = [
  "function initialize(address implementation_) public",
  "function getNonce(address user) public view returns (uint256)",
  "function executeMetaTransaction(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) calldata metaTx, bytes calldata signature) external returns (bytes memory)",
  "event MetaTransactionExecuted(address indexed from, address indexed to, bytes data)"
];

const SIMPLE_TOKEN_ABI = [
  "constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _initialSupply)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)",
  "function decimals() public view returns (uint8)",
  "function totalSupply() public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)",
  "function transfer(address to, uint256 value) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function approve(address spender, uint256 value) public returns (bool)",
  "function transferFrom(address from, address to, uint256 value) public returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// 合約字節碼 (在實際應用中，這些會由編譯器產生)
const PROXY_FACTORY_BYTECODE = "0x608060405234801561001057600080fd5b50610583806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c80633a4eb688146100305761002b565b600080fd5b61005a61003e3660046101b7565b6001600160a01b03166000908152600160208190526040909120015490565b60405190815260200160405180910390f35b6100857373eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee90565b604080516001600160a01b03909216825260208201919091520160405180910390f35b6100d06100b33660046101d2565b6001600160a01b03919091166000908152602081905260409020546001600160a01b031690565b6040516001600160a01b0390911681526020016005190390f35b61012d6101003660046101d2565b6001600160a01b0391909116600090815260016020526040902080546001600160a01b031916825591506101396101a2565b50565b61014c61014736600461027d565b6101ab565b005b61014c61015c36600461039b565b604a600073eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee6001600160a01b031663eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee604a600073eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee60405160e084901b166001600160e01b031990911617905050565b6101a46101a936600461027d565b50565b565b80356001600160a01b03811681146101b257600080fd5b919050565b6000602082840312156101c957600080fd5b6101a48261019b565b6000602082840312156101e457600080fd5b6101a48261019b565b634e487b7160e01b600052604160045260246000fd5b604051601f8201601f1916810167ffffffffffffffff8111828210171561022c5761022c6101ed565b604052919050565b600067ffffffffffffffff82111561024e5761024e6101ed565b5060051b60200190565b600082601f83011261026a57600080fd5b813567ffffffffffffffff81111561028457600080fd5b6102968782838801016101ed565b83815282810190858501850192018501891015610283576102835600a165627a7a7230582053f9a8b5e51af2ae0c11740590eb4d9ec8c3b57a75c13b93c2f46e387fd1e97c0029";

const SIMPLE_TOKEN_BYTECODE = "0x608060405234801561001057600080fd5b506040516107d03803806107d08339818101604052608081101561003357600080fd5b81019080805160405193929190846401000000008211156100005760405160a790600462461bcd60e51b815260206004820152604260246044516040519382900301526000924092820192909290918260018001828460025b82821005610126576101169291908301908352805190830190830152938401938901930161008c565b50505050919050505088888681835282602052838152600260008187905550505060018155600180546001600160a01b03191690921790915560005550506103cb806101836000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c80633950935114610091578063395093511461009b57806340c10f191461009b5780635c2411fc1461009b57806370a08231146100a45780638da5cb5b146100a45780639dc29fac146100a457806395d89b4114610096578063a9059cbb14610091578063a9059cbb14610091578063dd62ed3e146100a9578063dd62ed3e146100a9575b600080fd5b6100966100b6565b6040516100889190610372565b6100966100b6565b6100966100b6565b6100966100b6565b6100966100b6565b6040516100889190610372565b6100883661010a565b60408051918252519081900360200190f35b61008a3661010a565b6040516100889190610372565b6100c3565b60405161008991906103b5565b6040516100889190610372565b6100883661010a565b60408051918252519081900360200190f35b6000610102828461035f565b90505b92915050565b90565b60008051831561000081146100005750820182810390811461000057825b11159050919050565b60008082840390508381101561000057809150509392505050565b60008061002d85516103e0565b614e08801515610000576000848401948482039350838103915082141561000057600080fd5b5050505050565b600061010184610355565b60405160608101604052806000815260200160008152602001600081525090565b818103821461010557600080fd5b5050509392505050565b60008061024485516103e0565b825186146100005790509392505050565b60006102648583610355565b6040516045906001608060405260a060405260c060405260e0604052610100604052610120604052610140604052610160604052610180604052506135ff81526020890160209091528151608060001960a0a0190160a052610240890137610260890152876000195af161000057827f000000000000000000000000000000000000000000000000000000000000000085865187526020850152604084019081526060849052608084905260a084905260c0845260e084905261010084905261012084905261014084905261016084905261018084905261000057600080fd5b9150610355610272565b8482525090610105565b811461035557600080fd5b50505090565b9181831461035557600080fd5b909250905061010557565b8284146103555760006101025761000057600080fd5b81151590506103df57600080fd5b604051610344908261035f565b606091821b6ba9059cbb00000000000000009083600401528060248301526044830152915061010557600080fd5b8382515261010557600080fd5b8682146103555760006101025761000057600080fd5b50505050505050565b8082146103555760a15b92507f7d9ef6d6c989d36817a8ecaab57bc3d510d8fa4917ca0b91cb936a9abc38625d6002600390565b604051945090600090610351565b03905061035156fea265627a7a72305820f7de7f89a92bc7f24c2d7d68ce29ded0e31c2183d6cbb3e5c69bbee27a75d5eb64736f6c634300080e0033";

// MetaTransactionProxy 字節碼省略，實際項目中應包含

// 主應用元件
const MetaTransactionApp = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [relayer, setRelayer] = useState('');
  const [relayerSigner, setRelayerSigner] = useState(null);
  const [networkId, setNetworkId] = useState(null);

  const [simpleTokenAddress, setSimpleTokenAddress] = useState('');
  const [proxyFactoryAddress, setProxyFactoryAddress] = useState('');
  const [proxyAddress, setProxyAddress] = useState('');
  
  const [tokenName, setTokenName] = useState('Test Token');
  const [tokenSymbol, setTokenSymbol] = useState('TST');
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [tokenInitialSupply, setTokenInitialSupply] = useState(1000000);
  
  const [tokenBalance, setTokenBalance] = useState('0');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [nonce, setNonce] = useState(0);
  
  const [logs, setLogs] = useState([]);

  // 添加日誌
  const addLog = (message) => {
    setLogs(prevLogs => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // 連接到 MetaMask
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3Signer = web3Provider.getSigner();
        const address = await web3Signer.getAddress();
        const network = await web3Provider.getNetwork();
        
        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(address);
        setNetworkId(network.chainId);
        
        // 預設將 relayer 設置為用戶地址，實際應用中可以使用專門的 relayer
        setRelayer(address);
        setRelayerSigner(web3Signer);
        
        addLog(`已連接到錢包: ${address}`);
        addLog(`網路 ID: ${network.chainId}`);
      } else {
        addLog('請安裝 MetaMask');
      }
    } catch (error) {
      addLog(`連接錢包錯誤: ${error.message}`);
    }
  };

  // 切換 Relayer
  const switchToRelayer = async () => {
    try {
      if (provider) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        // 假設用戶已切換帳戶
        const relayerAddress = accounts[0];
        const relayerSigner = provider.getSigner(relayerAddress);
        setRelayer(relayerAddress);
        setRelayerSigner(relayerSigner);
        addLog(`已切換 Relayer 為: ${relayerAddress}`);
      }
    } catch (error) {
      addLog(`切換 Relayer 錯誤: ${error.message}`);
    }
  };

  // 部署 SimpleToken 合約
  const deploySimpleToken = async () => {
    try {
      if (signer) {
        addLog('正在部署 SimpleToken 合約...');
        
        const tokenFactory = new ethers.ContractFactory(
          SIMPLE_TOKEN_ABI,
          SIMPLE_TOKEN_BYTECODE,
          signer
        );
        
        const tokenContract = await tokenFactory.deploy(
          tokenName,
          tokenSymbol,
          tokenDecimals,
          tokenInitialSupply
        );
        
        await tokenContract.deployed();
        
        setSimpleTokenAddress(tokenContract.address);
        addLog(`SimpleToken 已部署到地址: ${tokenContract.address}`);
        
        // 更新代幣餘額
        updateTokenBalance(tokenContract.address, account);
      }
    } catch (error) {
      addLog(`部署 SimpleToken 錯誤: ${error.message}`);
    }
  };

  // 部署 ProxyFactory 合約
  const deployProxyFactory = async () => {
    try {
      if (signer) {
        addLog('正在部署 ProxyFactory 合約...');
        
        const factoryFactory = new ethers.ContractFactory(
          PROXY_FACTORY_ABI,
          PROXY_FACTORY_BYTECODE,
          signer
        );
        
        const factoryContract = await factoryFactory.deploy();
        
        await factoryContract.deployed();
        
        setProxyFactoryAddress(factoryContract.address);
        addLog(`ProxyFactory 已部署到地址: ${factoryContract.address}`);
      }
    } catch (error) {
      addLog(`部署 ProxyFactory 錯誤: ${error.message}`);
    }
  };

  // 通過 ProxyFactory 部署代理
  const deployProxy = async () => {
    try {
      if (signer && proxyFactoryAddress && simpleTokenAddress) {
        addLog('正在部署 MetaTransactionProxy...');
        
        const factoryContract = new ethers.Contract(
          proxyFactoryAddress,
          PROXY_FACTORY_ABI,
          signer
        );
        
        const tx = await factoryContract.deployProxy(simpleTokenAddress);
        const receipt = await tx.wait();
        
        // 從事件中獲取代理地址
        const proxyDeployedEvent = receipt.events.find(e => e.event === 'ProxyDeployed');
        if (proxyDeployedEvent) {
          const proxyAddr = proxyDeployedEvent.args.proxy;
          setProxyAddress(proxyAddr);
          addLog(`MetaTransactionProxy 已部署到地址: ${proxyAddr}`);
        } else {
          addLog('無法獲取代理地址');
        }
      }
    } catch (error) {
      addLog(`部署代理錯誤: ${error.message}`);
    }
  };

  // 獲取用戶的代幣餘額
  const updateTokenBalance = async (tokenAddress, userAddress) => {
    try {
      if (provider && tokenAddress && userAddress) {
        const tokenContract = new ethers.Contract(
          tokenAddress,
          SIMPLE_TOKEN_ABI,
          provider
        );
        
        const balance = await tokenContract.balanceOf(userAddress);
        setTokenBalance(ethers.utils.formatUnits(balance, tokenDecimals));
        addLog(`更新餘額: ${ethers.utils.formatUnits(balance, tokenDecimals)} ${tokenSymbol}`);
      }
    } catch (error) {
      addLog(`獲取餘額錯誤: ${error.message}`);
    }
  };

  // 獲取用戶的 nonce
  const fetchNonce = async () => {
    try {
      if (provider && proxyAddress && account) {
        const proxyContract = new ethers.Contract(
          proxyAddress,
          META_TRANSACTION_PROXY_ABI,
          provider
        );
        
        const userNonce = await proxyContract.getNonce(account);
        setNonce(userNonce.toNumber());
        addLog(`獲取 nonce: ${userNonce.toNumber()}`);
      }
    } catch (error) {
      addLog(`獲取 nonce 錯誤: ${error.message}`);
    }
  };

  // 創建 MetaTransaction 並簽名
  const createAndSignMetaTransaction = async () => {
    try {
      if (!signer || !simpleTokenAddress || !proxyAddress || !recipientAddress || !transferAmount) {
        addLog('缺少必要信息');
        return;
      }
      
      // 首先獲取最新的 nonce
      await fetchNonce();
      
      // 準備轉帳數據
      const tokenContract = new ethers.Contract(
        simpleTokenAddress,
        SIMPLE_TOKEN_ABI,
        provider
      );
      
      const amount = ethers.utils.parseUnits(transferAmount, tokenDecimals);
      const transferData = tokenContract.interface.encodeFunctionData('transfer', [recipientAddress, amount]);
      
      // 創建 MetaTransaction 結構
      const metaTx = {
        from: account,
        to: simpleTokenAddress,
        value: 0,
        gas: 500000,
        nonce: nonce,
        data: transferData
      };
      
      // 計算 EIP-712 簽名
      const domain = {
        name: 'MetaTransactionProxy',
        version: '1',
        chainId: networkId,
        verifyingContract: proxyAddress
      };
      
      const types = {
        MetaTransaction: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'gas', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'data', type: 'bytes' }
        ]
      };
      
      // 獲取簽名
      const signature = await signer._signTypedData(domain, types, metaTx);
      
      addLog(`已創建並簽署 MetaTransaction`);
      addLog(`接收者: ${recipientAddress}`);
      addLog(`金額: ${transferAmount} ${tokenSymbol}`);
      
      // 執行 MetaTransaction
      await executeMetaTransaction(metaTx, signature);
    } catch (error) {
      addLog(`創建和簽署 MetaTransaction 錯誤: ${error.message}`);
    }
  };

  // 通過 Relayer 執行 MetaTransaction
  const executeMetaTransaction = async (metaTx, signature) => {
    try {
      if (relayerSigner && proxyAddress) {
        addLog('正在通過 Relayer 執行 MetaTransaction...');
        
        const proxyContract = new ethers.Contract(
          proxyAddress,
          META_TRANSACTION_PROXY_ABI,
          relayerSigner
        );
        
        const tx = await proxyContract.executeMetaTransaction(metaTx, signature);
        const receipt = await tx.wait();
        
        addLog(`MetaTransaction 已執行: ${receipt.transactionHash}`);
        
        // 更新餘額
        await updateTokenBalance(simpleTokenAddress, account);
        await updateTokenBalance(simpleTokenAddress, recipientAddress);
        await fetchNonce();
      }
    } catch (error) {
      addLog(`執行 MetaTransaction 錯誤: ${error.message}`);
    }
  };

  // 常規轉帳（需支付 gas）
  const regularTransfer = async () => {
    try {
      if (signer && simpleTokenAddress && recipientAddress && transferAmount) {
        addLog('正在執行常規轉帳...');
        
        const tokenContract = new ethers.Contract(
          simpleTokenAddress,
          SIMPLE_TOKEN_ABI,
          signer
        );
        
        const amount = ethers.utils.parseUnits(transferAmount, tokenDecimals);
        const tx = await tokenContract.transfer(recipientAddress, amount);
        const receipt = await tx.wait();
        
        addLog(`轉帳完成: ${receipt.transactionHash}`);
        
        // 更新餘額
        await updateTokenBalance(simpleTokenAddress, account);
        await updateTokenBalance(simpleTokenAddress, recipientAddress);
      }
    } catch (error) {
      addLog(`常規轉帳錯誤: ${error.message}`);
    }
  };

  // 執行批次操作
  const deployAll = async () => {
    await deploySimpleToken();
    await deployProxyFactory();
    // 等待部署完成
    setTimeout(async () => {
      if (simpleTokenAddress && proxyFactoryAddress) {
        await deployProxy();
      }
    }, 2000);
  };

  useEffect(() => {
    // 檢查是否可以獲取 nonce
    if (provider && proxyAddress && account) {
      fetchNonce();
    }
  }, [provider, proxyAddress, account]);

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <h1 className="text-2xl font-bold mb-6">MetaTransaction 測試前端</h1>
      
      {/* 錢包連接 */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">1. 連接錢包</h2>
        {!account ? (
          <button 
            onClick={connectWallet}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            連接 MetaMask
          </button>
        ) : (
          <div>
            <p>已連接的帳戶: <span className="font-mono">{account}</span></p>
            <p>Relayer 帳戶: <span className="font-mono">{relayer}</span></p>
            <button 
              onClick={switchToRelayer}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              切換 Relayer
            </button>
          </div>
        )}
      </div>
      
      {/* 合約部署 */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">2. 部署合約</h2>
        
        <div className="mb-4">
          <h3 className="font-medium mb-2">SimpleToken 設定</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">代幣名稱</label>
              <input 
                type="text" 
                value={tokenName}
                onChange={e => setTokenName(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-1">代幣符號</label>
              <input 
                type="text" 
                value={tokenSymbol}
                onChange={e => setTokenSymbol(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-1">小數位數</label>
              <input 
                type="number" 
                value={tokenDecimals}
                onChange={e => setTokenDecimals(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-1">初始供應量</label>
              <input 
                type="number" 
                value={tokenInitialSupply}
                onChange={e => setTokenInitialSupply(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button 
            onClick={deploySimpleToken}
            disabled={!signer}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300"
          >
            1. 部署 SimpleToken
          </button>
          
          <button 
            onClick={deployProxyFactory}
            disabled={!signer}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300"
          >
            2. 部署 ProxyFactory
          </button>
          
          <button 
            onClick={deployProxy}
            disabled={!signer || !proxyFactoryAddress || !simpleTokenAddress}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300"
          >
            3. 部署 Proxy
          </button>
          
          <button 
            onClick={deployAll}
            disabled={!signer}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            一鍵部署全部
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-1">SimpleToken 地址</label>
            <input 
              type="text" 
              value={simpleTokenAddress}
              onChange={e => setSimpleTokenAddress(e.target.value)}
              className="w-full p-2 border rounded font-mono text-sm"
            />
          </div>
          <div>
            <label className="block mb-1">ProxyFactory 地址</label>
            <input 
              type="text" 
              value={proxyFactoryAddress}
              onChange={e => setProxyFactoryAddress(e.target.value)}
              className="w-full p-2 border rounded font-mono text-sm"
            />
          </div>
          <div>
            <label className="block mb-1">Proxy 地址</label>
            <input 
              type="text" 
              value={proxyAddress}
              onChange={e => setProxyAddress(e.target.value)}
              className="w-full p-2 border rounded font-mono text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* 代幣資訊和轉帳 */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">3. 代幣操作</h2>
        
        <div className="mb-4">
          <p>當前餘額: <span className="font-bold">{tokenBalance}</span> {tokenSymbol}</p>
          <p>當前 Nonce: <span className="font-bold">{nonce}</span></p>
          <button 
            onClick={() => {
              updateTokenBalance(simpleTokenAddress, account);
              fetchNonce();
            }}
            disabled={!provider || !simpleTokenAddress || !account}
            className="mt-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100"
          >
            刷新
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1">收款地址</label>
            <input 
              type="text" 
              value={recipientAddress}
              onChange={e => setRecipientAddress(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="0x..."
            />
          </div>
          <div>
            <label className="block mb-1">轉帳金額</label>
            <input 
              type="text" 
              value={transferAmount}
              onChange={e => setTransferAmount(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="例如: 100"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={createAndSignMetaTransaction}
            disabled={!signer || !simpleTokenAddress || !proxyAddress || !recipientAddress || !transferAmount}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            MetaTransaction 轉帳 (無需 Gas)
          </button>
          
          <button 
            onClick={regularTransfer}
            disabled={!signer || !simpleTokenAddress || !recipientAddress || !transferAmount}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300"
          >
            常規轉帳 (需支付 Gas)
          </button>
        </div>
      </div>
      
      {/* 操作日誌 */}
      <div className="p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">操作日誌</h2>
        <div className="bg-gray-100 p-3 rounded max-h-80 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500">尚無日誌</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1 font-mono text-sm">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MetaTransactionApp;