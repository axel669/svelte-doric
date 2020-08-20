<script>
    import {css} from "../style/css.js"

    const theme = css`
        body {
            --font: Roboto;
            --background: #e9e9e9;
            --background-layer: #ffffff;
            --layer-border-width: 0px;

            --ripple-dark: #00000060;
            --ripple-light: #FFFFFF60;
            --text-light: white;
            --text-dark: black;

            --primary: #1d62d5;
            --primary-ripple: #1d62d560;
            --secondary: #128f12;
            --secondary-ripple: #128f1260;
            --danger: #F44336;
            --danger-ripple: #F4433660;

            --text-normal: var(--text-dark);
            --text-secondary: #505050;
            --text-invert: var(--text-light);

            --text-size: 14px;
            --text-size-title: 18px;
            --text-size-header: 16px;
            --text-size-secondary: 12px;

            --ripple-normal: var(--ripple-dark);
            --ripple-invert: var(--ripple-light);
        }
    `
;</script>

{@html theme}
