import { useState, useEffect } from "react";
import { ethers } from "ethers";
import walletAbi from "./contracts/walletAbi.json";
import "./App.css";

// Deployed contract address (Hardhat local network)
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  // ------------------------------------------------------------------
  // STATE MANAGEMENT
  // ------------------------------------------------------------------

  // Core blockchain objects
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  // Wallet + account state
  const [account, setAccount] = useState<string>("");
  const [balance, setBalance] = useState<string>("0"); // MetaMask balance
  const [contractBalance, setContractBalance] = useState<string>("0"); // Vault balance
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Form states
  const [amount, setAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [toAddress, setToAddress] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [spender, setSpender] = useState<string>("");
  const [approveAmount, setApproveAmount] = useState<string>("");
  const [adminAddr, setAdminAddr] = useState<string>("");

  // UI + logs
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // ------------------------------------------------------------------
  // AUTO CONNECT ON PAGE LOAD
  // ------------------------------------------------------------------

  useEffect(() => {
    const autoConnect = async () => {
      if (!window.ethereum) return;

      // Check if wallet is already connected
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length === 0) return;

      const prov = new ethers.BrowserProvider(window.ethereum);
      const sign = await prov.getSigner();
      const address = accounts[0];

      const cont = new ethers.Contract(CONTRACT_ADDRESS, walletAbi, sign);

      setProvider(prov);
      setSigner(sign);
      setContract(cont);
      setAccount(address);

      // Fetch contract vault balance
      const vaultBal = await cont.getContractBalance();
      setContractBalance(ethers.formatEther(vaultBal));

      // Fetch user wallet balance
      await fetchBalance(prov, address);

      // Load historical events
      await loadLogs();
    };

    autoConnect();
  }, []);

  // ------------------------------------------------------------------
  // CONNECT WALLET MANUALLY
  // ------------------------------------------------------------------

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");

    // Prevent Brave Wallet conflicts
    if (!window.ethereum.isMetaMask) {
      return alert("Please use MetaMask instead of Brave Wallet");
    }

    // Request wallet permissions
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });

    const prov = new ethers.BrowserProvider(window.ethereum);

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const address = accounts[0];

    const sign = await prov.getSigner();
    const cont = new ethers.Contract(CONTRACT_ADDRESS, walletAbi, sign);

    // Fetch contract ETH balance
    const vaultBal = await cont.getContractBalance();
    setContractBalance(ethers.formatEther(vaultBal));

    setProvider(prov);
    setSigner(sign);
    setContract(cont);
    setAccount(address);

    // Check if connected user is admin
    try {
      const adminStatus = await cont.isAdmin(address);
      setIsAdmin(adminStatus);
    } catch {
      setIsAdmin(false);
    }

    await fetchBalance(prov, address);
    await loadLogs();
  };

  // ------------------------------------------------------------------
  // LOAD ALL CONTRACT EVENTS
  // ------------------------------------------------------------------

  const loadLogs = async () => {
    if (!window.ethereum) return;

    const prov = new ethers.BrowserProvider(window.ethereum);
    const cont = new ethers.Contract(CONTRACT_ADDRESS, walletAbi, prov);

    // Query all major events
    const deposits = await cont.queryFilter("Deposit");
    const withdraws = await cont.queryFilter("Withdraw");
    const transfers = await cont.queryFilter("Transfer");
    const approvals = await cont.queryFilter("Approval");
    const adminAdds = await cont.queryFilter("AdminAdded");
    const adminRems = await cont.queryFilter("AdminRemoved");

    // Merge and sort by block (descending)
    const allEvents = [
      ...deposits,
      ...withdraws,
      ...transfers,
      ...approvals,
      ...adminAdds,
      ...adminRems,
    ];

    allEvents.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

    setLogs(allEvents);
  };

  // ------------------------------------------------------------------
  // FETCH METAMASK BALANCE
  // ------------------------------------------------------------------

  const fetchBalance = async (prov: ethers.BrowserProvider, addr: string) => {
    const bal = await prov.getBalance(addr);
    setBalance(ethers.formatEther(bal));
  };
  // ------------------------------------------------------------------
  // DEPOSIT ETH INTO VAULT
  // ------------------------------------------------------------------

  const deposit = async () => {
    if (!contract || !provider) return alert("Connect wallet first");

    if (!amount || Number(amount) <= 0) {
      return alert("Enter a valid deposit amount");
    }

    try {
      setLoading(true);

      // Send ETH to contract
      const tx = await contract.deposit({
        value: ethers.parseEther(amount),
      });

      await tx.wait(); // Wait for confirmation

      // Refresh balances + logs after success
      await fetchBalance(provider, account);
      await refreshVaultBalance();

      await loadLogs();

      alert("Deposit successful!");
    } catch (error) {
      console.error("Deposit failed:", error);
      alert("Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // WITHDRAW ETH FROM VAULT
  // ------------------------------------------------------------------

  const withdraw = async () => {
    if (!contract || !provider) return alert("Connect wallet first");

    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      return alert("Enter a valid withdrawal amount");
    }

    try {
      setLoading(true);

      const tx = await contract.withdraw(ethers.parseEther(withdrawAmount));

      await tx.wait();

      await fetchBalance(provider, account);
      await refreshVaultBalance();

      await loadLogs();

      alert("Withdrawal successful!");
    } catch (error) {
      console.error("Withdraw failed:", error);
      alert("Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // INTERNAL TRANSFER (VAULT BALANCE)
  // ------------------------------------------------------------------

  const transfer = async () => {
    if (!contract || !provider) return alert("Connect wallet first");

    if (!toAddress || !transferAmount)
      return alert("Enter all transfer details");

    if (!ethers.isAddress(toAddress)) return alert("Invalid recipient address");

    try {
      setLoading(true);

      const tx = await contract.transferTo(
        toAddress,
        ethers.parseEther(transferAmount),
      );

      await tx.wait();

      await fetchBalance(provider, account);
      await loadLogs();

      alert("Transfer successful!");
    } catch (error) {
      console.error("Transfer failed:", error);
      alert("Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // APPROVE SPENDER (ALLOWANCE LOGIC)
  // ------------------------------------------------------------------

  const approve = async () => {
    if (!contract) return alert("Connect wallet first");

    if (!spender || !approveAmount) return alert("Enter approval details");

    if (!ethers.isAddress(spender)) return alert("Invalid spender address");

    try {
      setLoading(true);

      const tx = await contract.approve(
        spender,
        ethers.parseEther(approveAmount),
      );

      await tx.wait();

      await loadLogs();

      alert("Approval successful!");
    } catch (error) {
      console.error("Approval failed:", error);
      alert("Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // ADD ADMIN (OWNER ONLY)
  // ------------------------------------------------------------------

  const addAdminUI = async () => {
    if (!contract) return alert("Connect wallet first");

    if (!ethers.isAddress(adminAddr)) return alert("Invalid admin address");

    try {
      setLoading(true);

      const tx = await contract.addAdmin(adminAddr);
      await tx.wait();

      await loadLogs();

      alert("Admin added successfully!");
    } catch (error) {
      console.error("Add admin failed:", error);
      alert("Transaction failed");
    } finally {
      setLoading(false);
    }
  };
  // ------------------------------------------------------------------
  // TO REFRESH VAULT BALANCEE
  // ------------------------------------------------------------------

  const refreshVaultBalance = async () => {
    if (!contract) return;

    const vaultBal = await contract.getContractBalance();
    setContractBalance(ethers.formatEther(vaultBal));
  };

  // ------------------------------------------------------------------
  // LOGOUT (REVOKE WALLET PERMISSION)
  // ------------------------------------------------------------------

  const logout = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      }

      // Reset application state
      setAccount("");
      setBalance("0");
      setLogs([]);
      setContract(null);
      setProvider(null);
      setSigner(null);

      alert("Wallet disconnected");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="app-container">
      <div className="wallet-card">
        <h2 className="app-title">Wallet DApp</h2>

        <div className="card-content">
          {/* Top Action Button */}
          {account ? (
            <button onClick={logout} className="top-btn btn-logout">
              Logout
            </button>
          ) : (
            <button onClick={connectWallet} className="top-btn btn-connect">
              Connect Wallet
            </button>
          )}

          {/* ---------------- ACCOUNT INFO SECTION ---------------- */}
          <div className="info-grid">
            <div className="info-box">
              <span>Connected Account</span>
              <p>{account || "Not Connected"}</p>
            </div>

            <div className="info-box">
              <span>Wallet Balance (MetaMask)</span>
              <p>{balance} ETH</p>
            </div>

            <div
              className={`info-box role-box ${
                isAdmin ? "role-admin" : "role-user"
              }`}
            >
              <span>User Role</span>
              <p>{isAdmin ? "Admin" : "User"}</p>
            </div>

            <div className="info-box">
              <span>Vault Balance (Contract)</span>
              <p>{contractBalance} ETH</p>
            </div>
          </div>

          <hr className="divider" />

          {/* ---------------- DEPOSIT ---------------- */}
          <div className="section">
            <h4>Deposit ETH</h4>
            <div className="form-grid">
              <input
                className="input-field"
                placeholder="Amount in ETH"
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                onClick={deposit}
                className="btn btn-green"
                disabled={!account || loading}
              >
                {loading ? "Processing..." : "Deposit"}
              </button>
            </div>
          </div>

          {/* ---------------- WITHDRAW ---------------- */}
          <div className="section">
            <h4>Withdraw ETH</h4>
            <div className="form-grid">
              <input
                className="input-field"
                placeholder="Amount in ETH"
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <button
                onClick={withdraw}
                className="btn btn-orange"
                disabled={!account || loading}
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* ---------------- TRANSFER ---------------- */}
          <div className="section">
            <h4>Internal Transfer</h4>
            <div className="form-grid">
              <input
                className="input-field full-width"
                placeholder="Recipient Address"
                onChange={(e) => setToAddress(e.target.value)}
              />
              <input
                className="input-field"
                placeholder="Amount in ETH"
                onChange={(e) => setTransferAmount(e.target.value)}
              />
              <button
                onClick={transfer}
                className="btn btn-purple"
                disabled={!account || loading}
              >
                Transfer
              </button>
            </div>
          </div>

          <hr className="divider" />

          {/* ---------------- APPROVAL ---------------- */}
          <div className="section">
            <h4>Approve Spender</h4>
            <div className="form-grid">
              <input
                className="input-field full-width"
                placeholder="Spender Address"
                onChange={(e) => setSpender(e.target.value)}
              />
              <input
                className="input-field"
                placeholder="Allowance in ETH"
                onChange={(e) => setApproveAmount(e.target.value)}
              />
              <button
                onClick={approve}
                className="btn btn-yellow"
                disabled={!account || loading}
              >
                Approve
              </button>
            </div>
          </div>

          {/* ---------------- ADMIN PANEL ---------------- */}
          {isAdmin && (
            <div className="section">
              <h4>Admin Panel</h4>
              <div className="form-grid">
                <input
                  className="input-field"
                  placeholder="New Admin Address"
                  onChange={(e) => setAdminAddr(e.target.value)}
                />
                <button
                  onClick={addAdminUI}
                  className="btn btn-blue"
                  disabled={loading}
                >
                  Add Admin
                </button>
              </div>
            </div>
          )}

          {/* ---------------- EVENT LOGS ---------------- */}
          <h4>Transaction Logs</h4>
          <div className="scroll-area">
            {logs.length === 0 && (
              <p className="no-logs">No transactions yet</p>
            )}

            {logs.map((log, i) => {
              if (!log.args) return null;

              if (log.eventName === "Deposit") {
                return (
                  <div key={i} className="log-item log-deposit">
                    Deposit — {ethers.formatEther(log.args[1])} ETH
                  </div>
                );
              }

              if (log.eventName === "Withdraw") {
                return (
                  <div key={i} className="log-item log-withdraw">
                    Withdraw — {ethers.formatEther(log.args[1])} ETH
                  </div>
                );
              }

              if (log.eventName === "Transfer") {
                return (
                  <div key={i} className="log-item log-transfer">
                    Transfer — {ethers.formatEther(log.args[2])} ETH
                  </div>
                );
              }

              if (log.eventName === "Approval") {
                return (
                  <div key={i} className="log-item log-approval">
                    Approval — {ethers.formatEther(log.args[2])} ETH
                  </div>
                );
              }

              if (log.eventName === "AdminAdded") {
                return (
                  <div key={i} className="log-item log-admin">
                    Admin Added — {log.args[0]}
                  </div>
                );
              }

              if (log.eventName === "AdminRemoved") {
                return (
                  <div key={i} className="log-item log-admin">
                    Admin Removed — {log.args[0]}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
