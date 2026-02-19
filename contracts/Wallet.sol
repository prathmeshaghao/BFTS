// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Wallet {

    // ------------------------------------------------------------------
    // STATE VARIABLES
    // ------------------------------------------------------------------

    // Contract owner (immutable for gas optimization)
    address public immutable owner;

    // Allowance mapping (similar to ERC20 approve/transferFrom pattern)
    mapping(address => mapping(address => uint256)) public allowances;

    // Internal ledger for tracking deposited ETH per user
    mapping(address => uint256) private balances;

    // Admin access control mapping
    mapping(address => bool) public admins;

    // Simple reentrancy guard flag
    bool private locked;

    // ------------------------------------------------------------------
    // EVENTS
    // ------------------------------------------------------------------

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    // ------------------------------------------------------------------
    // CONSTRUCTOR
    // ------------------------------------------------------------------

    constructor() {
        owner = msg.sender;           
        admins[msg.sender] = true;   
    }

    // ------------------------------------------------------------------
    // MODIFIERS
    // ------------------------------------------------------------------

    // Basic reentrancy protection
    modifier noReentrant() {
        require(!locked, "Reentrant call detected");
        locked = true;
        _;
        locked = false;
    }

    // Restricts function to contract owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    // Restricts function to admin accounts
    modifier onlyAdmin() {
        require(admins[msg.sender], "Caller is not admin");
        _;
    }

    // ------------------------------------------------------------------
    // CORE WALLET FUNCTIONS
    // ------------------------------------------------------------------

    /*
        @notice Deposit ETH into contract
        @dev ETH is credited to sender's internal balance
    */
    function deposit() public payable noReentrant {
        require(msg.value > 0, "Amount must be greater than zero");

        balances[msg.sender] += msg.value;

        emit Deposit(msg.sender, msg.value);
    }

    /*
        @notice Withdraw ETH from internal balance
        @param amount Amount in wei to withdraw
        @dev Uses call() for safe ETH transfer
    */
    function withdraw(uint256 amount) public noReentrant {
        require(amount > 0, "Invalid amount");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        
        balances[msg.sender] -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");

        emit Withdraw(msg.sender, amount);
    }

    /*
        @notice Internal balance transfer between users
        @param to Recipient address
        @param amount Amount in wei
    */

    function transferTo(address to, uint256 amount) public {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
    }

    // ------------------------------------------------------------------
    // VIEW FUNCTIONS
    // ------------------------------------------------------------------

    function getBalance(address user) public view returns (uint256) {
        return balances[user];
    }

    function isAdmin(address user) public view returns (bool) {
        return admins[user];
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // ------------------------------------------------------------------
    // ADMIN MANAGEMENT
    // ------------------------------------------------------------------

    function addAdmin(address newAdmin) public onlyOwner {
        require(newAdmin != address(0), "Invalid admin address");
        admins[newAdmin] = true;
        emit AdminAdded(newAdmin);
    }

    function removeAdmin(address adminAddr) public onlyOwner {
        require(adminAddr != address(0), "Invalid admin address");
        admins[adminAddr] = false;
        emit AdminRemoved(adminAddr);
    }

    // ------------------------------------------------------------------
    // ALLOWANCE LOGIC (ERC20-style delegated spending)
    // ------------------------------------------------------------------

    function approve(address spender, uint256 amount) public {
        require(spender != address(0), "Invalid spender");

        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        require(allowances[from][msg.sender] >= amount, "Allowance exceeded");
        require(balances[from] >= amount, "Insufficient balance");

        allowances[from][msg.sender] -= amount;
        balances[from] -= amount;
        balances[to] += amount;

        emit Transfer(from, to, amount);
    }
}
