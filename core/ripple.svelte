<script context="module">
    const calcOffset = touch => {
        const {target, clientX, clientY} = touch
        const rect = target.getBoundingClientRect()
        const x = clientX - rect.left
        const y = clientY - rect.top

        return {x, y}
    }

    const log = value => {
        console.log(value)
        return value
    }
    const customAnimation = (node, options) => {
        return {
            delay: 0,
            duration: 500,
            css: (t, u) => (`
                transform: translate3d(-50%, -50%, 0) scale(${1 - u ** 1.3});
                opacity: ${u ** 1.3};
            `)
        }
    }
;</script>

<script>
    import {scale, fade} from "svelte/transition"
    import {linear as easing} from "svelte/easing"

    import {vars} from "./style/css.js"

    export let color = null
    export let disabled = false

    const duration = 500
    const animationInfo = {
        duration,
        easing,
    }
    let ripples = []
    let height = 0
    let width = 0
    let top = 0
    let left = 0

    ;$: size = Math.max(width, height) * 2

    const addRipple = evt => {
        if (disabled === true) {
            return
        }
        for (const touch of evt.changedTouches) {
            const {x, y} = calcOffset(touch)

            const ripple = {
                id: Date.now(),
                x, y, size
            }

            ripples = [
                ...ripples,
                ripple
            ]
            setTimeout(
                () => ripples = ripples.filter(
                    r => r !== ripple
                ),
                duration
            )
        }
    }
    const rippleVars = (info, color) => ({
        "x": [info.x, "px"],
        "y": [info.y, "px"],
        "size": [info.size, "px"],
        "ripple-color": color
    })
;</script>

<style>
    ripple-wrapper {
        position: absolute;
        top: 0px;
        left: 0px;
        right: 0px;
        bottom: 0px;
        overflow: hidden;
    }
    ripple {
        width: var(--size);
        height: var(--size);
        border-radius: 50%;
        background-color: var(--ripple-color, var(--ripple-normal));
        position: absolute;
        left: var(--x);
        top: var(--y);
        transform: translate3d(-50%, -50%, 0);
        pointer-events: none;
        box-shadow: 0px 0px 2px rgba(0, 0, 0, 0.25);
    }
</style>

<ripple-wrapper
    on:pointer-start={addRipple}
    bind:offsetHeight={height}
    bind:offsetWidth={width}
>
    {#each ripples as info (info.id)}
        <ripple
            in:customAnimation
            use:vars={rippleVars(info, color)}
        />
    {/each}
</ripple-wrapper>
