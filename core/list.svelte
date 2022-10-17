<script>
    import Header from "./list/header.svelte"
    import Footer from "./list/footer.svelte"
    import Body from "./list/body.svelte"

    export let clickable
    export let cols
    export let data
    export let title

    export let body = Body
    export let header = Header
    export let footer = Footer

    export let page = 0
    export let pageSize = null

    export let flat = false
    export let square = false
</script>

<style>
    doric-list {
        display: flex;
        flex-direction: column;
        overflow: auto;
        border: 1px solid var(--layer-border-color);
        border-radius: 4px;
    }
    doric-list.flat {
        border-width: 0px;
    }
    doric-list.square {
        border-radius: 0px;
    }
</style>

<doric-list class:flat class:square>
    <svelte:component this={header} {title} {cols} {data} />
    <svelte:component
        this={body}
        {data}
        {cols}
        {clickable}
        {page}
        {pageSize}
        on:tap
    />
    <svelte:component this={footer} {data} {pageSize} bind:page />
</doric-list>
