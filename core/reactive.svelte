<script context="module">
    const context = Symbol("react context")
</script>

<script>
    import { setContext, getContext } from "svelte"
    import { writable } from "svelte/store"

    export let area = false

    const childVisible = writable(false)
    const visible = getContext(context) ?? writable(false)
    setContext(context, childVisible)

    const show = (func, time = 2500) =>
        (...args) => {
            $childVisible = time !== false
            func?.(...args, hide)

            if (typeof time !== "number") {
                return
            }
            setTimeout(
                () => $childVisible = false,
                time
            )
        }
    const hide = () => $childVisible = false
</script>

<style>
    react-area {
        display: none;
    }
    react-area.visible {
        display: inline-grid;
    }
</style>

{#if area === false}
    <slot {show} {hide} visible={$childVisible} />
{:else}
    <react-area class:visible={$visible}>
        <slot />
    </react-area>
{/if}
