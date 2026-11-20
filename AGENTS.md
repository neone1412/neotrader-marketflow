<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Research architecture
- Keep provider contracts and pure deterministic research calculations separate from UI; this allows a future licensed feed without changing detection rules.
- Demo watchlists and history are session-only React state, never persisted as user accounts; the current prototype has no connected Cloud service.
- Generate plans only through the shared research gate, including stale-data and liquidity rejection, so legacy views cannot bypass confirmation.
