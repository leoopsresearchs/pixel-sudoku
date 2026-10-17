# Pixel Sudoku

Sudoku em pixel art com dificuldade progressiva, feito para jogar no tablet como app (PWA), inclusive offline.
HTML/CSS/JS puro: sem build, sem dependências.

## Progressão

| Mundo | Grade | Níveis | Dificuldade |
|---|---|---|---|
| 1 · Prado | 4x4 | 1–3 | Iniciante |
| 2 · Bosque | 6x6 | 4–8 | Aprendiz |
| 3 · Colinas | 9x9 | 9–20 | Fácil (só técnicas simples) |
| 4 · Montanhas | 9x9 | 21–35 | Médio (bloqueio de candidatos) |
| 5 · Crepúsculo | 9x9 | 36–50 | Difícil (pares e trios) |
| 6 · Estrelas | 9x9 | 51–70 | Expert (X-Wing, XY-Wing) |
| 7 · Infinito | 9x9 | 71+ | Mestre, sem fim |

Cada nível é gerado a partir de uma semente fixa (o nível 12 é sempre o mesmo puzzle), sempre com solução única
e resolvível sem chute. A dificuldade é medida por um resolvedor que usa as mesmas técnicas de uma pessoa.
Terminar um nível libera o próximo.

## Como jogar

Toque numa casa vazia: abre uma roda com os números em volta dela. Toque no número, ou, mais rápido,
segure a casa e arraste até o número sem soltar (soltar fora da roda cancela). Cada número fica sempre
no mesmo lugar da roda, como num relógio. O centro da roda apaga a casa; o botão no canto de baixo desfaz.

## Rodar no computador

```bash
npm run serve
```

Abra http://localhost:5173. Em localhost o modo offline fica desligado para as edições aparecerem na hora
(use `http://localhost:5173/?sw` para testá-lo).

```bash
npm test
```

Gera os primeiros 80 níveis e confere que todos têm solução única.

## Colocar no tablet

O PWA precisa estar num endereço **HTTPS**. Qualquer hospedagem estática serve; basta enviar a pasta inteira
(as pastas `tools/` e `.claude/` são opcionais).

- **GitHub Pages:** crie um repositório, envie os arquivos e ative *Settings → Pages* na branch `main`.
- **Netlify / Cloudflare Pages / Vercel:** arraste a pasta ou conecte o repositório, sem comando de build.

Depois, no tablet:

- **iPad (Safari):** abra o endereço → botão Compartilhar → *Adicionar à Tela de Início*.
- **Android (Chrome):** abra o endereço → menu ⋮ → *Instalar app*.

Abra uma vez com internet (para guardar o jogo e a fonte); depois funciona offline.
O progresso fica salvo no próprio aparelho.

## Atualizar uma versão publicada

Ao mudar qualquer arquivo, aumente a versão em `CACHE` no `sw.js` (ex.: `pxsudoku-v3` → `pxsudoku-v4`) para os tablets baixarem a
versão nova. Ao criar um arquivo novo, inclua-o na lista `ASSETS` do mesmo arquivo.

## Estrutura

- `js/sudoku.js`: gerador e resolvedor lógico (4x4, 6x6, 9x9)
- `js/levels.js`: curva de dificuldade por mundo
- `js/game.js`: estado da partida (valores, desfazer, conferência da solução)
- `js/main.js`: telas e controles
- `js/wheel.js`: roda de números que abre sobre a casa tocada
- `js/sprites.js`, `js/scenes.js`, `js/audio.js`: pixel art, cenários e sons chiptune (tudo gerado em código)
- `tools/make-icons.mjs`: gera os ícones PNG (`npm run icons`)
