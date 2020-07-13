<script>
import {afterUpdate} from "svelte"
import css from "./style/css.js"

export let theme = null
export let baseline = null

afterUpdate(
    () => {
        document.body.style = css.vars(theme)
    }
)

;</script>

<svelte:component this={baseline} />
