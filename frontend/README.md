# Frontend README
# DecoNetwork - Custom Product Commerce Platform

Modern React/TypeScript frontend for the DecoNetwork platform.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Features

- React Router navigation
- Zustand state management
- Tailwind CSS styling
- JWT authentication
- Axios HTTP client
- TypeScript type safety

## Pages

- Home - Landing page
- Products - Product catalog
- Designs - Design management
- Designer - Canvas editor
- Cart - Shopping cart
- Checkout - Order completion
- Orders - Order history
- Production - Admin dashboard

## Environment

Create `.env.development.local`:
```
VITE_API_URL=http://localhost:3000/api
```

## Structure

```
src/
├── stores/        # Zustand stores (auth, cart)
├── lib/           # Utilities (API client)
├── components/    # React components
├── pages/         # Page components
├── App.tsx        # Router
└── main.tsx       # Entry point
```

## Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview build locally
- `npm run lint` - ESLint check
- `npm run format` - Prettier format
- `npm run type-check` - TypeScript check

## Dependencies

- React 18.2
- React Router 6.20
- Axios 1.6
- Zustand 4.4
- Tailwind CSS 3.3
- Vite 5.0
