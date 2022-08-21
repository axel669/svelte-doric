<script>
    import { setContext, getContext } from "svelte"
    import { Flex } from "@layout"

    export let full = false
    export let title = "narrow"
    export let content = "narrow"
    export let footer = "narrow"
    export let width = "min(720px, 100%)"

    export let stack = false
    export let stackNum = 0
</script>

<style>
    doric-screen {
        display: grid;
        width: 100%;
        height: 100%;
        overflow: hidden;
        position: absolute;
        background-color: rgba(0, 0, 0, 0.2);

        grid-template-columns: auto var(--screen-width) auto;
        grid-template-rows: min-content auto min-content;
        grid-template-areas:
            var(--title-row, ". title .")
            var(--content-row, ". content .")
            var(--footer-row, ". footer .")
        ;
        padding: calc(8px * var(--stack));
    }

    .t-full, .full {
        --title-row: "title title title";
    }
    .c-full, .full {
        --content-row: "content content content";
    }
    .f-full, .full {
        --footer-row: "footer footer footer";
    }

    title-area {
        display: grid;
        grid-area: title;
    }
    footer-area {
        display: grid;
        grid-area: footer;
    }
    content-area {
        display: grid;
        grid-area: content;
        height: 100%;
        overflow: hidden;
    }
</style>

<doric-screen
class:full
class="t-{title} c-{content} f-{footer}"
style="--screen-width: {width}; --stack: {stackNum};"
>
    {#if $$slots.title}
        <title-area>
            <slot name="title" />
        </title-area>
    {/if}
    <content-area>
        <slot />
    </content-area>
    {#if $$slots.footer}
        <footer-area>
            <slot name="footer" />
        </footer-area>
    {/if}
</doric-screen>

{#if stack === true}
    <slot name="stack" stackNum={stackNum + 1} />
{/if}
