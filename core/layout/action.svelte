<script>
    import vars from "../util/vars"

    export let direction = "column"
</script>

<style>
    action-layout {
        display: flex;
        align-items: space-between;
        justify-content: space-between;
        flex-direction: var(--direction);
    }
</style>

<action-layout use:vars={{direction}}>
    <slot />
</action-layout>
