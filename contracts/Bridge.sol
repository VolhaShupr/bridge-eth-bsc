//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./Token.sol";

contract Bridge is Ownable {

    using ECDSA for bytes32;

    using Counters for Counters.Counter;
    Counters.Counter private _nonce;

    address private _validator;
    Token private _token;
    uint private _chainIdFrom;
    uint private _chainIdTo;

    mapping (bytes32 => bool) private _processedMessages;

    event SwapInitialized (
        address indexed from,
        address indexed to,
        uint amount,
        uint nonce,
        uint chainIdFrom,
        uint chainIdTo
    );

    constructor(address validator, address token, uint chainIdTo) {
        _validator = validator;
        _token = Token(token);
        _chainIdFrom = getChainId();
        _chainIdTo = chainIdTo;
    }

    function swap(address to, uint amount) external {
        require(to != address(0), "Not valid address");
        require(amount > 0, "Not valid amount");

        _nonce.increment();
        uint nonce = _nonce.current();
        _token.burn(msg.sender, amount);

        emit SwapInitialized(msg.sender, to, amount, nonce, _chainIdFrom, _chainIdTo);
    }

    function redeem(address from, address to, uint amount, uint nonce, uint chainIdFrom, uint chainIdTo, bytes memory signature) external {
        bytes32 messageHash = keccak256(abi.encodePacked(from, to, amount, nonce, chainIdFrom, chainIdTo));

        require(!_processedMessages[messageHash], "Operation has been already processed");
        require(isSignValid(messageHash, signature), "Not valid data");

        _processedMessages[messageHash] = true;
        _token.mint(msg.sender, amount);

        // is event here needed?
    }

    function updateValidator(address newValidator) external onlyOwner {
        _validator = newValidator;
    }

    function getValidator() external view onlyOwner returns (address) {
        return _validator;
    }

    function isSignValid(bytes32 messageHash, bytes memory signature) private view returns (bool) {
        address decodedValidator = messageHash.toEthSignedMessageHash().recover(signature);
        return decodedValidator == _validator;
    }

    function getChainId() private view returns (uint256 chainId) {
        assembly {
            chainId := chainid()
        }
    }

}
