# Repository context

Read `CONTEXT.md` when naming model and annotation concepts. For component API or onboarding changes, use `README.md` as the public contract and follow `CONTRIBUTING.md` for validation.

For rendering, anchors, or loading lifecycle changes, read `docs/architecture.md`. Browser behavior tests use public Vue inputs, named v-model, events, and canvas interaction; the consumer fixture is `examples/App.vue`.

For packaging changes, validate the installed tarball with `scripts/check-package.mjs`; a successful source demo alone does not verify CSS exports or declarations. The build emits bundles first and declarations afterward so Vite cannot erase the types.

For GitHub task work, read `docs/agents/issue-tracker.md`. The approved annotation specification and acceptance tasks are under `docs/plans/model-annotations/`.

The A-layout prototype is archived on `prototype/model-annotations` as a design source. Formal code lives in `src/annotations`; keep the existing library exports compatible. Model persistence and uploads belong to the host application.
