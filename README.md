# BuloqPrice - Dorilar B2B Platformasi

O'zbekistondagi dorixonalar va distribyutor firmalar (dori yetkazib beruvchilar) o'rtasidagi B2B (business-to-business) platforma.

## Platforma haqida

BuloqPrice dorixonalarga eng arzon dori narxlarini topib, turli firmalardan bitta joyda buyurtma berishga yordam beradi. Firmalar esa Excel fayl yuklash orqali minglab dorixonalarga dorilarini taklif qilishi mumkin.

## Texnologik Stek

| Qism | Texnologiya |
|------|-------------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Zustand |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 15 + pg_trgm (fuzzy search) |
| Auth | JWT (JSON Web Tokens) |
| File Upload | Multer + XLSX parser |
| Deployment | Docker Compose |

## Loyiha Strukturasi

```
buloqprice/
├── frontend/              # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js           # Landing page
│   │   │   ├── auth/             # Login, Register
│   │   │   ├── pharmacy/         # Dorixona kabineti
│   │   │   ├── distributor/      # Firma kabineti
│   │   │   └── admin/            # Admin panel
│   │   ├── store/                # Zustand state
│   │   └── lib/                  # API utilities
│   └── Dockerfile
├── backend/               # Express.js API
│   ├── src/
│   │   ├── index.js              # Entry point
│   │   ├── routes/               # API routes
│   │   │   ├── auth.js           # Auth (login/register)
│   │   │   ├── drugs.js          # Drug catalog & search
│   │   │   ├── cart.js           # Shopping cart
│   │   │   ├── orders.js         # Order management
│   │   │   ├── distributor.js    # Distributor features
│   │   │   └── admin.js          # Admin panel
│   │   ├── middleware/           # Auth middleware
│   │   └── db/                   # Database pool, migrations, seeds
│   └── Dockerfile
└── docker-compose.yml
```

## O'rnatish (Local Development)

### 1. PostgreSQL o'rnatish
```bash
# Docker bilan
docker run -d --name buloqprice-db -e POSTGRES_DB=buloqprice -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15-alpine
```

### 2. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run migrate    # Database schema yaratish
npm run seed       # Test data qo'shish
npm run dev        # Server ishga tushurish (port 5000)
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev        # Next.js dev server (port 3000)
```

### 4. Docker bilan to'liq ishga tushirish
```bash
docker-compose up -d
```

## Default login ma'lumotlari

| Role | Email | Parol |
|------|-------|-------|
| Admin | admin@buloqprice.uz | admin123 |

## API Endpoints

### Auth
- `POST /api/auth/register` - Ro'yxatdan o'tish
- `POST /api/auth/login` - Kirish
- `GET /api/auth/me` - Profil olish

### Drugs
- `GET /api/drugs/search?q=paracetamol` - Dori qidirish (fuzzy)
- `GET /api/drugs/search?barcode=123` - Shtrix-kod bo'yicha
- `GET /api/drugs/:id/prices` - Narxlarni solishtirish

### Cart
- `GET /api/cart` - Savatcha (firma bo'yicha guruhlangan)
- `POST /api/cart` - Savatga qo'shish
- `DELETE /api/cart/:id` - O'chirish

### Orders
- `POST /api/orders` - Buyurtma berish (savatdan)
- `GET /api/orders/my-orders` - Mening buyurtmalarim
- `PATCH /api/orders/:id/status` - Status yangilash

### Distributor
- `GET /api/distributor/dashboard` - Statistika
- `GET /api/distributor/inventory` - Ombor
- `POST /api/distributor/upload-pricelist` - Excel yuklash
- `GET /api/distributor/orders` - Kelgan buyurtmalar
- `GET /api/distributor/clients` - Mijozlar bazasi

### Admin
- `GET /api/admin/moderation` - Tasdiq kutganlar
- `PATCH /api/admin/moderation/:userId` - Tasdiqlash/Rad etish
- `GET /api/admin/users` - Foydalanuvchilar
- `GET /api/admin/statistics` - Statistika

## Asosiy Xususiyatlar

- **Fuzzy Search** - Dori nomini xato yozganda ham topadi (pg_trgm)
- **Shtrix-kod bo'g'lash** - Excel yuklanganda barcode orqali auto-matching
- **Aqlli savatcha** - Turli firmalardan tanlangan dorilar auto-ajratiladi
- **Real-time status** - Buyurtma holati: pending → confirmed → shipping → delivered
- **Excel import** - Firma 1C/Excel dan narxlarni sekundlarda yangilaydi
- **Moderatsiya** - Admin litsenziyalarni tekshiradi

## Litsenziya

MIT License
