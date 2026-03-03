# Testing Folder Structure

This repository uses a centralized `tests/` directory for end-to-end and future automation layers.

## Tree

```text
tests/
├── README.md
├── accessibility/
│   └── .gitkeep
├── e2e/
│   ├── admin/
│   │   └── .gitkeep
│   ├── auth/
│   │   └── .gitkeep
│   ├── critical/
│   │   └── lms-critical.spec.ts
│   ├── smoke/
│   │   └── example.spec.ts
│   ├── student/
│   │   └── .gitkeep
│   └── teacher/
│       └── .gitkeep
├── fixtures/
│   ├── data/
│   │   └── .gitkeep
│   └── files/
│       └── sample-upload.pdf
├── helpers/
│   ├── api/
│   │   └── .gitkeep
│   ├── auth/
│   │   └── .gitkeep
│   └── ui/
│       └── .gitkeep
├── performance/
│   └── .gitkeep
├── reports/
│   └── .gitkeep
├── setup/
│   └── .gitkeep
└── visual/
    └── .gitkeep
```

## Purpose

- `e2e/critical`: high-priority LMS business flows (auth, student, teacher, admin).
- `e2e/smoke`: basic platform sanity checks.
- `fixtures/files`: binary/static files for upload/download test paths.
- `fixtures/data`: JSON/CSV test payloads.
- `helpers/*`: shared test utilities, API clients, and auth setup helpers.
- `setup`: global setup/teardown hooks when needed.
- `accessibility`, `performance`, `visual`: reserved suites for specialized quality gates.
- `reports`: artifacts if you choose to store custom summaries/screenshots.

## Run

- `npm run test:e2e`
- `npm run test:e2e:critical`
- `npm run test:e2e:smoke`
