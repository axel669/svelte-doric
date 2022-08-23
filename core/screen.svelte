<script context="module">
    const closeContext = Symbol("Close Context")
    const levelContext = Symbol("Level Context")
    const widthContext = Symbol("Width Context")
</script>

<script>
    import { getContext, setContext } from "svelte"
    import { writable } from "svelte/store"

    import { fly } from "svelte/transition"

    import vars from "./util/vars.js"

    export let full = false
    export let fullTitle = false
    export let fullContent = false
    export let fullFooter = false
    export let width = "min(720px, 100%)"

    const level = getContext(levelContext) ?? 0
    const finish = getContext(closeContext) ?? writable(null)
    const parentWidth = getContext(widthContext) ?? "100%"

    let stackComp = null
    const duration = 350
    const finishFunc = writable(null)

    setContext(levelContext, level + 1)
    setContext(closeContext, finishFunc)
    setContext(widthContext, width)

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

    $: screenVars = {
        "parent-width": parentWidth,
        "screen-width": width,
        "stack": level,
    }
</script>

<style>
    doric-screen {
        display: grid;
        width: calc(100% - var(--sub-pixel-offset));
        height: calc(100% - 1px);
        overflow: hidden;
        position: absolute;
        background-color: rgba(0, 0, 0, 0.5);

        grid-template-columns:
            auto
            min(
                calc(
                    var(--parent-width) - calc(16px * var(--stack))
                ),
                var(--screen-width)
            )
            auto
        ;
        grid-template-rows: min-content auto min-content;
        grid-template-areas:
            var(--title-row, ". title .")
            var(--content-row, ". content .")
            var(--footer-row, ". footer .")
        ;
        padding-top: calc(8px * var(--stack));
        padding-bottom: 0px;
    }
    doric-screen.main {
        background-color: transparent;
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
class:main={level === 0}
use:vars={screenVars}
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
