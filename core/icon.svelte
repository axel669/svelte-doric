<script>
    import vars from "./util/vars.js"

    export let name
    export let size

    $: iconVars = {
        "icon-font-size": size,
    }
    $: [icon, base = "solid"] = (name || "").split(":")
</script>

<style>
    doric-icon {
        margin: 0px 4px;
        font-size: var(--icon-font-size);
    }
</style>

<!-- <doric-icon use:vars={iconVars} class="bi-{name}" /> -->
<doric-icon use:vars={iconVars} class="fa-{base} fa-{icon}" />
