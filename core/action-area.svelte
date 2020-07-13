<script>
import Ripple from "./ripple.svelte"

export let style
let klass = ""
export {klass as class}
;</script>

<style>
action-area {
    --ripple-color: var(--ripple-normal);
    display: block;
    overflow: hidden;
    position: relative;
    cursor: pointer;
}
</style>

<action-area on:click {style} class={klass}>
    <slot />
    <Ripple />
</action-area>
