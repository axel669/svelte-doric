<script>
    import css from "../util/css.js"

    const theme = css`
        body {
            --font: Orbitron;
            --background: #030303;
            --background-layer: #04080C;
            --layer-border-width: 1px;
            --layer-border-color: #00EEEE;
            --title-bar-background: #00EEEE;

            --ripple-dark: #00000060;
            --ripple-light: #FFFFFF60;
            --text-light: white;
            --text-dark: black;

            --primary: #00aaff;
            --primary-light: #79c0f7;
            --primary-ripple: #00aaff60;
            --secondary: #2fbc2f;
            --secondary-ripple: #2fbc2f60;
            --danger: #df5348;
            --danger-ripple: #df534860;
            --button-filled-text-color: var(--text-normal);

            --text-normal: var(--text-light);
            --text-secondary: #a0a0a0;
            --text-invert: var(--text-dark);

            --text-size: 14px;
            --text-size-title: 18px;
            --text-size-header: 16px;
            --text-size-info: 13px;
            --text-size-subtitle: 12px;

            --ripple-normal: var(--ripple-light);
            --ripple-invert: var(--ripple-dark);
            --shadow-color: rgb(255, 255, 255, 0.25);
        }
    `
</script>

{@html theme}
