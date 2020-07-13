<script context="module">
import CardActions from "./card/actions.svelte"
import CardContent from "./card/content.svelte"

export {CardContent, CardActions}
;</script>

<script>
export let style
let klass = ""
export {klass as class}
;</script>

<style>
card:not(.content):not(.actions) {
    display: grid;
    border-radius: 4px;
    margin: 4px;
    background-color: var(--card-background);
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.25);
    overflow: hidden;
}
</style>

<card {style} class="{klass}">
    <slot />
</card>
