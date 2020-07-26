<script>
export let actions
export let layout = null
export let style = ""
let klass = ""
export {klass as class}
;</script>

<style>
div {
    padding: 16px;
}
div.actions {
    padding: 8px;
}
</style>

{#if layout === null}
    <div class:actions>
        <slot />
    </div>
{:else}
    <svelte:component this={layout} {style} {klass}>
        <slot />
    </svelte:component>
{/if}
