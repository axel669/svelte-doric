<script>
    //  the bestagon
    export let size = 100

    const hexCmd = (cmd, radius, start, inc, tick) => [
        cmd,
        Math.cos(start + inc * tick) * radius + 50,
        Math.sin(start + inc * tick) * radius + 50
    ].join(" ")
    const hexPath = radius => {
        const {PI} = Math
        const start = PI / 6
        const inc = PI / 3
        const shape = Array.from(
            {length: 6},
            (_0, i) => hexCmd("L", radius, start, inc, i)
        )

        return [
            hexCmd("M", radius, start, inc, 5),
            ...shape,
            "Z",
        ].join(" ")
    }
</script>

<style>
    @keyframes rotate {
        0% {
            transform: rotateY(0deg);
        }
        100% {
            transform: rotateY(360deg);
        }
    }
    path {
        stroke: var(--primary);

        animation-name: rotate;
        animation-iteration-count: infinite;
        animation-delay: 0s;
        animation-timing-function: linear;
        transform-origin: 50% 50%;
    }
    .outer {
        animation-duration: 3s;
    }
    .middle {
        stroke: var(--primary-light);
        animation-duration: 2s;
        animation-direction: reverse;
    }
    .inner {
        animation-duration: 1s;
    }
</style>

<svg width={size} height={size} viewbox="0 0 100 100">
    <path
        class="outer"
        stroke-width={4}
        fill="none"
        d={hexPath(48)}
    />
    <path
        class="middle"
        stroke-width={4}
        fill="none"
        d={hexPath(36)}
    />
    <path
        class="inner"
        stroke-width={4}
        fill="none"
        d={hexPath(24)}
    />
</svg>
