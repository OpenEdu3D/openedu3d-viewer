# OpenEdu3D Viewer

Reusable Vue 3 + Three.js components for classroom-oriented 3D lesson playback.

This package is intended to be developed as the public/open-source 3D interaction layer for OpenEdu3D. It owns rendering, camera snapshots, subject-aware demo scenes, lesson-step playback, object highlighting, and object selection events.

It does not own invite-code auth, resource persistence, backend generation, or product workspace flows. Those remain in the private frontend and backend repositories.

## Scripts

- `npm run dev` starts the Vite development server for package-level demos.
- `npm run type-check` validates TypeScript and Vue SFC types.
- `npm run build` emits library bundles and declarations.

## Public API

The package exports:

- `DetailViewer` and `CardViewer` for subject-aware resource preview.
- `LessonDemoViewer` for step-based classroom playback.
- `ViewerCore` and `LessonDemoViewerCore` for thumbnail capture and lower-level integrations.
- `Subject`, `StepCard`, viewer state, camera snapshot, and lesson-scene types.

## Product Boundary

The viewer supports the OpenEdu3D MVP subjects: `math`, `biology`, and `chemistry`. Math rendering should remain DSL-oriented and controlled; this package should not execute arbitrary model-generated rendering code.
