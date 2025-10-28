# Valmira Contracts Server

Smart contract deployment server for Valmira platform.

## Prerequisites

- Node.js (v16 or higher)
- Redis (v6 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd valmira-contracts-server
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env.development
cp .env.example .env.production
cp .env.example .env.test
```

4. Update the environment files with your configuration values.

## Development

The application consists of two main processes that need to run simultaneously:
1. The API server that handles HTTP requests
2. The worker process that handles contract deployment and verification

### Start Development Servers

Open two terminal windows:

Terminal 1 (API Server):
```bash
npm run dev
```

Terminal 2 (Worker):
```bash
npm run worker:dev
```

For debugging the API server:
```bash
npm run dev:debug
```

For debugging the worker:
```bash
npm run worker:dev:debug
```

The API server will run on port 32156 (configurable via PORT env variable), and the worker will connect to the same Redis instance to process jobs.

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Production

Build the project:
```bash
npm run build
```

In production, you'll need to run both the API server and worker. Use separate process managers (like PM2) or containers for each:

Terminal 1 (API Server):
```bash
npm start
```

Terminal 2 (Worker):
```bash
npm run worker
```

For running multiple workers (optional):
```bash
npm run worker:verification  # Runs only verification worker
```

### Using PM2 in Production

Install PM2:
```bash
npm install -g pm2
```

Start both processes:
```bash
pm2 start npm --name "valmira-api" -- start
pm2 start npm --name "valmira-worker" -- run worker
```

## Code Quality

Lint code:
```bash
npm run lint
```

Fix linting issues:
```bash
npm run lint:fix
```

Format code:
```bash
npm run format
```

## Project Structure

```
valmira-contracts-server/
├── src/
│   ├── contracts/          # Smart contract templates
│   ├── workers/           # Background workers
│   │   ├── index.js      # Worker entry point
│   │   └── verificationWorker.js  # Contract verification worker
│   ├── utils/            # Utility functions
│   └── index.js          # API server entry point
├── tests/                # Test files
├── .env.example         # Example environment variables
├── .eslintrc.js         # ESLint configuration
├── .prettierrc          # Prettier configuration
├── nodemon.json         # Nodemon configuration
└── package.json         # Project dependencies and scripts
```

## Environment Variables

See `.env.example` for all required environment variables. Key variables include:

### Core Settings
- `PORT`: API server port (default: 32156)
- `NODE_ENV`: Environment (development/production/test)

### CORS Configuration
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend URLs for CORS
  - Example: `ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com,https://www.example.com`
  - Default origins: `http://localhost:3008, http://localhost:3333, http://localhost:63325, https://valmira-frontend.vercel.app, https://valmira-dev.vercel.app, https://valmira.xyz`

### Redis Settings
- `REDIS_HOST`: Redis host address (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (optional)

### Authentication
- `JWT_SECRET`: Secret key for JWT token validation
- `JWT_EXPIRES_IN`: JWT token expiration time

### Blockchain Networks
- Network RPC URLs and API keys for each supported blockchain
- `BSC_RPC_URL`: Binance Smart Chain RPC endpoint
- `ETH_RPC_URL`: Ethereum RPC endpoint
- `SOMNIA_TESTNET_RPC_URL`: Somnia Testnet RPC endpoint
- `BSCSCAN_API_KEY`: BSCScan API key for contract verification
- `ETHERSCAN_API_KEY`: Etherscan API key for contract verification

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

MIT
