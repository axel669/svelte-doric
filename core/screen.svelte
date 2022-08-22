<script context="module">
    const closeContext = Symbol("Close Context")
    const levelContext = Symbol("Level Context")
</script>

<script>
    import { getContext, setContext } from "svelte"
    import { writable } from "svelte/store"

    import { fly } from "svelte/transition"

    export let full = false
    export let fullTitle = false
    export let fullContent = false
    export let fullFooter = false
    export let width = "min(720px, 100%)"

    const level = getContext(levelContext) ?? 0
    const finish = getContext(closeContext) ?? writable(null)

    let stackComp = null
    const duration = 350
    const finishFunc = writable(null)

    setContext(levelContext, level + 1)
    setContext(closeContext, finishFunc)

    let stackProps = {}
    export const openStack = (component, props = {}) => new Promise(
        (resolve) => {
            $finishFunc = (value) => {
                closeStack()
                resolve(value)
            }
            stackComp = component
            stackProps = props
        }
    )
    export const closeStack = () => {
        stackComp = null
        stackProps = {}
    }
    export const close = (value) => {
        if ($finish === null) {
            return
        }

        $finish(value)
    }
</script>

<style>
    doric-screen {
        display: grid;
        width: 100%;
        height: calc(100% - 1px);
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
        padding-bottom: 0px;
    }

    .full-title, .full {
        --title-row: "title title title";
    }
    .full-content, .full {
        --content-row: "content content content";
    }
    .full-footer, .full {
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
class:full-title={fullTitle}
class:full-content={fullContent}
class:full-footer={fullFooter}
style="--screen-width: {width}; --stack: {level};"
>
    {#if $$slots.title}
        <title-area transition:fly={{ y: window.innerHeight, duration }}>
            <slot name="title" />
        </title-area>
    {/if}
    <content-area transition:fly={{ y: window.innerHeight, duration }}>
        <slot />
    </content-area>
    {#if $$slots.footer}
        <footer-area transition:fly={{ y: window.innerHeight, duration }}>
            <slot name="footer" />
        </footer-area>
    {/if}
</doric-screen>

<svelte:component this={stackComp} {...stackProps} />
