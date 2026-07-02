# Cloth Simulation

Simulação de tecido em Canvas 2D, sem framework. Projeto de estudo/diversão — não é para portfólio de emprego, é para conversa técnica com pessoas da área.

## Stack

Vanilla JS + Canvas 2D API. Sem build step, sem dependências.

## Como rodar

Abra `index.html` direto no navegador. Não precisa de servidor.

## Interação

- **Arrastar (mouse down + move)**: puxa o pano na direção do movimento.
- **Shift + arrastar**: corta constraints próximas ao cursor.

## Como funciona

- **Verlet integration**: cada ponto guarda posição atual e posição anterior; velocidade é implícita na diferença entre as duas. Não há vetor de velocidade explícito.
- **Position Based Dynamics**: as conexões entre pontos (constraints) são resolvidas iterativamente (`solverIterations` no `CONFIG`) a cada frame, não apenas uma vez — uma única passada deixa o pano elástico e instável.
- **Damping**: fricção artificial (`CONFIG.damping`) evita que o pano trema para sempre.
- **Tear**: constraints se rompem automaticamente se esticadas além de `tearDistanceMultiplier` vezes o comprimento de repouso.

## Limitações conhecidas (estado atual, v1)

- Vento é ruído senoidal por índice de ponto, não força física real baseada em normais de face.
- Sem spatial partitioning — checagem de mouse é O(n) por frame, solver é O(constraints) por iteração. Funciona bem até ~3000 pontos; além disso, precisa de quadtree ou grid hashing.
- Sem correção de `deltaTime` — física assume ~60fps via `requestAnimationFrame`; comportamento muda em telas de refresh rate diferente.

## Versionamento

Cada fase relevante do projeto é marcada com uma tag anotada (`git tag -a`), com descrição do que mudou naquela versão. Não há README por versão — o README reflete sempre o estado atual; para ver o que existia em uma versão anterior, use `git show <tag>:README.md` ou faça checkout da tag.

Tags atuais:
- `v1-esqueleto`: estrutura inicial — grid, constraints, solver Verlet, interação básica de mouse (arrastar/cortar).
