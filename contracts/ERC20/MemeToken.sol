// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(_msgSender());
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }    
}

/* Library Definitions */

library SafeMath {
    function tryAdd(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        unchecked {
            uint256 c = a + b;
            if (c < a) return (false, 0);
            return (true, c);
        }
    }

    function trySub(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        unchecked {
            if (b > a) return (false, 0);
            return (true, a - b);
        }
    }

    function tryMul(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        unchecked {
            if (a == 0) return (true, 0);
            uint256 c = a * b;
            if (c / a != b) return (false, 0);
            return (true, c);
        }
    }

    function tryDiv(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        unchecked {
            if (b == 0) return (false, 0);
            return (true, a / b);
        }
    }

    function tryMod(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        unchecked {
            if (b == 0) return (false, 0);
            return (true, a % b);
        }
    }

    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        return a + b;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return a - b;
    }

    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        return a * b;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return a / b;
    }

    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return a % b;
    }

    function sub(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        unchecked {
            require(b <= a, errorMessage);
            return a - b;
        }
    }

    function div(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        unchecked {
            require(b > 0, errorMessage);
            return a / b;
        }
    }

    function mod(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        unchecked {
            require(b > 0, errorMessage);
            return a % b;
        }
    }
}


interface IUniswapV2Factory {
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256
    );

    function feeTo() external view returns (address);

    function feeToSetter() external view returns (address);

    function getPair(address tokenA, address tokenB)
        external
        view
        returns (address pair);

    function allPairs(uint256) external view returns (address pair);

    function allPairsLength() external view returns (uint256);

    function createPair(address tokenA, address tokenB)
        external
        returns (address pair);

    function setFeeTo(address) external;

    function setFeeToSetter(address) external;
}

interface IUniswapV2Pair {
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
    event Transfer(address indexed from, address indexed to, uint256 value);

    function name() external pure returns (string memory);

    function symbol() external pure returns (string memory);

    function decimals() external pure returns (uint8);

    function totalSupply() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    function DOMAIN_SEPARATOR() external view returns (bytes32);

    function PERMIT_TYPEHASH() external pure returns (bytes32);

    function nonces(address owner) external view returns (uint256);

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        address indexed to
    );
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    function MINIMUM_LIQUIDITY() external pure returns (uint256);

    function factory() external view returns (address);

    function token0() external view returns (address);

    function token1() external view returns (address);

    function getReserves()
        external
        view
        returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32 blockTimestampLast
        );

    function price0CumulativeLast() external view returns (uint256);

    function price1CumulativeLast() external view returns (uint256);

    function kLast() external view returns (uint256);

    function mint(address to) external returns (uint256 liquidity);

    function burn(address to)
        external
        returns (uint256 amount0, uint256 amount1);

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;

    function skim(address to) external;

    function sync() external;

    function initialize(address, address) external;
}

interface IUniswapV2Router02 {
    function factory() external pure returns (address);

    function WETH() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        );

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        );

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

interface IAlgebraFactory {
    function poolByPair(address tokenA, address tokenB) external view returns (address pool);
    function createPool(address tokenA, address tokenB, bytes calldata data) external returns (address pool);
    function defaultPluginFactory() external view returns (address);
    function vaultFactory() external view returns (address);
    function defaultCommunityFee() external view returns (uint16);
}

interface IAlgebraSwapRouter {
    function exactInputSingle(
        address tokenIn,
        address tokenOut,
        address recipient,
        uint256 deadline,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint160 limitSqrtPrice
    ) external payable returns (uint256 amountOut);

    function exactInput(
        bytes calldata path,
        address recipient,
        uint256 deadline,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external payable returns (uint256 amountOut);

    function exactOutputSingle(
        address tokenIn,
        address tokenOut,
        address recipient,
        uint256 deadline,
        uint256 amountOut,
        uint256 amountInMaximum,
        uint160 limitSqrtPrice
    ) external payable returns (uint256 amountIn);

    function exactOutput(
        bytes calldata path,
        address recipient,
        uint256 deadline,
        uint256 amountOut,
        uint256 amountInMaximum
    ) external payable returns (uint256 amountIn);

    function multicall(bytes[] calldata data) external payable returns (bytes[] memory results);
}

interface IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract ERC20 is Context, IERC20 {
    string private _name;
    string private _symbol;
    uint256 private _totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);

        _afterTokenTransfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
        }
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);

        _afterTokenTransfer(account, address(0), amount);
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(from, to, amount);

        uint256 senderBalance = _balances[from];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[from] = senderBalance - amount;
        }
        _balances[to] += amount;

        emit Transfer(from, to, amount);

        _afterTokenTransfer(from, to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}
}

/* Main Contract */
/* Main Contract */
contract MemeToken is IERC20, Ownable {
    using SafeMath for uint256;
    
    string public name;
    string public symbol;
    uint8 public decimals;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    IUniswapV2Router02 public uniswapRouter;
    IAlgebraSwapRouter public algebraRouter;
    address public uniswapPair;
    address public mkWallet;
    bool public isAlgebraDEX; // Flag to indicate if using Algebra DEX
    address public factoryAddress; // Store factory address for Algebra DEX
    address public wethAddress; // Store WETH/WSTT/WSOMI address

    bool public swapEnabled = false;
    bool public poolInitialized = false; // Track if pool has been initialized

    uint8 private _decimals = 18;
    uint256 public maxTxnSize;
    uint256 public swapTokensAtAmount;
    uint256 public maxWalletSize;
    uint256 public buyMarketFee;
    uint256 public sellMarketFee;
    uint256 public tokensForMarket;

    uint256 public constant MAX_TAX_RATE = 5;
    mapping(address => bool) public isBlocklisted;
    bool private swapping;
    
    // Maximum tax rate set to 5%
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        uint256 buyTax_,
        uint256 sellTax_,
        uint256 maxHoldingLimit_,
        uint256 maxBuyLimit_,
        uint256 maxSellLimit_,
        address marketingWallet_
    ) {
        name = name_;
        symbol = symbol_;
        decimals = 18; // Initialize public decimals variable
        require(buyTax_ <= MAX_TAX_RATE, "Buy tax cannot exceed 5%");
        require(sellTax_ <= MAX_TAX_RATE, "Sell tax cannot exceed 5%");
        require(maxHoldingLimit_ > 0, "Max holding limit must be greater than 0");
        require(maxBuyLimit_ > 0, "Max buy limit must be greater than 0");
        require(maxSellLimit_ > 0, "Max sell limit must be greater than 0");
        require(marketingWallet_ != address(0), "Marketing wallet cannot be zero address");

        _decimals = 18;
        mkWallet = marketingWallet_;
        buyMarketFee = buyTax_;
        sellMarketFee = sellTax_;
        
        // Set router and factory based on chain ID
        if (block.chainid == 56) { // BSC Mainnet
            uniswapRouter = IUniswapV2Router02(0x10ED43C718714eb63d5aA57B78B54704E256024E);
            isAlgebraDEX = false;
        } else if (block.chainid == 97) { // BSC Testnet
            uniswapRouter = IUniswapV2Router02(0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3);
            isAlgebraDEX = false;
        } else if (block.chainid == 1) { // Ethereum Mainnet
            uniswapRouter = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
            isAlgebraDEX = false;
        } else if (block.chainid == 11155111) { // Sepolia Testnet
            uniswapRouter = IUniswapV2Router02(0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008);
            isAlgebraDEX = false;
        } else if (block.chainid == 50312) { // Somnia Testnet - Algebra DEX
            algebraRouter = IAlgebraSwapRouter(0xaB93207d3Af2f205f60b30A5b7E4470aFD7936c0);
            factoryAddress = 0xA9e79B95F2ea2fB089B8F0744CDDA2c22eB00211; // Algebra Factory
            wethAddress = 0xDa928F6A86497b3d3571fC4c2bAD04448Cc756A9; // WSTT
            isAlgebraDEX = true;
        } else if (block.chainid == 5031) { // Somnia Mainnet - Algebra DEX
            algebraRouter = IAlgebraSwapRouter(0x1582f6f3D26658F7208A799Be46e34b1f366CE44);
            factoryAddress = 0x0ccff3D02A3a200263eC4e0Fdb5E60a56721B8Ae; // Algebra Factory
            wethAddress = 0x046EDe9564A72571df6F5e44d0405360c0f4dCab; // WSOMI
            isAlgebraDEX = true;
        } else {
            revert("Unsupported network");
        }
        
        // For UniswapV2 DEX, create pair immediately (this works fine)
        if (!isAlgebraDEX) {
            uniswapPair = IUniswapV2Factory(uniswapRouter.factory()).createPair(
                address(this), 
                uniswapRouter.WETH()
            );
        }
        // For Algebra DEX, pool will be created after deployment via initializePool()

        uint256 initialSupply = totalSupply_ * (10 ** _decimals);
        
        // Set limits
        maxTxnSize = maxBuyLimit_ * (10 ** _decimals);
        maxWalletSize = maxHoldingLimit_ * (10 ** _decimals);
        swapTokensAtAmount = (initialSupply * 5) / 1000; // 0.5% swap wallet

        // Mint initial supply
        _mint(msg.sender, initialSupply);
    }


    /* ========== ERC20 Read Methods ========== */
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    /* ========== ERC20 Write Methods ========== */
    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(from, msg.sender, currentAllowance - amount);
        }
        _transfer(from, to, amount);
        return true;
    }

    /* ========== Pool Initialization ========== */
    /**
     * @notice Initialize the Algebra pool after contract deployment
     * @dev This must be called after deployment for Algebra DEX networks
     * Can be called by anyone, but only once. This makes it safer and more user-friendly.
     */
    /**
     * @notice View function to check pool initialization status and factory configuration
     */
    function canInitializePool() external view returns (bool canInit, string memory reason) {
        if (poolInitialized) {
            return (false, "Pool already initialized");
        }
        if (!isAlgebraDEX) {
            return (false, "Not an Algebra DEX network");
        }
        if (factoryAddress == address(0)) {
            return (false, "Factory address not set");
        }
        if (wethAddress == address(0)) {
            return (false, "WETH address not set");
        }
        if (address(this) == wethAddress) {
            return (false, "Token and WETH addresses cannot be the same");
        }
        
        // Check factory configuration to understand potential issues
        try IAlgebraFactory(factoryAddress).defaultPluginFactory() returns (address pluginFactory) {
            if (pluginFactory != address(0)) {
                // Factory has plugin requirements - this might cause issues
                // Continue anyway as plugin might accept our token
            }
        } catch {
            // Can't read plugin factory, continue
        }
        
        try IAlgebraFactory(factoryAddress).vaultFactory() returns (address vault) {
            if (vault != address(0)) {
                // Factory has vault requirements - this might cause issues
                // Continue anyway as vault might be created successfully
            }
        } catch {
            // Can't read vault factory, continue
        }
        
        return (true, "");
    }
    
    /**
     * @notice Get factory configuration for debugging
     */
    function getFactoryConfig() external view returns (
        address pluginFactory,
        address vault,
        uint16 communityFee,
        bool hasPlugin,
        bool hasVault
    ) {
        if (factoryAddress == address(0)) {
            return (address(0), address(0), 0, false, false);
        }
        
        try IAlgebraFactory(factoryAddress).defaultPluginFactory() returns (address pf) {
            pluginFactory = pf;
            hasPlugin = (pf != address(0));
        } catch {
            hasPlugin = false;
        }
        
        try IAlgebraFactory(factoryAddress).vaultFactory() returns (address vf) {
            vault = vf;
            hasVault = (vf != address(0));
        } catch {
            hasVault = false;
        }
        
        try IAlgebraFactory(factoryAddress).defaultCommunityFee() returns (uint16 fee) {
            communityFee = fee;
        } catch {
            communityFee = 0;
        }
    }

    function initializePool() external {
        require(!poolInitialized, "Pool already initialized");
        require(isAlgebraDEX, "Not an Algebra DEX network");
        require(factoryAddress != address(0), "Factory address not set");
        require(wethAddress != address(0), "WETH address not set");
        require(address(this) != wethAddress, "Token and WETH addresses cannot be the same");
        
        // Check if pool already exists (check both orders)
        // Use low-level call to handle potential reverts gracefully
        address existingPool = address(0);
        
        // Try to get existing pool (check both orders)
        (bool success1, bytes memory data1) = factoryAddress.call(
            abi.encodeWithSignature("poolByPair(address,address)", address(this), wethAddress)
        );
        if (success1 && data1.length >= 32) {
            existingPool = abi.decode(data1, (address));
        }
        
        if (existingPool == address(0)) {
            // Check reverse order
            (bool success2, bytes memory data2) = factoryAddress.call(
                abi.encodeWithSignature("poolByPair(address,address)", wethAddress, address(this))
            );
            if (success2 && data2.length >= 32) {
                existingPool = abi.decode(data2, (address));
            }
        }
        
        if (existingPool != address(0)) {
            uniswapPair = existingPool;
        } else {
            // Create new pool - the factory will handle ordering (token0 < token1)
            // Additional validation before calling factory
            require(address(this) != wethAddress, "Token and WETH cannot be the same");
            require(address(this) != address(0), "Token address cannot be zero");
            require(wethAddress != address(0), "WETH address cannot be zero");
            
            // Use try-catch to properly handle revert reasons
            // The factory may revert due to:
            // 1. Plugin hook requirements (if defaultPluginFactory is configured)
            // 2. Vault creation requirements (if vaultFactory is configured)
            // 3. Other factory-specific validations
            try IAlgebraFactory(factoryAddress).createPool(address(this), wethAddress, "") returns (address pool) {
                require(pool != address(0), "Pool creation returned zero address");
                uniswapPair = pool;
            } catch Error(string memory reason) {
                // Catch revert with reason string - this gives us the actual factory error
                revert(string(abi.encodePacked("Pool creation failed: ", reason)));
            } catch (bytes memory) {
                // Catch low-level revert (require without message, custom error, etc.)
                // The factory likely reverted due to:
                // - Plugin hook requirements not met (if defaultPluginFactory is configured)
                // - Vault creation failure (if vaultFactory is configured)
                // - Other factory-specific validation failures
                revert("Pool creation failed: factory reverted (check plugin/vault requirements or factory configuration)");
            }
        }
        
        require(uniswapPair != address(0), "Pool creation failed: zero address returned");
        poolInitialized = true;
    }

    /* ========== Trading Control ========== */
    function allowTradingWithPermit(uint8 v, bytes32 r, bytes32 s) external {
        bytes32 domainHash = keccak256(
            abi.encode(
                keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                keccak256(bytes('Trading Token')),
                keccak256(bytes('1')),
                block.chainid,
                address(this)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(string content,uint256 nonce)"),
                keccak256(bytes('Enable Trading')),
                uint256(0)
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                domainHash,
                structHash                
            )
        );

        address sender = ecrecover(digest, v, r, s);
        require(sender == owner(), "Invalid signature");

        swapEnabled = true;
    }

    /* ========== Internal helpers ========== */
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from zero");
        require(to != address(0), "ERC20: transfer to zero");
        
        // Owner can always transfer, others need swapEnabled to be true
        // For Algebra DEX, also require pool to be initialized
        if (from != owner() && to != owner()) {
            require(swapEnabled, "Trading is not enabled");
            if (isAlgebraDEX) {
                require(poolInitialized, "Pool not initialized");
            }
        }
        
        uint256 fromBal = _balances[from];
        require(fromBal >= amount, "ERC20: transfer amount exceeds balance");
        
        uint256 taxAmount = 0;
        address ownerWallet = owner();
        
        // Apply buy tax: when buying from pair and recipient is not owner
        if (from == uniswapPair && to != ownerWallet && buyMarketFee > 0) {
            taxAmount = amount.mul(buyMarketFee).div(100);
        }
        // Apply sell tax: when selling to pair and sender is not owner
        else if (to == uniswapPair && from != ownerWallet && sellMarketFee > 0) {
            taxAmount = amount.mul(sellMarketFee).div(100);
        }
        
        uint256 transferAmount = amount;
        if (taxAmount > 0) {
            transferAmount = amount.sub(taxAmount);
            // Send tax to owner wallet
            unchecked {
                _balances[from] = fromBal - amount;
                _balances[ownerWallet] += taxAmount;
                _balances[to] += transferAmount;
            }
            emit Transfer(from, ownerWallet, taxAmount);
            emit Transfer(from, to, transferAmount);
        } else {
            // No tax, normal transfer
            unchecked {
                _balances[from] = fromBal - amount;
                _balances[to] += amount;
            }
            emit Transfer(from, to, amount);
        }
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "ERC20: mint to zero");
        _totalSupply = _totalSupply + amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        require(from != address(0), "ERC20: burn from zero");
        uint256 bal = _balances[from];
        require(bal >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[from] = bal - amount;
            _totalSupply = _totalSupply - amount;
        }
        emit Transfer(from, address(0), amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from zero");
        require(spender != address(0), "ERC20: approve to zero");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}