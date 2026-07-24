# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run build:ssr` - Build for server-side rendering
- `npm run lint` - Run ESLint with auto-fix
- `npm run lint:check` - Run ESLint without fixing
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting with Prettier
- `npm run types:check` - Run TypeScript type checker

### Backend (Laravel)
- `php artisan serve` - Start Laravel development server
- `php artisan migrate` - Run database migrations
- `php artisan migrate:fresh` - Drop and re-run all migrations
- `php artisan db:seed` - Run database seeders
- `php artisan test` - Run Pest tests
- `php artisan test --filter=Feature` - Run only feature tests
- `php artisan test --filter=Unit` - Run only unit tests

### Testing
- Run a single test: `php artisan test --filter=test_method_name`
- Run tests in a specific directory: `php artisan test tests/Feature/Admin`
- Run tests with coverage: `php artisan test --coverage`

## Project Architecture

### Backend (Laravel)
- **Routing**: Defined in `routes/web.php` using Laravel routing with Inertia.js adapter
- **Controllers**: Located in `app/Http/Controllers/` - handle HTTP requests and return Inertia responses
- **Models**: Located in `app/Models/` - Eloquent models representing database tables
  - `User` - Extends Laravel's Authenticatable with role/permission methods
  - `Role` - Defines roles (admin, manager, supervisor, operator, viewer)
  - `Permission` - Defines permissions grouped by resource (users, employees, etc.)
  - `Employee` - Custom model for employee management
- **Database**: Migrations in `database/migrations/` - includes tables for users, roles, permissions, employees, and pivot tables
- **Authentication**: Uses Laravel Fortify with TwoFactorAuthenticatable trait
- **Authorization**: Custom role/permission system with methods like `hasRole()`, `hasPermission()`

### Frontend (React + Inertia.js + TypeScript)
- **Entry Point**: `resources/js/app.tsx` - Initializes Inertia.js app
- **Layouts**: 
  - `resources/js/layouts/app-layout.tsx` - Main application layout
  - `resources/js/layouts/auth-layout.tsx` - Authentication pages layout
  - `resources/js/layouts/settings/layout.tsx` - Settings pages layout
- **Pages**: Located in `resources/js/pages/` - React components rendered by Inertia.js
  - Organized by feature (employees, users, roles, permissions, settings, etc.)
  - Each page typically fetches data via props passed from Laravel controllers
- **Components**: 
  - `resources/js/components/` - Reusable UI components
  - `app-sidebar.tsx` - Main navigation sidebar
  - UI components from `@/components/ui/` (shadcn/ui based)
- **Styling**: Tailwind CSS configured in `tailwind.config.cjs` (implicit from dependencies)
- **State Management**: Primarily uses props from Laravel backend; minimal client-state (React hooks where needed)
- **Routing (Client-Side)**: Handled by Inertia.js - visits triggered by `<Link>` or `useNavigate()`

### Key Conventions
- **Inertia.js**: Controllers return `inertia('Page/Name', [data])`; frontend pages receive props via `usePage().props`
- **RBAC**: Permission checks via `$user->hasPermission('users.view')` or Blade directives
- **File Imports**: TypeScript paths mapped via `@/*` to `resources/js/*` (see tsconfig.json)
- **API Communication**: Inertia.js handles AJAX requests and partial page updates automatically
- **Forms**: Use Laravel validation via Form Requests (e.g., `EmployeeRequest`); frontend uses standard HTML forms

## Directory Structure
```
├── app/
│   ├── Http/
│   │   ├── Controllers/     # Controller logic
│   │   └── Requests/        # Form request validation
│   ├── Models/              # Eloquent models
│   └── Policies/            # Authorization policies (if any)
├── database/
│   └── migrations/          # Database schema migrations
├── resources/
│   ├── js/
│   │   ├── components/      # React components
│   │   ├── layouts/         # Page layouts
│   │   ├── pages/           # Page components (Inertia.js)
│   │   └── types/           # TypeScript type definitions
│   └── views/               # Blade templates (minimal, mostly for auth)
├── routes/
│   └── web.php              # Web routes
├── tests/
│   ├── Feature/             # Feature tests
│   └── Unit/                # Unit tests
└── ...
```

## Planning and Documentation
- When creating implementation plans, save them to the `plans/` directory
- When completing tasks related to a plan, write a walkthrough to the `walkthrough/` directory
