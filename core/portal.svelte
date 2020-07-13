<script context="module">
const portalRoot = document.createElement("portal-root")

if (typeof document !== "undefined") {
    document.body.appendChild(portalRoot)
}

;</script>

<script>
import {onMount} from "svelte"

let instance

onMount(
    () => {
        portalRoot.appendChild(instance)
    }
)
;</script>

<portal-element bind:this={instance}>
    <slot />
</portal-element>
