// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title WSTT (Wrapped STT)
 * @notice Canonical Wrapped STT implementation for Somnia Testnet
 * @dev Based on WETH9 standard
 */
contract WSTT {
    string public name     = "Wrapped STT";
    string public symbol   = "WSTT";
    uint8  public decimals = 18;

    event  Approval(address indexed src, address indexed guy, uint wad);
    event  Transfer(address indexed src, address indexed dst, uint wad);
    event  Deposit(address indexed dst, uint wad);
    event  Withdrawal(address indexed src, uint wad);

    mapping (address => uint)                       public  balanceOf;
    mapping (address => mapping (address => uint))  public  allowance;

    // Fallback function to accept STT
    receive() external payable {
        deposit();
    }

    fallback() external payable {
        deposit();
    }

    /**
     * @notice Wrap STT to WSTT
     * @dev Converts native STT to WSTT tokens
     */
    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Unwrap WSTT to STT
     * @dev Converts WSTT tokens back to native STT
     * @param wad Amount to unwrap
     */
    function withdraw(uint wad) public {
        require(balanceOf[msg.sender] >= wad, "Insufficient balance");
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    /**
     * @notice Get total supply of WSTT
     * @return Total supply in wei
     */
    function totalSupply() public view returns (uint) {
        return address(this).balance;
    }

    /**
     * @notice Approve spending allowance
     * @param guy Spender address
     * @param wad Amount to approve
     * @return Success boolean
     */
    function approve(address guy, uint wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }

    /**
     * @notice Transfer WSTT tokens
     * @param dst Destination address
     * @param wad Amount to transfer
     * @return Success boolean
     */
    function transfer(address dst, uint wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    /**
     * @notice Transfer WSTT tokens from approved address
     * @param src Source address
     * @param dst Destination address
     * @param wad Amount to transfer
     * @return Success boolean
     */
    function transferFrom(address src, address dst, uint wad)
        public
        returns (bool)
    {
        require(balanceOf[src] >= wad, "Insufficient balance");

        if (src != msg.sender && allowance[src][msg.sender] != type(uint).max) {
            require(allowance[src][msg.sender] >= wad, "Insufficient allowance");
            allowance[src][msg.sender] -= wad;
        }

        balanceOf[src] -= wad;
        balanceOf[dst] += wad;

        emit Transfer(src, dst, wad);

        return true;
    }
}

