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
    uint private _chainIdFrom; // is redundant?
    uint private _chainIdTo;

    /// @dev messageHash => bool to avoid duplicate transfers
    mapping (bytes32 => bool) private _processedMessages;

    /**
    * @dev Emitted when user initiates tokens swap between chains
    * @param from Address of the token swap initiator on the primary chain
    * @param to Address of the token recipient on another chain
    * @param amount Amount of tokens to transfer
    * @param nonce Number of operations
    * @param chainIdFrom Chain id of the token sender
    * @param chainIdTo Chain id of the token recipient
    */
    event SwapInitialized (
        address indexed from,
        address indexed to,
        uint amount,
        uint nonce,
        uint chainIdFrom,
        uint chainIdTo
    );

    /// @dev Initializes the contract by setting a `validator`, `token` and a `chainIdTo`
    constructor(address validator, address token, uint chainIdTo) {
        _validator = validator;
        _token = Token(token);
        _chainIdFrom = getChainId();
        _chainIdTo = chainIdTo;
    }

    /**
    * @dev Initiates token swap, burns msg.sender tokens
    * @param to Token recipient address
    * @param amount Amount of tokens to transfer to another chain
    *
    * Requirements:
    * - `to` cannot be the zero address
    * - `amount` cannot be the zero
    *
    * Emits a {SwapInitialized} event
    */
    function swap(address to, uint amount) external {
        require(to != address(0), "Not valid address");
        require(amount > 0, "Not valid amount");

        _nonce.increment();
        uint nonce = _nonce.current();
        _token.burn(msg.sender, amount);

        emit SwapInitialized(msg.sender, to, amount, nonce, _chainIdFrom, _chainIdTo);
    }

    /**
    * @dev Mints tokens to msg.sender
    * @param from Address of the token swap initiator
    * @param to Address of the token recipient
    * @param amount Amount of tokens to mint
    * @param nonce Number of operations
    * @param chainIdFrom Chain id of the token sender
    * @param chainIdTo Chain id of the token recipient
    * @param signature Signed by validator message with the transaction info
    *
    * Requirements:
    * - Operation should be processed only once
    * - The message signer should be a 'validator' address
    */
    function redeem(address from, address to, uint amount, uint nonce, uint chainIdFrom, uint chainIdTo, bytes memory signature) external {
        bytes32 messageHash = keccak256(abi.encodePacked(from, to, amount, nonce, chainIdFrom, chainIdTo));

        require(!_processedMessages[messageHash], "Operation has been already processed");
        require(isSignValid(messageHash, signature), "Not valid data");

        _processedMessages[messageHash] = true;
        _token.mint(msg.sender, amount);

        // is event here needed?
    }

    /**
    * @dev Sets a new value of the validator
    * @param newValidator New validator address
    */
    function updateValidator(address newValidator) external onlyOwner {
        _validator = newValidator;
    }

    /**
    * @return Validator address
    */
    function getValidator() external view onlyOwner returns (address) {
        return _validator;
    }

    /**
    * @dev Creates from `messageHash` Ethereum signed message;
    * obtains the address that signed a hashed message with `signature`;
    * checks if signature is valid
    * @param messageHash Hashed message with transaction info
    * @param signature Signed by validator message
    * @return If signature is valid - true, otherwise false
    */
    function isSignValid(bytes32 messageHash, bytes memory signature) private view returns (bool) {
        address decodedValidator = messageHash.toEthSignedMessageHash().recover(signature);
        return decodedValidator == _validator;
    }

    /**
    * @return chainId Deployed contract chain id
    */
    function getChainId() private view returns (uint256 chainId) {
        assembly {
            chainId := chainid()
        }
    }

}
