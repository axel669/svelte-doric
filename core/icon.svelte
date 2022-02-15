<script>
    import vars from "./util/vars.js"

    export let name
    export let size

    $: iconVars = {
        "icon-font-size": size,
    }
</script>

<style>
    doric-icon {
        font-size: var(--icon-font-size);
    }
</style>

<doric-icon use:vars={iconVars} class="bi-{name}" />
