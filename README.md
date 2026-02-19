Wallet DApp – Blockchain based Fund Transfer System

Overview ==========================================================

A decentralized wallet application built using Solidity, Hardhat, React, and Ethers.js.
Supports deposits, withdrawals, transfers, approval logic, admin roles, and transaction logs.

Tech Stack ========================================================

- Solidity ^0.8.x
- Hardhat
- React + Vite + TypeScript
- Ethersjs
- MetaMask

Features ============================================================

- Wallet Connection (MetaMask)
- Deposit ETH into Vault
- Withdraw ETH
- Transfer Between Users
- Approval & Allowance Logic
- Admin Role Management
- Transaction Event Logs
- Reentrancy Protection
- Logout / Session Control
- Network Detection
- Auto Balance Updates

Smart Contract Functions ==================================================

deposit - Add ETH to vault
withdraw - Withdraw ETH
transfer - To Internal transfer
approve - Grant allowance
addAdmin - Add admin
getBalance - User vault balance
getContractBalance - Total vault ETH

Security Measures ========================================================

- Reentrancy Guard
- Access Control (onlyOwner)
- Input Validation
- Safe ETH Transfer using .call

How To Run ================================================================

Backend

npm install
npx hardhat node
npx hardhat compile
npx hardhat run scripts/deploy.ts --network localhost

Frontend

cd frontend
npm install
npm run dev

Account Model vs UTXO ======================================================

- Ethereum - Account Model

Ethereum uses an Account-Based Model, where each wallet address has a direct balance stored on the blockchain.
Transactions simply increase or decrease the balance of accounts.

Advantages -

.Simple balance tracking
.Easy smart contract integration
.Efficient state updates

In this project, the wallet vault uses an account model by storing balances in:

mapping(address => uint256) balances;

This allows fast lookup and controlled transfers inside the smart contract.

- Bitcoin - UTXO Model

Bitcoin uses a UTXO (Unspent Transaction Output) Model.
Instead of balances, the system tracks individual transaction outputs that are either spent or unspent.

Advantages -

.Higher privacy
.Parallel transaction validation
.Clear transaction history

Conclusion - Why & Which Account Model Was Used ============================

This wallet DApp involves:

- Role management
- Internal transfers
- Approval logic
- Admin authorization
- Vault balance tracking

These features are much easier and cleaner using an Account Model rather than managing UTXOs.

Security Considerations ====================================================

This project implements several blockchain security best practices:

- Reentrancy Guard using locked boolean
- Access Control via onlyOwner and onlyAdmin
- Input Validation for addresses and amounts
- Safe ETH Transfers using .call
- Event Logging for auditability
- Separation of Wallet ETH vs Vault ETH
- Approval Limits to prevent unauthorized spending
- Frontend Address Validation (ethers.isAddress)

These measures help prevent:

- Reentrancy attacks
- Unauthorized admin access
- Invalid transactions
- Double spending logic issues

Smart Contract Logic =================================================================

The Wallet.sol contract acts as a secure on-chain vault system.

Core Data Structures
mapping(address => uint256) balances;
mapping(address => bool) admins;
mapping(address => mapping(address => uint256)) allowances;

.balances stores each user’s deposited ETH.
.admins manages role-based access.
.allowances implements approval logic similar to ERC20.

1. Deposit Logic

Users deposit ETH into the contract using:

function deposit() public payable

-Validates non-zero amount
-Updates internal balance mapping
-Emits Deposit event

2. Withdraw Logic

function withdraw(uint256 amount)

-Checks sufficient internal balance
-Uses .call for safe ETH transfer
-Protected by noReentrant modifier

Emits Withdraw event

3. Transfer Logic

function transferTo(address to, uint256 amount)

-Transfers balance internally between users
-Prevents zero address transfers
-Emits Transfer event

4. Approval Logic

function approve(address spender, uint256 amount)
function transferFrom(address from, address to, uint256 amount)

-Enables delegated transfers
-Restricts spending based on allowance
-Reduces allowance after transfer

5. Access Control

modifier onlyOwner
modifier onlyAdmin

-Owner can manage admin roles
-Ensures controlled permission system

Add Hardhat Network to MetaMask =======================================================

Open MetaMask → Add Network → Manual Configuration:

- Network Name: Hardhat Local
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Currency Symbol: ETH
- Block Explorer URL: (leave empty)

After adding:

.Import one of the private keys shown in the Hardhat terminal.
.Use that account to interact with the DApp.

Screenshots =================================================================

## UI Screens

### Main Dashboard

![Dashboard](screenshots/dashui.jpeg)

### Deposit & Withdraw

![Deposit](screenshots/desposit.jpeg)
![Withdraw](screenshots/withdrawn.jpeg)

### Transfer Flow

![Transfer](screenshots/transferred.jpeg)

### Approval Logic

![Approval](screenshots/approval.jpeg)
![Approval Process](screenshots/approvalprocess.jpeg)

### Admin Panel

![Admin](screenshots/adminadded.jpeg)

## Architecture

![Architecture Diagram](screenshots/architecture.png)
