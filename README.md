# Cybersecurity Control Gap Analysis

A lightweight web app for running manual cybersecurity compliance assessments — evaluate controls against a baseline framework, automatically detect gaps, score risk, and get AI-generated remediation recommendations.

Built with React, Vite, Recharts, and the Anthropic API.

## Features

- **13 baseline security controls** across 9 categories (Access Control, Data Protection, Network Security, Incident Response, Logging & Monitoring, Change Management, Vendor Management, Security Awareness, Physical Security)
- **Manual evaluation** — mark each control Yes / Partial / No, with space for evaluator notes
- **Auto gap detection** — anything short of "Yes" is automatically flagged
- **Risk scoring** — gaps are weighted by control criticality (Critical / High / Medium / Low) to produce an overall and per-category risk score
- **Dashboard** — compliance score, risk distribution charts, and a prioritized list of the highest-risk gaps
- **AI recommendations** — generates a concise remediation suggestion for every open gap via the Anthropic API
- **Report export** — print-friendly view for saving the assessment as a PDF

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later

### Installation

```bash
git clone https://github.com/YourUsername/gap-analysis-app.git
cd gap-analysis-app
npm install
```

### Run locally

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## AI Recommendations Setup

The "Generate AI Recommendations" button calls the Anthropic API directly and requires a backend to hold the API key securely — it will not work out of the box in a purely client-side deployment. See [Anthropic's API documentation](https://docs.claude.com) for setting up a simple proxy server.

## Tech Stack

- [React](https://react.dev/) + [Vite](https://vite.dev/)
- [Recharts](https://recharts.org/) for data visualization
- [Lucide](https://lucide.dev/) for icons
- [Claude](https://www.anthropic.com/) for AI-generated recommendations

## License

This project is for personal/portfolio use.
