Gnosis Safe Tasks
=================

Install
-------
Set correct node version (see `.nvmrc`) with [nvm](https://github.com/nvm-sh/nvm)
```bash
nvm use
```

Install requirements with yarn:
```bash
yarn
```

Quick Start
-----------
### Setup

Create `.env` file to use the commands (see `.env.sample` for more info):

- `NETWORK` - Network that should be used (e.g. `rinkeby`, `mainnet` or `custom`)
- `PK` or `MNEMONIC`- Credentials for the account that should be used
- `INFURA`- For network that use Infura based RPC
- `NODE`- RPC node for `custom` network (optional)

### Help

Use `yarn safe help <command>` to get more information about parameters of a command.

Example:
```bash
yarn safe help create
```

### Create Safe
Creates and setups a Safe proxy via the proxy factory. All parameters of the Safe `setup` method can be configured.

#### Example
This will deploy a Safe that uses the first imported account as an owner and set the threshold to 1.
```bash
yarn safe create
```

### Safe Info
Displays information about a Safe

#### Usage
```bash
yarn safe info <address>
```

### Propose Safe Transaction
Creates a proposal json file for a Safe transaction that can be shared. The name of the json file will be `<safe_tx_hash>.proposal.json` and it will be stored in the `cli_cache` folder.

#### Examples
This will create a transaction from the Safe to the target without any value or data.
```bash
yarn safe propose <address> --to <target>
```

This will create a transaction based on the sample tx input json that mints some WETH and sets an approve for it.
```bash
yarn safe propose-multi <address> tx_input.sample.json
```

### Show Proposal
Shows the information of the proposal. 
Note: This requires the proposal file created before for that Safe transaction in the `cli_cache`.

#### Usage
```bash
yarn safe show-proposal <safeTxHash>
```

### Sign Proposal
Signs a proposal with the imported account
Note: This requires the proposal file created before for that Safe transaction in the `cli_cache`.

#### Usage
```bash
yarn safe sign-proposal <safeTxHash>
```

### Submit Proposal
Submits a proposal with the imported account
Note: This requires the proposal file created before for that Safe transaction in the `cli_cache`.

#### Usage
```bash
yarn safe submit-proposal <safeTxHash>
```

### Show Transaction History
Displays the transaction history of a Safe based on events

#### Usage
```bash
yarn safe history <address>
```

Security and Liability
----------------------
All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

License
-------
All smart contracts are released under LGPL-3.0
