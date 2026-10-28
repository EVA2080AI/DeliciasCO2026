# Cuenta de GitHub de este proyecto

| | |
|---|---|
| **Cuenta que se usa** | `EVA2080AI` |
| Proyecto | DeliciasCO2026 |
| Ruta en el Mac | `~/Documents/01-CLIENTES/Delicias/DeliciasCO2026` |
| Repositorio remoto | `EVA2080AI/DeliciasCO2026` |
| Rama | `main` |
| Credencial fijada en este repo | sí |

## La regla

Decisión del dueño del Mac (Sebastián Masmela) el 2026-10-28: **todos los proyectos, de clientes y
personales, trabajan con la cuenta de GitHub `EVA2080AI`. La cuenta `INSTALCOMSAS` no se usa en
ninguno** — está guardada en el `gh` de este Mac para los proyectos de ese cliente y nada más.

En este Mac, el `git push` a github.com no usa el llavero: el `~/.gitconfig` manda la credencial a
`gh auth git-credential`, así que **el token que sale es el de la cuenta activa de `gh`**, a menos
que el repo diga explícitamente cuál quiere. Por eso se fija por repo: así no depende de cuál
cuenta esté activa en ese momento.

## Cómo fijarlo (una sola vez, en este repo)

```bash
git config --local credential.https://github.com.username EVA2080AI
```

Ya está fijado en este repo.

## Cómo verificar que de verdad sale por EVA2080AI

```bash
# 1. qué usuario pide este repo
git config --get credential.https://github.com.username

# 2. qué cuenta está activa en gh (debería ser EVA2080AI)
gh auth status

# 3. prueba real de acceso, sin empujar nada
git ls-remote origin HEAD
```

Si el paso 3 responde con un SHA, la credencial sirve. Si pide usuario y contraseña o da
«Repository not found», la cuenta activa no tiene acceso: `gh auth switch --user EVA2080AI`.

---

Dato aparte, que no cambia: los commits se firman con la identidad del Mac,
`juanmasmela <sebastian689@gmail.com>` (config global de git). La cuenta de GitHub es el canal por
el que viaja el push; la identidad del commit es otra cosa y no se toca.

*Archivo generado el 2026-10-28 por Claude Code a pedido del dueño. Si cambia la regla, actualizar este
archivo en todos los proyectos.*
