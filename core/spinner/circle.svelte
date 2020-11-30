<script>
    export let size = 100

    const dash = (radius, count) => {
        const circ = Math.PI * 2 * radius
        const parts = count * 2
        const partSize = circ / parts
        return [
            0,
            partSize / 2,
            ...Array.from({length: parts}, () => partSize)
        ].join(" ")
    }
</script>

<style>
    @keyframes rotate {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
    circle {
        stroke: var(--primary);

        animation-name: rotate;
        animation-iteration-count: infinite;
        animation-delay: 0s;
        animation-timing-function: linear;
        transform-origin: 50% 50%;
    }
    .outer {
        animation-duration: 4s;
    }
    .middle {
        stroke: var(--primary-light);

        animation-duration: 3s;
        animation-direction: reverse;
    }
    .inner {
        animation-duration: 2s;
    }
</style>

<svg width={size} height={size} viewbox="0 0 100 100">
    <circle
        class="outer"
        cx={50} cy={50}
        stroke-width={4}
        fill="transparent"
        r={48}
        stroke-dasharray={dash(48, 2)}
    />
    <circle
        class="middle"
        cx={50} cy={50}
        stroke-width={4}
        fill="transparent"
        r={40}
        stroke-dasharray={dash(40, 2)}
    />
    <circle
        class="inner"
        cx={50} cy={50}
        stroke-width={4}
        fill="transparent"
        r={32}
        stroke-dasharray={dash(32, 4)}
    />
</svg>
