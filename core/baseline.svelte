<svelte:head>
    <link
        href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700"
        rel="stylesheet"
        type="text/css"
    />
    <link
        href="https://fonts.googleapis.com/css?family=Orbitron:300,400,500,700"
        rel="stylesheet"
        type="text/css"
    />
    <link
        rel="stylesheet"
        href="https://ka-f.fontawesome.com/releases/v6.0.0/css/free.min.css?token=0011e611c6"
    >
</svelte:head>

<script>
    import css from "./util/css.js"

    const lastDigit = Math.ceil(screen.width * devicePixelRatio * 10) % 10

    const roundDown = lastDigit >= 5
    const subPixelFix = css`
        body {
            --sub-pixel-offset: ${roundDown ? 1 : 0}px;
        }
    `
</script>

<style>
    :global(*) {
        box-sizing: border-box;
    }
    :global(html) {
        margin: 0px;
        padding: 0px;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }
    :global(body) {
        position: fixed;
        margin: 0px;
        padding: 0px;
        width: 100%;
        height: 100%;
        overflow: hidden;

        -webkit-tap-highlight-color: transparent;

        font-family: var(--font);
        background-color: var(--background);
        color: var(--text-normal);
        font-size: var(--text-size);

        --button-default-fill: #aaaaaa;
        --button-default-text: var(--text-dark);
        --button-primary: var(--primary);
        --button-primary-text: var(--text-dark);
        --button-primary-ripple: var(--primary-ripple);
        --button-secondary: var(--secondary);
        --button-secondary-text: var(--text-dark);
        --button-secondary-ripple: var(--secondary-ripple);
        --button-danger: var(--danger);
        --button-danger-text: var(--text-dark);
        --button-danger-ripple: var(--danger-ripple);
        --button-filled-ripple: var(--ripple-invert);

        --card-background: var(--background-layer);
        --card-border: var(--layer-border-width) solid var(--layer-border-color);

        --control-border: var(--text-secondary);
        --control-border-focus: var(--primary);
        --control-border-error: var(--danger);

        --title-bar-background: var(--primary);
        --title-bar-text: var(--text-invert);
    }
</style>

{@html subPixelFix}
