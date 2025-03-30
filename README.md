# Blockchain Indexing Platform

A platform that allows users to set up webhooks for blockchain transactions and store the data in their PostgreSQL database.

## Features

- User authentication (login/register)
- PostgreSQL database connection setup
- Webhook creation for blockchain transactions
- Real-time transaction data storage
- Webhook management (view/delete)
- Support for multiple transaction types:
  - Transfers
  - NFT Bids

## Tech Stack

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain Integration**: Helius API
- **Authentication**: JWT-based authentication

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Helius API key
- npm or yarn package manager

## Environment Variables

1. Create a `.env` file in the `apps/api` directory:
```bash
cd apps/api
cp .env.example .env
```

```bash
cd apps/web
cp .env.example .env
```
```bash
cd packages/database
cp .env.example .env
```
2. Update the `.env` file with your actual values:
```env
# Backend
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
JWT_SECRET="your-jwt-secret"
HELIUS_API_KEY="your-helius-api-key" #login to helius get api key
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000" #add ngrok instance, used to create helius webhook

# Frontend
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
```
# Database
```bash
DATABASE_URL="postgres://postgres:mysecretpassword@localhost:5433/postgres"
```

Note: The `.env.example` file serves as a template showing required environment variables. Never commit your actual `.env` file to version control as it contains sensitive information.

## Project Structure

```
blockchain_indexing_platform/
├── apps/
│   ├── api/                 # Backend API
│   │   ├── src/
│   │   │   ├── routes/     # API routes
│   │   │   ├── services/   # Business logic
│   │   │   ├── lib/        # Utilities and configurations
│   │   │   └── middleware/ # Authentication middleware
│   │   ├── prisma/         # Prisma schema and migrations
│   │   └── package.json
│   └── web/                # Frontend application
│       ├── app/           # Next.js app directory
│       └── package.json
└── README.md
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/blockchain_indexing_platform.git
cd blockchain_indexing_platform
```

2. Install dependencies for both frontend and backend:
```bash
# Install backend dependencies
cd apps/api
cp .env .env.example
npm install

# Install frontend dependencies
cd ../web
cp .env .env.example
npm install
```
Enter variables values in .env
3. Set up Prisma:
```bash
# Navigate to the backend directory
cd packages/database
cp .env .env.example
# Install Prisma CLI
npm install

# After setting up your schema, generate Prisma Client
npx prisma generate

# Create and apply migrations
npx prisma db push

```

## Prisma Schema

The project uses the following Prisma schema:

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                Int                  @id @default(autoincrement())
  email             String               @unique
  password          String
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  postgresConnections PostgresConnection[]
  webhooks          Webhook[]
}

model PostgresConnection {
  id        Int      @id @default(autoincrement())
  host      String
  port      Int
  database  String
  username  String
  password  String
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Webhook {
  id              Int      @id @default(autoincrement())
  webhookId       String   @unique
  walletAddress   String
  transactionTypes String[]
  userId          Int
  user            User     @relation(fields: [userId], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## Running the Application

1.Backend Ngrok Setup:

Install ngrok login and add your token, after that run 
```bash
ngrok http http://localhost:5000
```
2. Fill the values of env variables.
3. Start the application:
```bash
npm run dev
```
4. Run Prisma Studio:
```bash
cd packages/database

npm run studio
```




The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Database Management

### Prisma Commands


## Usage

1. **Registration/Login**
   - Visit http://localhost:3000
   - Create a new account or login with existing credentials

2. **Setting up Database Connection**
   - After logging in, you'll be redirected to the dashboard
   - Enter your PostgreSQL database details:
     - Host
     - Port
     - Database Name
     - Username
     - Password

3. **Creating Webhooks**
   - Enter the wallet address you want to monitor
   - Select transaction types to track (Transfer, NFT Bids)
   - Click "Setup Connection & Webhook"

4. **Managing Webhooks**
   - View all your webhooks on the dashboard
   - Delete webhooks as needed
   - Monitor transaction data in your PostgreSQL database

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Database Connection
- `POST /api/postgres/connections` - Create new database connection
- `GET /api/postgres/connections/:id/tables` - Get available tables
- `GET /api/postgres/connections/:id/tables/:table/data` - Get table data

### Webhooks
- `POST /api/helius/create-webhook` - Create new webhook
- `GET /api/helius/webhooks` - Get user's webhooks
- `DELETE /api/helius/webhook/:id` - Delete webhook
- `POST /api/helius/webhook-handler`- Data coming from helius is handled by this api, to make this work in local, run it on ngrok.
## Security Considerations

- All API endpoints are protected with JWT authentication
- Database credentials are stored securely
- Webhook data is validated before processing
- HTTPS is recommended for production
- Prisma provides type safety and query validation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
6. 
## Future Modifications
1. User Postgres table connection with sockets to show user data.
2. Supporting more events from webhook in helius.
   
## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.
