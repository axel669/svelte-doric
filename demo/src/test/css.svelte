<script>
    import {onDestroy} from "svelte"

    onDestroy(
        () => {
            console.log("gone?")
        }
    )

    const test = css`
    <style>
    body {
        background-color: blue !important;
        --test: var(--hi);
    }
    </style>
    `
;</script>

<div>
    {@html test}
</div>
