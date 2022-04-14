# 5 Cross-chain bridge between Ethereum chain and Binance smart chain
Sample contract

Contract links:
- [eth token](https://rinkeby.etherscan.io/token/0x08da338ec0947ac3f504abde37a7dbbc856a3ed1)
- [eth bridge](https://rinkeby.etherscan.io/address/0x443bE519D2298d108CbD8725b0512Dcf42dcD05b)
- [bsc token](https://testnet.bscscan.com/token/0x6E0fFC8a3Ae5776C3893Aa06Eee2E61bCDfA5B09)
- [bsc bridge](https://testnet.bscscan.com/address/0xc1bFcC6BF60Cd3fFD10f5C891F0FfA8C76E28388)

```shell
npx hardhat accounts
npx hardhat grantMinterRole
npx hardhat swap
npx hardhat redeem

npx hardhat run --network rinkeby scripts/bridge-eth.deploy.ts
npx hardhat run --network bscTestnet scripts/token-bcs.deploy.ts
npx hardhat run --network bscTestnet scripts/bridge-bcs.deploy.ts
npx hardhat verify --network rinkeby DEPLOYED_CONTRACT_ADDRESS <arg>

npx hardhat test
npx hardhat coverage
npx hardhat size-contracts

npx hardhat help
npx hardhat node
npx hardhat compile
npx hardhat clean
```
