<script context="module">
    // import "./event/gestures.js"

    import Dialog from "./dialog.svelte"
    import Drawer from "./drawer.svelte"
    import Portal from "./portal.svelte"
</script>

<script>
    export let theme = null
    export let baseline = null
</script>

<svelte:component this={theme} />
<svelte:component this={baseline} />

<Portal />
<Dialog />
<Drawer />
