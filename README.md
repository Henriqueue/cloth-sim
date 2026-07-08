# Cloth Simulation

Cloth simulation using 2D Canvas, without frameworks. A project for learning and fun.

## Stack

Vanilla JS + Canvas 2D API. No build step, no dependencies.

## How to run

Open `index.html` directly in your browser. No server required.

## Interaction

- **Drag (mouse down + move)**: pulls the cloth in the direction of movement.
- **Shift + drag**: cuts constraints near the cursor.

## How it works

- **Verlet integration**: each point stores its current and previous positions; velocity is implicit in the difference between the two. There is no explicit velocity vector.
- **Position Based Dynamics**: connections between points (constraints) are resolved iteratively (`solverIterations` in `CONFIG`) every frame, rather than just once—a single pass makes the cloth elastic and unstable.
- **Damping**: artificial friction (`CONFIG.damping`) prevents the cloth from shaking indefinitely.
- **Tear**: constraints break automatically if stretched beyond `tearDistanceMultiplier` times their resting length.

## Known limitations (current state, v1)

- Wind is simulated as sinusoidal noise based on point index, not as a true physical force based on face normals.
- No spatial partitioning—mouse checking is O(n) per frame, and the solver is O(constraints) per iteration. It works well up to ~3000 points; beyond that, a quadtree or grid hashing would be needed.
- No `deltaTime` correction—physics assumes ~60fps via `requestAnimationFrame`; behavior changes on screens with different refresh rates.

## Versioning

Each significant phase of the project is marked with an annotated tag (`git tag -a`), including a description of changes in that version. There is no per-version README—the README always reflects the current state; to view the state of a previous version, use `git show <tag>:README.md` or check out the tag. Current tags:
- `v1-skeleton`: initial structure — grid, constraints, Verlet solver, basic mouse interaction (drag/cut).
