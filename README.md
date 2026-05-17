This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/building-your-application/deploying) for more details.

## Docker Deployment

OpenJirZetawith a full Docker setup including the Next.js app, PostgreSQL 18.4, and Dozzle for logging.

### Prerequisites

- Docker and Docker Compose installed.
- A `.env` file based on `.env.example`.

### Services

- **Application:** http://localhost:3000
- **Database:** localhost:5432 (PostgreSQL 18.4)
- **Logs (Dozzle):** http://localhost:8888

### Quick Start

1.  **Configure Environment:**
    ```bash
    cp .env.example .env
    # Edit .env with your secrets
    ```

2.  **Build and Start:**
    ```bash
    docker-compose up -d --build
    ```

3.  **Database Setup:**
    Once the containers are running, push the schema to the Docker database:
    ```bash
    npx prisma db push
    ```

The `uploads` folder and database data are persisted using Docker volumes.

