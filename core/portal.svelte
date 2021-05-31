<script context="module">
    let portalRoot = null

    if (typeof document !== "undefined") {
        portalRoot = document.createElement("portal-root")
        document.body.appendChild(portalRoot)
    }
</script>

<script>
    import {onMount} from "svelte"

    let instance

    onMount(
        () => {
            portalRoot?.appendChild(instance)
        }
    )
</script>

<portal-element bind:this={instance}>
    <slot />
</portal-element>
