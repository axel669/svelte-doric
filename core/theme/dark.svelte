<script context="module">
    const blue = {
        normal: "#00aaff",
        ripple: "#00aaff60"
    }
;</script>

<script>
    import {css} from "../style/css.js"

    export let primary = blue

    ;$: theme = css`
        body {
            --font: Inconsolata;
            --background: #161616;
            --ripple-dark: #00000060;
            --ripple-light: #FFFFFF60;
            --text-light: white;
            --text-dark: black;
            --primary: #00aaff;
            --primary-light: #79c0f7;
            --secondary: #2fbc2f;
            --danger: #df5348;

            --text-normal: var(--text-light);
            --text-secondary: #a0a0a0;
            --text-invert: var(--text-dark);

            --text-size: 14px;
            --text-size-title: 18px;
            --text-size-header: 16px;
            --text-size-secondary: 12px;

            --ripple-normal: var(--ripple-light);
            --ripple-invert: var(--ripple-dark);

            --app-bar-background: var(--primary);
            --app-bar-text: var(--text-dark);

            --button-default-fill: #aaaaaa;
            --button-default-text: var(--text-dark);
            --button-primary: ${primary.normal};
            --button-primary-text: var(--text-dark);
            --button-primary-ripple: ${primary.ripple};
            --button-secondary: var(--secondary);
            --button-secondary-text: var(--text-dark);
            --button-secondary-ripple: #2fbc2f60;
            --button-danger: var(--danger);
            --button-danger-text: var(--text-dark);
            --button-danger-ripple: #df534860;
            --button-filled-ripple: var(--ripple-dark);

            --card-background: #333333;
            --card-border: 1px solid white;

            --control-background: #252525;
        }
    `
;</script>

{@html theme}
