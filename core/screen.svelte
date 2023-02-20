<script context="module">
    import { writable } from "svelte/store"

    const resolveContext = Symbol("Close Context")
    const levelContext = Symbol("Level Context")
    const widthContext = Symbol("Width Context")

    let topResolver = null
</script>

<script>
    import { getContext, setContext } from "svelte"

    import { fly } from "svelte/transition"

    import vars from "./util/vars.js"

    export let full = false
    export let fullContent = false
    export let fullFooter = false
    export let fullTitle = false
    export let width = "min(720px, 100%)"

    const level = getContext(levelContext) ?? 0
    const parentResolve = getContext(resolveContext) ?? writable(null)
    const parentWidth = getContext(widthContext) ?? "100%"

    let stackComp = null
    let stackProps = {}
    const duration = 350
    const resolver = writable(null)

    setContext(levelContext, level + 1)
    setContext(resolveContext, resolver)
    setContext(widthContext, width)

    const id = Math.random().toString()

    export const openStack = (component, props = {}) => new Promise(
        (resolve) => {
            $resolver = (value) => {
                stackComp = null
                stackProps = null
                resolve(value)
            }
            stackComp = component
            stackProps = props

            if (level !== 0) {
                return
            }
            topResolver = $resolver
        }
    )
    export const closeAll = (value = null) => topResolver(value)
    export const close = (value) => {
        if ($parentResolve === null) {
            return
        }

        $parentResolve(value)
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
