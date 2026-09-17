# Buxoro QR Baholash — Professional v3.0

Buxoro viloyati tibbiyot muassasalarida xizmat sifatini QR orqali baholash, murojaatlarni kuzatish va hududlar kesimida tahlil qilish uchun full-stack tizim.

## Ishga tushirish

1. Node.js 20+ va PostgreSQL tayyorlang.
2. `.env.example` dagi qiymatlarni hosting Environment Variables bo‘limiga kiriting.
3. `npm install`
4. `npm run check`
5. `npm run build`
6. `npm start`

Production uchun `DATABASE_URL`, kamida 12 belgili `ADMIN_PASSWORD` va kamida 32 belgili `SESSION_SECRET` majburiy. `PUBLIC_BASE_URL` berilsa QR havolalar shu rasmiy domen bilan yaratiladi; berilmasa joriy request origin ishlatiladi.

## v3.0 professional yangilanishlari

- Tibbiyot tizimiga mos light-first oq/moviy professional design system; dark mode saqlangan.
- Barcha asosiy sahifalar uchun yagona spacing, form, button, table, card va responsive standart.
- Mobil admin/analytics ko‘rinishi va touch targetlar yaxshilangan.
- PWA manifest, 192/512 ikonlar, service worker va offline fallback qo‘shilgan.
- Internet holati indikatori, skip-link, reduced-motion va focus accessibility qo‘shilgan.
- Static asset cache siyosati yaxshilangan.
- QR public domeni kodga qattiq bog‘lanmaydi: `PUBLIC_BASE_URL` orqali boshqariladi.
- Eski unsigned admin-session compatibility olib tashlangan; faqat imzolangan session token qabul qilinadi.
- HSTS/COOP va mavjud CSP/CSRF/rate-limit himoyalari bilan production security kuchaytirilgan.
- Tashqi yangi oynadagi havolalarga `noopener noreferrer` avtomatik qo‘llanadi.
- Print holati va QR poster oqimi saqlangan.

## Muhim

Real `ADMIN_PASSWORD`, `SESSION_SECRET` va database connection stringlarni ZIP ichiga yozmang. Ularni Railway/Vercel/hosting Environment Variables orqali kiriting. Avvalgi database ishlatilsa, undagi admin password hash saqlanadi; `ADMIN_PASSWORD` asosan yangi database birinchi ishga tushganda seed uchun ishlatiladi.
