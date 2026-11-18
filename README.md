<div align="center">

# 💼 Freelancer CRM · UI

### Know who owes you what, in any currency.

**A slick, animated React dashboard for freelancers: clients, projects and payments in one private workspace.**

[![Live Demo](https://img.shields.io/badge/🔴_Live_Demo-Freelancer_CRM-7c3aed?style=for-the-badge)](https://jessywaweru.github.io/freelancer-crm-ui/)
[![Backend](https://img.shields.io/badge/Backend_Repo-freelancer--crm--api-0f172a?style=for-the-badge&logo=github)](https://github.com/JessyWaweru/freelancer-crm-api)

![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Tailwind 4](https://img.shields.io/badge/Tailwind_4-06B6D4?logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?logo=framer&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?logo=githubpages&logoColor=white)

<sub>⏳ The API sleeps on Render's free tier, so your first login may take ~45s. After that it's snappy. ⚡</sub>

</div>

---

## ✨ Features

- 📊 **Dashboard**: outstanding, overdue, paid this month and retainer income per currency, a **30-day cash forecast** timeline, an earnings tab, and a to-do feed of everything that needs action
- ⌘ **Command palette** (`⌘K` / `Ctrl+K` / `/`): search clients, projects and invoices, create anything, jump anywhere. `G` then `D/C/P/I/S` to navigate, `N` for a new invoice
- 👥 **Clients** with a detail page: lifetime paid, what they owe now, how many days they usually take to pay, their projects and invoices
- 📁 **Projects** billed as a fixed fee, a monthly retainer, or both, with a price breakdown, retainer months you can mark paid, to-dos and notes
- 🧾 **Invoices** with tax (e.g. 16% VAT) and discounts, real PDF download and share, duplicate, void, and CSV export
- 💳 **Part payments**: record M-Pesa, bank, cash or card payments with a reference; a paid meter and activity timeline per invoice
- 🔗 **Client links**: send a link on WhatsApp or email; the client gets a clean page with the amount due, how to pay and a PDF, and you see when they opened it (`/i/<token>`, no login)
- 🔔 Reminders with desktop alerts, a bell, and badges
- 📱 Mobile-first: bottom tabs, bottom-sheet dialogs, 40px touch targets, checked down to 320px wide
- ⚡ Each page is its own code-split chunk; the PDF libraries load only when you make a PDF

## 🏗️ Architecture

```
┌──────────────────────────┐   JWT · REST   ┌──────────────────────────┐
│   freelancer-crm-ui      │ ─────────────▶ │   freelancer-crm-api     │
│ React · TS · shadcn/ui   │                │ Django REST · PostgreSQL │
└──────────────────────────┘                └──────────────────────────┘
      GitHub Pages (gh-pages)                    Render (Gunicorn)
```

## 🚀 Run it locally

```bash
git clone https://github.com/JessyWaweru/freelancer-crm-ui.git
cd freelancer-crm-ui
npm install
npm run dev                  # → http://localhost:5173/freelancer-crm-ui/
```

Point `VITE_API_BASE` in `.env` at your backend (e.g. `http://127.0.0.1:8000/api`).

## 🚢 Deploy

```bash
npm run build && npm run deploy   # publishes dist/ to GitHub Pages
```

---

<div align="center">

**Built by Jessy Bryan Waweru**: actuary by training, full-stack engineer by obsession.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/jessy-waweru-b8051a288)
[![Email](https://img.shields.io/badge/Email-EA4335?logo=gmail&logoColor=white)](mailto:bryanjessywaweru@gmail.com)
[![GitHub](https://img.shields.io/badge/More_projects-181717?logo=github)](https://github.com/JessyWaweru)

</div>
