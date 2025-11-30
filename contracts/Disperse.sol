// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract Disperse {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    error ArrayLengthMismatch();
    error EtherTransferFailed();
    error TokenTransferFailed();
    error InsufficientEther();

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    function disperseEther(address[] calldata recipients, uint256[] calldata values)
        external
        payable
        nonReentrant
    {
        uint256 length = recipients.length;
        if (length != values.length) revert ArrayLengthMismatch();

        uint256 total = 0;
        for (uint256 i = 0; i < length; i++) {
            total += values[i];
        }
        if (total > msg.value) revert InsufficientEther();

        for (uint256 i = 0; i < length; i++) {
            (bool success, ) = recipients[i].call{value: values[i]}("");
            if (!success) revert EtherTransferFailed();
        }

        uint256 refund = msg.value - total;
        if (refund > 0) {
            (bool success, ) = msg.sender.call{value: refund}("");
            if (!success) revert EtherTransferFailed();
        }
    }

    function disperseToken(IERC20 token, address[] calldata recipients, uint256[] calldata values)
        external
        nonReentrant
    {
        uint256 length = recipients.length;
        if (length != values.length) revert ArrayLengthMismatch();

        uint256 total = 0;
        for (uint256 i = 0; i < length; i++) {
            total += values[i];
        }

        _safeTransferFrom(token, msg.sender, address(this), total);

        for (uint256 i = 0; i < length; i++) {
            _safeTransfer(token, recipients[i], values[i]);
        }
    }

    function disperseTokenSimple(IERC20 token, address[] calldata recipients, uint256[] calldata values)
        external
        nonReentrant
    {
        uint256 length = recipients.length;
        if (length != values.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < length; i++) {
            _safeTransferFrom(token, msg.sender, recipients[i], values[i]);
        }
    }

    receive() external payable {}

    function _safeTransfer(IERC20 token, address to, uint256 value) private {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function _safeTransferFrom(IERC20 token, address from, address to, uint256 value) private {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        (bool success, bytes memory returndata) = address(token).call(data);
        if (!success) revert TokenTransferFailed();
        if (returndata.length > 0 && !abi.decode(returndata, (bool))) revert TokenTransferFailed();
    }
}